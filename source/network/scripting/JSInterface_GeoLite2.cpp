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
	JSContext* cx = pCxPrivate->pScriptInterface->GetContext();
	JSAutoRequest rq(cx);

	if (!g_GeoLite2)
		return JS::UndefinedValue();

	std::map<std::string, GeoLite2Data> data;
	{
		u32 ipAddressNum;
		if (IPTools::ParseIPv4Address(ipAddress, ipAddressNum))
			data = g_GeoLite2->GetIPv4Data(ipAddressNum);

		// TODO: Support IPv6
	}

	if (data.empty())
		return JS::UndefinedValue();

	// The UTF8 conversion is done here (late), because
	// the cache can be hundreds of MB and we want to use 8bit characters to save space
	// TODO: But the cache can still be pre-converted to UTF8
	JS::RootedValue returnValue(cx, JS::ObjectValue(*JS_NewPlainObject(cx)));

	for (const std::pair<std::string, GeoLite2Data>& dataSet : data)
	{
		JS::RootedObject dataSetUTF8(cx, JS_NewArrayObject(cx, 0));

		for (std::size_t i = 0; i < dataSet.second.size(); ++i)
		{
			JS::RootedValue valueJS(cx);
			ScriptInterface::ToJSVal<std::wstring>(cx, &valueJS, wstring_from_utf8(dataSet.second[i]));
			JS_SetElement(cx, dataSetUTF8, i, valueJS);
		}
		JS::RootedValue dataSetJS(cx, JS::ObjectValue(*dataSetUTF8));
		pCxPrivate->pScriptInterface->SetProperty(returnValue, dataSet.first.c_str(), dataSetJS);
	}

	return returnValue;
}

void JSI_GeoLite2::RegisterScriptFunctions(const ScriptInterface& scriptInterface)
{
	scriptInterface.RegisterFunction<JS::Value, std::string, &GetGeoLite2>("GetGeoLite2");
}
