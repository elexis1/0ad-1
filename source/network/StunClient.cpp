//  SuperTuxKart - a fun racing game with go-kart
//  Copyright (C) 2013-2016 SuperTuxKart-Team
//
//  This program is free software; you can redistribute it and/or
//  modify it under the terms of the GNU General Public License
//  as published by the Free Software Foundation; either version 2
//  of the License, or (at your option) any later version.
//
//  This program is distributed in the hope that it will be useful,
//  but WITHOUT ANY WARRANTY; without even the implied warranty of
//  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//  GNU General Public License for more details.
//
//  You should have received a copy of the GNU General Public License
//  along with this program; if not, write to the Free Software
//  Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
#include "precompiled.h"

#include "StunClient.h"

#include <chrono>
#include <cstdio>
#include <thread>

#include <stdlib.h>
#include <string.h>

#include <sys/types.h>
#ifdef WIN32
#  include <winsock2.h>
#  include <ws2tcpip.h>
#else
#  include <sys/socket.h>
#  include <netdb.h>
#endif

#include <vector>

#include "lib/external_libraries/enet.h"
#include "scriptinterface/ScriptInterface.h"
#include "ps/CLogger.h"
#include "ps/ConfigDB.h"

unsigned int m_StunServerIP;
int m_StunServerPort;

/**
 * These constants are defined in Section 6 of RFC 5389.
 */
const u32 m_MagicCookie = 0x2112A442;
const u32 m_MethodTypeBinding = 0x0001;
const u32 m_BindingSuccessResponse = 0x0101;

/**
 * These constants are defined in Section 15.1 of RFC 5389.
 */
const u8 m_IPAddressFamilyIPv4 = 0x01;

/**
 * These constants are defined in Section 18.2 of RFC 5389.
 */
const u16 m_AttrTypeMappedAddress = 0x001;

/**
 * Described in section 3 of RFC 5389.
 */
u8 m_TransactionID[12];

/**
 * Discovered STUN endpoint
 */
u32 m_IP;
u16 m_Port;

void AddUInt16(std::vector<u8>& buffer, const u16 value)
{
	buffer.push_back((value >> 8) & 0xff);
	buffer.push_back(value & 0xff);
}

void AddUInt32(std::vector<u8>& buffer, const u32& value)
{
	buffer.push_back((value >> 24) & 0xff);
	buffer.push_back((value >> 16) & 0xff);
	buffer.push_back((value >>  8) & 0xff);
	buffer.push_back( value        & 0xff);
}

template<typename T, size_t n>
T GetFromBuffer(std::vector<u8> buffer, int& offset)
{
	int a = n;
	T result = 0;
	offset += n;
	while (a--)
	{
		result <<= 8;
		result += buffer[offset - 1 - a];
	}
	return result;
}

/**
 * Creates a STUN request and sends it to a STUN server.
 * See https://tools.ietf.org/html/rfc5389#section-6
 * for details on the message structure.
 * The request is sent through m_transaction_host, from which the answer
 * will be retrieved by ParseStunResponse()
 */
void CreateStunRequest(ENetHost* transactionHost)
{
	std::string server_name;
	CFG_GET_VAL("stun.server", server_name);
	CFG_GET_VAL("stun.port", m_StunServerPort);

	debug_printf("GetPublicAddress: Using STUN server %s:%d\n", server_name.c_str(), m_StunServerPort);

	addrinfo hints;
	addrinfo* res;

	memset(&hints, 0, sizeof(hints));
	hints.ai_family = AF_UNSPEC; // AF_INET or AF_INET6 to force version
	hints.ai_socktype = SOCK_STREAM;

	// Resolve the stun server name so we can send it a STUN request
	int status = getaddrinfo(server_name.c_str(), nullptr, &hints, &res);
	if (status != 0)
	{
		LOGERROR("GetPublicAddress: Error in getaddrinfo: %s", gai_strerror(status));
		return;
	}

	// documentation says it points to "one or more addrinfo structures"
	ENSURE(res);
	sockaddr_in* current_interface = (sockaddr_in*)(res->ai_addr);
	m_StunServerIP = ntohl(current_interface->sin_addr.s_addr);

	if (!transactionHost)
	{
		LOGERROR("Failed to create enet host");
		return;
	}

	StunClient::SendStunRequest(transactionHost, m_StunServerIP, m_StunServerPort);

	freeaddrinfo(res);
}

void StunClient::SendStunRequest(ENetHost* transactionHost, u32 targetIp, u16 targetPort)
{
	std::vector<u8> buffer;

	AddUInt16(buffer, m_MethodTypeBinding);
	AddUInt16(buffer, 0); // length
	AddUInt32(buffer, m_MagicCookie);

	for (std::size_t i = 0; i < sizeof(m_TransactionID); ++i)
	{
		u8 random_byte = rand() % 256;
		buffer.push_back(random_byte);
		m_TransactionID[i] = random_byte;
	}
	//buffer.push_back(0); -- this breaks STUN message

	// sendRawPacket
	sockaddr_in to;
	int to_len = sizeof(to);
	memset(&to, 0, to_len);

	to.sin_family = AF_INET;
	to.sin_port = htons(targetPort);
	to.sin_addr.s_addr = htonl(targetIp);

	sendto(transactionHost->socket, (char*)(buffer.data()), (int)buffer.size(), 0, (sockaddr*)&to, to_len);
}

/**
 * Gets the response from the STUN server, checks it for its validity and
 * then parses the answer into address and port
 * \return "" if the address could be parsed or an error message
*/
bool ParseStunResponse(ENetHost* transactionHost)
{
	// TransportAddress sender;
	const int LEN = 2048;
	char input_buffer[LEN];

	int max_tries = 2000;
	memset(input_buffer, 0, LEN);

	sockaddr_in addr;
	socklen_t from_len = sizeof(addr);

	int len = recvfrom(transactionHost->socket, input_buffer, LEN, 0, (sockaddr*)(&addr), &from_len);

	// Wait to receive the message because enet sockets are non-blocking
	int count = 0;
	while (len < 0 && (count < max_tries || max_tries == -1))
	{
		++count;
		std::this_thread::sleep_for(std::chrono::milliseconds(1000));
		len = recvfrom(transactionHost->socket, input_buffer, LEN, 0, (sockaddr*)(&addr), &from_len);
	}

	if (len < 0)
	{
		LOGERROR("GetPublicAddress: recvfrom error: %d", errno);
		return false;
	}

	u32 sender_ip = ntohl((u32)(addr.sin_addr.s_addr));
	u16 sender_port = ntohs(addr.sin_port);

	if (sender_ip != m_StunServerIP)
		LOGERROR("GetPublicAddress: Received stun response from different address: %d:%d (%d.%d.%d.%d:%d) %s",
			addr.sin_addr.s_addr,
			addr.sin_port,
			(sender_ip >> 24) & 0xff,
			(sender_ip >> 16) & 0xff,
			(sender_ip >>  8) & 0xff,
			(sender_ip >>  0) & 0xff,
			sender_port,
			input_buffer);

	if (len < 0)
	{
		LOGERROR("STUN response contains no data");
		return false;
	}

	// Convert to network string.
	std::vector<u8> buffer;
	int offset = 0;

	buffer.resize(len);
	memcpy(buffer.data(), (u8*)input_buffer, len);

	if (GetFromBuffer<u16, 2>(buffer, offset) != m_BindingSuccessResponse)
	{
		LOGERROR("STUN response isn't a binding success response");
		return false;
	}

	// Ignore message size
	offset += 2;

	if (GetFromBuffer<u32, 4>(buffer, offset) != m_MagicCookie)
	{
		LOGERROR("STUN response doesn't contain the magic cookie");
		return false;
	}

	for (std::size_t i = 0; i < sizeof(m_TransactionID); ++i)
		if (buffer[offset++] != m_TransactionID[i])
		{
			LOGERROR("STUN response doesn't contain the transaction ID");
			return false;
		}

	while (offset < (int)buffer.size())
	{
		int type = GetFromBuffer<u16, 2>(buffer, offset);
		int size = GetFromBuffer<u16, 2>(buffer, offset);

		switch (type)
		{
		case m_AttrTypeMappedAddress:
		{
			if (size != 8)
			{
				LOGERROR("Invalid STUN Mapped Address length");
				return false;
			}

			// Ignore the first byte as mentioned in Section 15.1 of RFC 5389.
			++offset;

			if (buffer[offset++] != m_IPAddressFamilyIPv4)
			{
				LOGERROR("Unsupported address family, IPv4 is expected");
				return false;
			}

			m_Port = GetFromBuffer<u16, 2>(buffer, offset);
			m_IP = GetFromBuffer<u32, 4>(buffer, offset);

			LOGMESSAGERENDER("GetPublicAddress: The public address has been found");
			break;
		}
		default:
		{
			// We don't care about other attributes at all

			// Skip attribute
			offset += size;

			// Skip padding
			int padding = size % 4;
			if (padding)
				offset += 4 - padding;
			break;
		}
		}
	}

	return true;
}

JS::Value StunClient::FindStunEndpoint(ScriptInterface& scriptInterface, int port)
{
	ENetAddress hostAddr;
	hostAddr.host = ENET_HOST_ANY;
	hostAddr.port = port;

	ENetHost* transactionHost = enet_host_create(&hostAddr, 1, 1, 0, 0);

	CreateStunRequest(transactionHost);
	ParseStunResponse(transactionHost);
	enet_host_destroy(transactionHost);

	// Convert m_IP to string
	char ipStr[256] = "(error)";
	ENetAddress addr;
	addr.host = ntohl(m_IP);
	enet_address_get_host_ip(&addr, ipStr, ARRAY_SIZE(ipStr));

	JSContext* cx = scriptInterface.GetContext();
	JSAutoRequest rq(cx);

	JS::RootedValue stunEndpoint(cx);
	scriptInterface.Eval("({})", &stunEndpoint);
	scriptInterface.SetProperty(stunEndpoint, "ip", std::string(ipStr));
	scriptInterface.SetProperty(stunEndpoint, "port", m_Port);
	return stunEndpoint;
}

StunClient::StunEndpoint StunClient::FindStunEndpoint(ENetHost* transactionHost)
{
	CreateStunRequest(transactionHost);
	ParseStunResponse(transactionHost);

	// Convert m_IP to string
	char ipStr[256] = "(error)";
	ENetAddress addr;
	addr.host = ntohl(m_IP);
	enet_address_get_host_ip(&addr, ipStr, ARRAY_SIZE(ipStr));

	StunEndpoint stunEndpoint;
	stunEndpoint.ip = m_IP;
	stunEndpoint.port = m_Port;
	return stunEndpoint;
}

void StunClient::SendHolePunchingMessages(ENetHost* enetClient, const char* serverAddress, u16 serverPort)
{
	// Convert ip string to int64
	ENetAddress addr;
	addr.port = serverPort;
	enet_address_set_host(&addr, serverAddress);

	// Send an UDP message from enet host to ip:port
	debug_printf("Sending STUN request to %s:%d\n", serverAddress, serverPort);
	for (int i = 0; i < 3; ++i)
	{
		StunClient::SendStunRequest(enetClient, htonl(addr.host), serverPort);
		std::this_thread::sleep_for(std::chrono::milliseconds(1000));
	}
}
