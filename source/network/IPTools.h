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

#ifndef IPTOOLS_H
#define IPTOOLS_H

#include <string>

namespace IPTools
{
	bool ParseIPv4Address(const std::string& ipAddress, u32& ipAddressNum);
	bool ParseSubnet(const std::string& subnetString, u32& subnetAddress, int& subnetMaskBits);

	bool IsIpV4PartOfSubnet(u32 ipAddress, u32 subnetAddress, int subnetMaskBits);
}

#endif // IPTOOLS_H
