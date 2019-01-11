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
#include "network/IPTools.h"

#include <string>
#include <vector>

// Notice that the GeoLite2 files could be used entirely without the JSInterface GeoLite2 namespace; by using JSI_VFS::ReadFileLines.
// However the below functions are introduced to provide (1) caching of the 10mb database and (2) using inet.h instead of reinventing these methods in JS.

JS::Value JSI_GeoLite2::GetGeoLite2(ScriptInterface::CxPrivate* pCxPrivate, const std::string& ipAddress)
{
	if (!g_GeoLite2)
		return JS::UndefinedValue();

	{
		u32 ipAddressNum;
		if (IPTools::ParseIPv4Address(ipAddress, ipAddressNum))
			return g_GeoLite2->GetIPv4Data(*(pCxPrivate->pScriptInterface), ipAddressNum);
	}

	// TODO: Support IPv6

	return JS::UndefinedValue();
}

void JSI_GeoLite2::RegisterScriptFunctions(const ScriptInterface& scriptInterface)
{
	scriptInterface.RegisterFunction<JS::Value, std::string, &GetGeoLite2>("GetGeoLite2");
}
