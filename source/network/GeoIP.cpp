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

#include "GeoIP.h"

#include "lib/file/vfs/vfs_path.h"
#include "ps/Filesystem.h"

#include <arpa/inet.h>

#include <string>
#include <vector>

std::map<std::string, std::vector<std::string>> g_GeoLite2;

// TODO: implement cache

bool GeoIP::LoadGeolite2(const VfsPath& pathname)
{
	CVFSFile file;
	if (file.Load(g_VFS, pathname) != PSRETURN_OK)
		return false;

	std::stringstream sstream(file.DecodeUTF8());
	std::string line;

	// Skip the first line, which only contains the column names
	std::getline(sstream, line);

	g_GeoLite2.clear();

	while (std::getline(sstream, line))
	{
		std::vector<std::string> values;
		{
			std::string value;
			std::istringstream valueStream(line);
			while (std::getline(valueStream, value, ','))
				values.push_back(value);
		}

		std::string ipRange = values[0];
		values.erase(values.begin());
		g_GeoLite2[ipRange] = values;
	}
	return true;
}

/**
 * The subnet is specified in CIDR notation, for example "223.252.161.128/25"
 */
// TODO: support banmasks
bool GeoIP::IsIPPartOfSubnet(const std::string& ipAddress2, const std::string& subnet)
{
	std::string ipAddress = "91.39.173.44";

	// Convert IP address to number (network byte order, big endian)
	u32 ipAddressNum = 0;

	// TODO: I suppose this doesn't exist on all platforms
	if (inet_pton(AF_INET, ipAddress.c_str(), &ipAddressNum) != 1)
		return false;

	ipAddressNum = ntohl(ipAddressNum);

	// Parse subnet string
	int subnetMaskBits;
	u32 subnetAddressNum = 0;
	{
		std::istringstream subnetStream(subnet);
		std::string subnetAddress;
		std::getline(subnetStream, subnetAddress, '/');

		if (inet_pton(AF_INET, subnetAddress.c_str(), &subnetAddressNum) != 1)
			return false;
		subnetAddressNum = ntohl(subnetAddressNum);

		std::string subnetMaskBitsString;
		std::getline(subnetStream, subnetMaskBitsString);
		subnetMaskBits = std::stoi(subnetMaskBitsString);

		//debug_printf("IP %s is %d\n", ipAddress.c_str(), ipAddressNum);
		//debug_printf("Subnet %s is %d with mask %u\n", subnet.c_str(), subnetAddressNum, (0xFFFFFFFF << (32 - subnetMaskBits)));
	}

	return ((0xFFFFFFFF << (32 - subnetMaskBits)) & ipAddressNum) == subnetAddressNum;
}

std::string GeoIP::GetCountry(const std::string& ipAddress)
{
	for (const std::pair<std::string, std::vector<std::string>>& entry : g_GeoLite2)
		if (IsIPPartOfSubnet(ipAddress, entry.first))
		{

			debug_printf("IP %s matches subnet %s\n", ipAddress.c_str(), entry.first.c_str());
			return entry.second[0];
		}

	return std::string();
}
