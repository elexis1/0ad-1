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

#include "JSInterface_Mod.h"

#include "ps/CLogger.h"
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

void JSI_Mod::ModIoStartGetGameId(ScriptInterface::CxPrivate* UNUSED(pCxPrivate))
{
	if (!g_ModIo)
		g_ModIo = new ModIo();

	ENSURE(g_ModIo);

	g_ModIo->StartGetGameId();
}

void JSI_Mod::ModIoStartListMods(ScriptInterface::CxPrivate* UNUSED(pCxPrivate))
{
	if (!g_ModIo)
	{
		LOGERROR("ModIoStartListMods called before ModIoStartGetGameId");
		return;
	}

	g_ModIo->StartListMods();
}

void JSI_Mod::ModIoStartDownloadMod(ScriptInterface::CxPrivate* UNUSED(pCxPrivate), uint32_t idx)
{
	if (!g_ModIo)
	{
		LOGERROR("ModIoStartDownloadMod called before ModIoStartGetGameId");
		return;
	}

	g_ModIo->StartDownloadMod(idx);
}

bool JSI_Mod::ModIoAdvanceRequest(ScriptInterface::CxPrivate* pCxPrivate)
{
	if (!g_ModIo)
	{
		LOGERROR("ModIoAdvanceRequest called before ModIoGetMods");
		return false;
	}

	ScriptInterface* scriptInterface = pCxPrivate->pScriptInterface;
	return g_ModIo->AdvanceRequest(*scriptInterface);
}

void JSI_Mod::ModIoCancelRequest(ScriptInterface::CxPrivate* UNUSED(pCxPrivate))
{
	if (!g_ModIo)
	{
		LOGERROR("ModIoCancelRequest called before ModIoGetMods");
		return;
	}

	g_ModIo->CancelRequest();
}

JS::Value JSI_Mod::ModIoGetMods(ScriptInterface::CxPrivate* pCxPrivate)
{
	if (!g_ModIo)
	{
		LOGERROR("ModIoGetMods called before ModIoStartGetGameId");
		return JS::NullValue();
	}

	ScriptInterface* scriptInterface = pCxPrivate->pScriptInterface;
	JSContext* cx = scriptInterface->GetContext();
	JSAutoRequest rq(cx);

	const std::vector<ModIoModData>& availableMods = g_ModIo->GetMods();

	JS::RootedObject mods(cx, JS_NewArrayObject(cx, availableMods.size()));
	if (!mods)
		return JS::NullValue();

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

JS::Value JSI_Mod::ModIoGetDownloadProgress(ScriptInterface::CxPrivate* pCxPrivate)
{
	if (!g_ModIo)
	{
		LOGERROR("ModIoGetDownloadProgress called before ModIoGetMods");
		return JS::NullValue();
	}

	ScriptInterface* scriptInterface = pCxPrivate->pScriptInterface;
	JSContext* cx = scriptInterface->GetContext();
	JSAutoRequest rq(cx);

	const DownloadProgressData& downloadProgressData = g_ModIo->GetDownloadProgress();

	JS::RootedValue progressData(cx, JS::ObjectValue(*JS_NewPlainObject(cx)));
	scriptInterface->SetProperty(progressData, "error", downloadProgressData.error, true);
	scriptInterface->SetProperty(progressData, "progress", downloadProgressData.progress, true);
	scriptInterface->SetProperty(progressData, "status", downloadProgressData.StringStatus(), true);

	return progressData;
}


void JSI_Mod::RegisterScriptFunctions(const ScriptInterface& scriptInterface)
{
	scriptInterface.RegisterFunction<JS::Value, &GetEngineInfo>("GetEngineInfo");
	scriptInterface.RegisterFunction<JS::Value, &JSI_Mod::GetAvailableMods>("GetAvailableMods");
	scriptInterface.RegisterFunction<void, &JSI_Mod::RestartEngine>("RestartEngine");
	scriptInterface.RegisterFunction<void, std::vector<CStr>, &JSI_Mod::SetMods>("SetMods");

	void ModIoStartGetGameId(ScriptInterface::CxPrivate* pCxPrivate);
	void ModIoStartListMods(ScriptInterface::CxPrivate* pCxPrivate);
	void ModIoStartDownloadMod(ScriptInterface::CxPrivate* pCxPrivate, uint32_t idx);
	bool ModIoAdvanceRequest(ScriptInterface::CxPrivate* pCxPrivate);
	void ModIoCancelRequest(ScriptInterface::CxPrivate* pCxPrivate);
	JS::Value ModIoGetMods(ScriptInterface::CxPrivate* pCxPrivate);
	JS::Value ModIoGetDownloadProgress(ScriptInterface::CxPrivate* pCxPrivate);

	scriptInterface.RegisterFunction<void, &JSI_Mod::ModIoStartGetGameId>("ModIoStartGetGameId");
	scriptInterface.RegisterFunction<void, &JSI_Mod::ModIoStartListMods>("ModIoStartListMods");
	scriptInterface.RegisterFunction<void, uint32_t, &JSI_Mod::ModIoStartDownloadMod>("ModIoStartDownloadMod");
	scriptInterface.RegisterFunction<bool, &JSI_Mod::ModIoAdvanceRequest>("ModIoAdvanceRequest");
	scriptInterface.RegisterFunction<void, &JSI_Mod::ModIoCancelRequest>("ModIoCancelRequest");
	scriptInterface.RegisterFunction<JS::Value, &JSI_Mod::ModIoGetMods>("ModIoGetMods");
	scriptInterface.RegisterFunction<JS::Value, &JSI_Mod::ModIoGetDownloadProgress>("ModIoGetDownloadProgress");
}
