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

#include "JSInterface_GeoIP.h"

#include "network/GeoIP.h"
#include "network/NetServer.h"

#include <string>

bool JSI_GeoIP::LoadGeoIP(ScriptInterface::CxPrivate* UNUSED(pCxPrivate), const VfsPath& filepath)
{
	return GeoIP::LoadGeolite2(filepath);
}

std::string JSI_GeoIP::GeoIPLookup(ScriptInterface::CxPrivate* UNUSED(pCxPrivate), const std::string& ipAddress)
{
	return GeoIP::GetCountry(ipAddress);
}

void JSI_GeoIP::RegisterScriptFunctions(const ScriptInterface& scriptInterface)
{
	// TODO: Use Path <-> JS::Value for other JSInterfaces such as Replay
	scriptInterface.RegisterFunction<bool, VfsPath, &LoadGeoIP>("LoadGeoIP");
	scriptInterface.RegisterFunction<std::string, std::string, &GeoIPLookup>("GeoIPLookup");
}
