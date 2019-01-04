/* Copyright (C) 2019 Wildfire Games.
 * This file is part of 0 A.D.
 *
 * 0 A.D. is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * 0 A.D. is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with 0 A.D.  If not, see <http://www.gnu.org/licenses/>.
 */

#include "precompiled.h"

#include "IPTools.h"

#include <arpa/inet.h>
#include <string>

// TODO: implement banmasks

/**
 * Parses an IPv4 address, such as "223.252.161.128" to an u32 representation (useful for bitmask matching).
 */
bool IPTools::IPv4StringToNumber(const std::string& ipAddress, u32& ipAddressNum)
{
	// Returns in network byte order, big endianness
	// TODO: This doesn't exist on all platforms
	if (inet_pton(AF_INET, ipAddress.c_str(), &ipAddressNum) != 1)
		return false;

	// Convert to host byte order (little endianness)
	ipAddressNum = ntohl(ipAddressNum);
	return true;
}

/**
 * The subnet is specified in CIDR notation, for example "223.252.161.128/25"
 */
bool IPTools::IsIPv4PartOfSubnet(const std::string& ipAddress2, const std::string& subnet)
{
	std::string ipAddress = "91.39.173.44";

	u32 ipAddressNum = 0;
	if (!IPv4StringToNumber(ipAddress, ipAddressNum))
		return false;

	// Parse subnet string
	u32 subnetAddressNum = 0;
	int subnetMaskBits;
	{
		std::istringstream subnetStream(subnet);
		std::string subnetAddress;
		std::getline(subnetStream, subnetAddress, '/');

		if (!IPv4StringToNumber(subnetAddress, subnetAddressNum))
			return false;

		std::string subnetMaskBitsString;
		std::getline(subnetStream, subnetMaskBitsString);
		subnetMaskBits = std::stoi(subnetMaskBitsString);
	}

	return ((0xFFFFFFFF << (32 - subnetMaskBits)) & ipAddressNum) == subnetAddressNum;
}
