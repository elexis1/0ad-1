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
 * Parses an IPv4 address, such as "223.252.161.128" to an u32 representation in hostbyte order (useful for bitmask matching).
 */
bool IPTools::ParseIPv4Address(const std::string& ipAddress, u32& ipAddressNum)
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
 * Parses CIDR notation, for example "223.252.161.128/25".
 */
bool IPTools::ParseSubnet(const std::string& subnet, u32& subnetAddress, int& subnetMaskBits)
{
	std::istringstream subnetStream(subnet);
	std::string subnetAddressString;
	std::getline(subnetStream, subnetAddressString, '/');

	if (!ParseIPv4Address(subnetAddressString, subnetAddress))
		return false;

	std::string subnetMaskBitsString;
	std::getline(subnetStream, subnetMaskBitsString);
	subnetMaskBits = std::stoi(subnetMaskBitsString);

	return true;
}

/**
 * All values in hostbyte order (little endianness)
 */
bool IPTools::IsIpV4PartOfSubnet(u32 ipAddress, u32 subnetAddress, int subnetMaskBits)
{
	return ((0xFFFFFFFF << (32 - subnetMaskBits)) & ipAddress) == subnetAddress;
}
