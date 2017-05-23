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
static const int m_StunServerPort = 3478;
const uint32_t m_StunMagicCookie = 0x2112A442;
uint8_t m_StunTransactionID[12];

/**
 * Discovered STUN endpoint
 */
uint32_t m_IP;
uint16_t m_Port;

void AddUInt16(std::vector<uint8_t>& m_buffer, const uint16_t value)
{
	m_buffer.push_back((value >> 8) & 0xff);
	m_buffer.push_back(value & 0xff);
}

void AddUInt32(std::vector<uint8_t>& m_buffer, const uint32_t& value)
{
	m_buffer.push_back((value >> 24) & 0xff);
	m_buffer.push_back((value >> 16) & 0xff);
	m_buffer.push_back((value >>  8) & 0xff);
	m_buffer.push_back( value        & 0xff);
}

template<typename T, size_t n>
T GetFromBuffer(std::vector<uint8_t> m_buffer, int& m_current_offset)
{
	int a = n;
	T result = 0;
	m_current_offset += n;
	int offset = m_current_offset -1;
	while (a--)
	{
		result <<= 8;
		result += m_buffer[offset - a];
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
	LOGMESSAGERENDER("GetPublicAddress: Using STUN server %s", server_name.c_str());

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
	ENSURE(res != nullptr);
	sockaddr_in* current_interface = (sockaddr_in*)(res->ai_addr);
	m_StunServerIP = ntohl(current_interface->sin_addr.s_addr);

	if (transactionHost == nullptr)
	{
		LOGERROR("Failed to create enet host");
		return;
	}

	StunClient::SendStunRequest(transactionHost, m_StunServerIP, m_StunServerPort);

	freeaddrinfo(res);
}

void StunClient::SendStunRequest(ENetHost* transactionHost, uint32_t targetIp, uint16_t targetPort)
{
	// Assemble the message for the stun server
	std::vector<uint8_t> m_buffer;

	// bytes 0-1: the type of the message
	// bytes 2-3: message length added to header (attributes)
	uint16_t message_type = 0x0001; // binding request
	uint16_t message_length = 0x0000;
	AddUInt16(m_buffer, message_type);
	AddUInt16(m_buffer, message_length);
	AddUInt32(m_buffer, 0x2112A442);

	// bytes 8-19: the transaction id
	for (int i = 0; i < 12; i++)
	{
		uint8_t random_byte = rand() % 256;
		m_buffer.push_back(random_byte);
		m_StunTransactionID[i] = random_byte;
	}
	//m_buffer.push_back(0); -- this breaks STUN message

	// sendRawPacket
	sockaddr_in to;
	int to_len = sizeof(to);
	memset(&to, 0, to_len);

	to.sin_family = AF_INET;
	to.sin_port = htons(targetPort);
	to.sin_addr.s_addr = htonl(targetIp);

	debug_printf("GetPublicAddress: Sending STUN request to: %d.%d.%d.%d:%d",
		(targetIp >> 24) & 0xff,
		(targetIp >> 16) & 0xff,
		(targetIp >>  8) & 0xff,
		(targetIp >>  0) & 0xff,
		targetPort);

	int send_result = sendto(transactionHost->socket, (char*)(m_buffer.data()), (int)m_buffer.size(), 0, (sockaddr*)&to, to_len);
	debug_printf("GetPublicAddress: sendto result: %d", send_result);
}

/**
 * Gets the response from the STUN server, checks it for its validity and
 * then parses the answer into address and port
 * \return "" if the address could be parsed or an error message
*/
std::string ParseStunResponse(ENetHost* transactionHost)
{
	// TransportAddress sender;
	const int LEN = 2048;
	char buffer[LEN];

	// receiveRawPacket
	// int len = m_transaction_host->receiveRawPacket(buffer, LEN, &sender, 2000);
	int max_tries = 2000;

	memset(buffer, 0, LEN);

	sockaddr_in addr;
	socklen_t from_len = sizeof(addr);

	int err;
	int len = recvfrom(transactionHost->socket, buffer, LEN, 0, (sockaddr*)(&addr), &from_len);

	int count = 0;
	// wait to receive the message because enet sockets are non-blocking
	while (len < 0 && (count<max_tries || max_tries==-1))
	{
		++count;
		std::this_thread::sleep_for(std::chrono::milliseconds(1000));
		len = recvfrom(transactionHost->socket, buffer, LEN, 0, (sockaddr*)(&addr), &from_len);
	}

	if (len == -1)
		err = errno;
	LOGERROR("GetPublicAddress: recvfrom result: %d", len);

	if (len == -1)
		LOGERROR("GetPublicAddress: recvfrom error: %d", err);

	if (len < 0)
		return "No message received";

	uint32_t sender_ip = ntohl((uint32_t)(addr.sin_addr.s_addr));
	uint16_t sender_port = ntohs(addr.sin_port);

	if (sender_ip != m_StunServerIP)
		LOGMESSAGERENDER("GetPublicAddress: Received stun response from different address: %d:%d (%d.%d.%d.%d:%d) %s",
			addr.sin_addr.s_addr, addr.sin_port,
			(sender_ip >> 24) & 0xff,
			(sender_ip >> 16) & 0xff,
			(sender_ip >>  8) & 0xff,
			(sender_ip >>  0) & 0xff,
			sender_port, buffer);

	if (len < 0)
		return "STUN response contains no data at all";

	// Convert to network string.
	// NetworkString datas((uint8_t*)buffer, len);
	std::vector<uint8_t> m_buffer;
	int m_current_offset;

	m_buffer.resize(len);
	memcpy(m_buffer.data(), (uint8_t*)buffer, len);

	m_current_offset = 0;
	// m_current_offset = 5; // ignore type and token -- this breaks STUN response processing

	// check that the stun response is a response, contains the magic cookie
	// and the transaction ID
	if (GetFromBuffer<uint16_t, 2>(m_buffer, m_current_offset) != 0x0101)
		return "STUN response has incorrect type";

	int message_size = GetFromBuffer<uint16_t, 2>(m_buffer, m_current_offset);
	if (GetFromBuffer<uint32_t, 4>(m_buffer, m_current_offset) != m_StunMagicCookie)
		return "STUN response doesn't contain the magic cookie";

	for (int i = 0; i < 12; ++i)
		if (m_buffer[m_current_offset++] != m_StunTransactionID[i])
			return "STUN response doesn't contain the transaction ID";

	LOGERROR("GetPublicAddress: The STUN server responded with a valid answer");

	// The stun message is valid, so we parse it now:
	if (message_size == 0)
		return "STUN response does not contain any information.";

	if (message_size < 4)
		return "STUN response is too short.";

	// Those are the port and the address to be detected
	while (true)
	{
		int type = GetFromBuffer<uint16_t, 2>(m_buffer, m_current_offset);
		int size = GetFromBuffer<uint16_t, 2>(m_buffer, m_current_offset);
		if (type == 0 || type == 1)
		{
			ENSURE(size == 8);
			++m_current_offset;

			// Check address family
			char address_family = m_buffer[m_current_offset++];
			if (address_family != 0x01)
				return "Unsupported address family, IPv4 is expected";

			m_Port = GetFromBuffer<uint16_t, 2>(m_buffer, m_current_offset);
			m_IP = GetFromBuffer<uint32_t, 4>(m_buffer, m_current_offset);

			// finished parsing, we know our public transport address
			LOGMESSAGERENDER("GetPublicAddress: The public address has been found: %d.%d.%d.%d:%d",
				(m_IP >> 24) & 0xff,
				(m_IP >> 16) & 0xff,
				(m_IP >>  8) & 0xff,
				(m_IP >>  0) & 0xff,
				m_Port);
			break;
		}

		m_current_offset += 4 + size;
		ENSURE(m_current_offset >=0 && m_current_offset < (int)m_buffer.size());

		message_size -= 4 + size;

		if (message_size < 4)
			return "STUN response is invalid.";
	}

	return "";
}

JS::Value StunClient::FindStunEndpoint(ScriptInterface& scriptInterface, int port)
{
	ENetAddress hostAddr;
	hostAddr.host = ENET_HOST_ANY;
	hostAddr.port = port;

	ENetHost* transactionHost = enet_host_create(&hostAddr, 1, 1, 0, 0);

	CreateStunRequest(transactionHost);
	std::string parse_result = ParseStunResponse(transactionHost);
	enet_host_destroy(transactionHost);

	if (!parse_result.empty())
		LOGERROR("Parse error: %s", parse_result.c_str());

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
	std::string parse_result = ParseStunResponse(transactionHost);
	if (!parse_result.empty())
		LOGERROR("Parse error: %s", parse_result.c_str());

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

	// Send a UDP message from enet host to ip:port
	LOGMESSAGERENDER("Sending STUN request to %s:%d", serverAddress, serverPort);
	for (int i = 0; i < 3; ++i)
	{
		StunClient::SendStunRequest(enetClient, htonl(addr.host), serverPort);
		std::this_thread::sleep_for(std::chrono::milliseconds(1000));
	}
}
