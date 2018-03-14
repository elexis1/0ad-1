/* Copyright (C) 2018 Wildfire Games.
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

#include "ps/scripting/JSInterface_Mod.h"

#include "ps/Mod.h"
#include "ps/ModIo.h"

extern void restart_engine();

JS::Value JSI_Mod::GetEngineInfo(ScriptInterface::CxPrivate* pCxPrivate)
{
	return Mod::GetEngineInfo(*(pCxPrivate->pScriptInterface));
}

/**
 * Returns a JS object containing a listing of available mods that
 * have a modname.json file in their modname folder. The returned
 * object looks like { modname1: json1, modname2: json2, ... } where
 * jsonN is the content of the modnameN/modnameN.json file as a JS
 * object.
 *
 * @return JS object with available mods as the keys of the modname.json
 *         properties.
 */
JS::Value JSI_Mod::GetAvailableMods(ScriptInterface::CxPrivate* pCxPrivate)
{
	return Mod::GetAvailableMods(*(pCxPrivate->pScriptInterface));
}

void JSI_Mod::RestartEngine(ScriptInterface::CxPrivate* UNUSED(pCxPrivate))
{
	restart_engine();
}

void JSI_Mod::SetMods(ScriptInterface::CxPrivate* UNUSED(pCxPrivate), const std::vector<CStr>& mods)
{
	g_modsLoaded = mods;
}

JS::Value JSI_Mod::ModIoGetMods(ScriptInterface::CxPrivate* pCxPrivate)
{
	ScriptInterface* scriptInterface = pCxPrivate->pScriptInterface;
	JSContext* cx = scriptInterface->GetContext();
	JSAutoRequest rq(cx);

	if (!g_ModIo)
		g_ModIo = new ModIo();

	ENSURE(g_ModIo);

	const std::vector<ModIoModData>& availableMods = g_ModIo->GetMods(*scriptInterface);

	JS::RootedObject mods(cx, JS_NewArrayObject(cx, availableMods.size()));
	if (!mods)
		return JS::NullValue(); // TODO: error?

	u32 i = 0;
	for (const ModIoModData& mod : availableMods)
	{
		JS::RootedValue m(cx, JS::ObjectValue(*JS_NewPlainObject(cx)));
		for (const std::pair<std::string, std::string>& prop : mod.properties)
			scriptInterface->SetProperty(m, prop.first.c_str(), prop.second, true);

		scriptInterface->SetProperty(m, "dependencies", mod.dependencies, true);
		
		JS_SetElement(cx, mods, i++, m);
	}

	return JS::ObjectValue(*mods);
}

void JSI_Mod::ModIoDownloadMod(ScriptInterface::CxPrivate* UNUSED(pCxPrivate), uint32_t idx)
{
	if (!g_ModIo)
	{
		LOGERROR("ModIoDownloadMod called before ModIoGetMods");
		return;
	}

	g_ModIo->DownloadMod(idx);
}

void JSI_Mod::RegisterScriptFunctions(const ScriptInterface& scriptInterface)
{
	scriptInterface.RegisterFunction<JS::Value, &GetEngineInfo>("GetEngineInfo");
	scriptInterface.RegisterFunction<JS::Value, &JSI_Mod::GetAvailableMods>("GetAvailableMods");
	scriptInterface.RegisterFunction<void, &JSI_Mod::RestartEngine>("RestartEngine");
	scriptInterface.RegisterFunction<void, std::vector<CStr>, &JSI_Mod::SetMods>("SetMods");

	scriptInterface.RegisterFunction<JS::Value, &JSI_Mod::ModIoGetMods>("ModIoGetMods");
	scriptInterface.RegisterFunction<void, uint32_t, &JSI_Mod::ModIoDownloadMod>("ModIoDownloadMod");
}
