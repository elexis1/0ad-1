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

#include "JSInterface_GeoLite2.h"

#include "network/GeoLite2.h"

#include <string>

// Notice that the GeoLite2 files could be used entirely without the JSInterface GeoLite2 namespace; by using JSI_VFS::ReadFileLines.
// However the below functions are introduced to provide (1) caching of the 10mb database and (2) using inet.h instead of reinventing these methods in JS.

bool JSI_GeoLite2::LoadCountryBlocksIPv4(ScriptInterface::CxPrivate* UNUSED(pCxPrivate), const VfsPath& filepath)
{
	return GeoLite2::LoadCountryBlocksIPv4(filepath);
}

bool JSI_GeoLite2::LoadCountryLocations(ScriptInterface::CxPrivate* UNUSED(pCxPrivate), const VfsPath& filepath)
{
	return GeoLite2::LoadCountryLocations(filepath);
}

std::string JSI_GeoLite2::GeoIPLookup(ScriptInterface::CxPrivate* UNUSED(pCxPrivate), const std::string& ipAddress)
{
	return GeoLite2::GetCountry(ipAddress);
}

void JSI_GeoLite2::RegisterScriptFunctions(const ScriptInterface& scriptInterface)
{
	// TODO: Use Path <-> JS::Value for other JSInterfaces such as Replay
	scriptInterface.RegisterFunction<bool, VfsPath, &LoadCountryBlocksIPv4>("GeoLite2_LoadCountryBlocksIPv4");
	scriptInterface.RegisterFunction<bool, VfsPath, &LoadCountryLocations>("GeoLite2_LoadCountryLocations");
	scriptInterface.RegisterFunction<std::string, std::string, &GeoIPLookup>("GeoLite2_LookupIPv4");
}
