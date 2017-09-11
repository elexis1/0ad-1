/* Copyright (C) 2017 Wildfire Games.
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

#include "scriptinterface/ScriptInterface.h"

#include "graphics/FontMetrics.h"
#include "graphics/GameView.h"
#include "graphics/MapReader.h"
#include "graphics/scripting/JSInterface_GameView.h"
#include "gui/GUI.h"
#include "gui/GUIManager.h"
#include "gui/IGUIObject.h"
#include "gui/scripting/JSInterface_GUIManager.h"
#include "gui/scripting/JSInterface_GUITypes.h"
#include "i18n/L10n.h"
#include "i18n/scripting/JSInterface_L10n.h"
#include "lib/svn_revision.h"
#include "lib/sysdep/sysdep.h"
#include "lib/timer.h"
#include "lib/utf8.h"
#include "lobby/scripting/JSInterface_Lobby.h"
#include "lobby/IXmppClient.h"
#include "network/NetClient.h"
#include "network/NetServer.h"
#include "network/scripting/JSInterface_Network.h"
#include "ps/CConsole.h"
#include "ps/CLogger.h"
#include "ps/Errors.h"
#include "ps/GUID.h"
#include "ps/Game.h"
#include "ps/GameSetup/Atlas.h"
#include "ps/Hotkey.h"
#include "ps/ProfileViewer.h"
#include "ps/Profile.h"
#include "ps/UserReport.h"
#include "ps/scripting/JSInterface_ConfigDB.h"
#include "ps/scripting/JSInterface_Console.h"
#include "ps/scripting/JSInterface_Game.h"
#include "ps/scripting/JSInterface_Mod.h"
#include "ps/scripting/JSInterface_SavedGame.h"
#include "ps/scripting/JSInterface_VFS.h"
#include "ps/scripting/JSInterface_VisualReplay.h"
#include "renderer/scripting/JSInterface_Renderer.h"
#include "simulation2/scripting/JSInterface_Simulation.h"
#include "soundmanager/scripting/JSInterface_Sound.h"
#include "tools/atlas/GameInterface/GameLoop.h"

/*
 * This file defines a set of functions that are available to GUI scripts, to allow
 * interaction with the rest of the engine.
 * Functions are exposed to scripts within the global object 'Engine', so
 * scripts should call "Engine.FunctionName(...)" etc.
 */

extern void restart_mainloop_in_atlas(); // from main.cpp
extern void kill_mainloop();

namespace {

void OpenURL(ScriptInterface::CxPrivate* UNUSED(pCxPrivate), const std::string& url)
{
	sys_open_url(url);
}

std::wstring GetMatchID(ScriptInterface::CxPrivate* UNUSED(pCxPrivate))
{
	return ps_generate_guid().FromUTF8();
}

void RestartInAtlas(ScriptInterface::CxPrivate* UNUSED(pCxPrivate))
{
	restart_mainloop_in_atlas();
}

bool AtlasIsAvailable(ScriptInterface::CxPrivate* UNUSED(pCxPrivate))
{
	return ATLAS_IsAvailable();
}

bool IsAtlasRunning(ScriptInterface::CxPrivate* UNUSED(pCxPrivate))
{
	return g_AtlasGameLoop && g_AtlasGameLoop->running;
}

JS::Value LoadMapSettings(ScriptInterface::CxPrivate* pCxPrivate, const VfsPath& pathname)
{
	JSContext* cx = pCxPrivate->pScriptInterface->GetContext();
	JSAutoRequest rq(cx);

	CMapSummaryReader reader;

	if (reader.LoadMap(pathname) != PSRETURN_OK)
		return JS::UndefinedValue();

	JS::RootedValue settings(cx);
	reader.GetMapSettings(*(pCxPrivate->pScriptInterface), &settings);
	return settings;
}

bool HotkeyIsPressed_(ScriptInterface::CxPrivate* UNUSED(pCxPrivate), const std::string& hotkeyName)
{
	return HotkeyIsPressed(hotkeyName);
}

void DisplayErrorDialog(ScriptInterface::CxPrivate* UNUSED(pCxPrivate), const std::wstring& msg)
{
	debug_DisplayError(msg.c_str(), DE_NO_DEBUG_INFO, NULL, NULL, NULL, 0, NULL, NULL);
}

JS::Value GetProfilerState(ScriptInterface::CxPrivate* pCxPrivate)
{
	return g_ProfileViewer.SaveToJS(*(pCxPrivate->pScriptInterface));
}

bool IsUserReportEnabled(ScriptInterface::CxPrivate* UNUSED(pCxPrivate))
{
	return g_UserReporter.IsReportingEnabled();
}

void SetUserReportEnabled(ScriptInterface::CxPrivate* UNUSED(pCxPrivate), bool enabled)
{
	g_UserReporter.SetReportingEnabled(enabled);
}

std::string GetUserReportStatus(ScriptInterface::CxPrivate* UNUSED(pCxPrivate))
{
	return g_UserReporter.GetStatus();
}

void SubmitUserReport(ScriptInterface::CxPrivate* UNUSED(pCxPrivate), const std::string& type, int version, const std::wstring& data)
{
	g_UserReporter.SubmitReport(type.c_str(), version, utf8_from_wstring(data));
}

// Deliberately cause the game to crash.
// Currently implemented via access violation (read of address 0).
// Useful for testing the crashlog/stack trace code.
int Crash(ScriptInterface::CxPrivate* UNUSED(pCxPrivate))
{
	debug_printf("Crashing at user's request.\n");
	return *(volatile int*)0;
}

void DebugWarn(ScriptInterface::CxPrivate* UNUSED(pCxPrivate))
{
	debug_warn(L"Warning at user's request.");
}

// Force a JS garbage collection cycle to take place immediately.
// Writes an indication of how long this took to the console.
void ForceGC(ScriptInterface::CxPrivate* pCxPrivate)
{
	double time = timer_Time();
	JS_GC(pCxPrivate->pScriptInterface->GetJSRuntime());
	time = timer_Time() - time;
	g_Console->InsertMessage(fmt::sprintf("Garbage collection completed in: %f", time));
}

CStrW GetSystemUsername(ScriptInterface::CxPrivate* UNUSED(pCxPrivate))
{
	return sys_get_user_name();
}

// Cause the game to exit gracefully.
// params:
// returns:
// notes:
// - Exit happens after the current main loop iteration ends
//   (since this only sets a flag telling it to end)
void ExitProgram(ScriptInterface::CxPrivate* UNUSED(pCxPrivate))
{
	kill_mainloop();
}

// Return the date/time at which the current executable was compiled.
// params: mode OR an integer specifying
//   what to display: -1 for "date time (svn revision)", 0 for date, 1 for time, 2 for svn revision
// returns: string with the requested timestamp info
// notes:
// - Displayed on main menu screen; tells non-programmers which auto-build
//   they are running. Could also be determined via .EXE file properties,
//   but that's a bit more trouble.
// - To be exact, the date/time returned is when scriptglue.cpp was
//   last compiled, but the auto-build does full rebuilds.
// - svn revision is generated by calling svnversion and cached in
//   lib/svn_revision.cpp. it is useful to know when attempting to
//   reproduce bugs (the main EXE and PDB should be temporarily reverted to
//   that revision so that they match user-submitted crashdumps).
std::wstring GetBuildTimestamp(ScriptInterface::CxPrivate* UNUSED(pCxPrivate), int mode)
{
	char buf[200];
	if (mode == -1) // Date, time and revision.
	{
		UDate dateTime = g_L10n.ParseDateTime(__DATE__ " " __TIME__, "MMM d yyyy HH:mm:ss", Locale::getUS());
		std::string dateTimeString = g_L10n.LocalizeDateTime(dateTime, L10n::DateTime, SimpleDateFormat::DATE_TIME);
		char svnRevision[32];
		sprintf_s(svnRevision, ARRAY_SIZE(svnRevision), "%ls", svn_revision);
		if (strcmp(svnRevision, "custom build") == 0)
		{
			// Translation: First item is a date and time, item between parenthesis is the Subversion revision number of the current build.
			sprintf_s(buf, ARRAY_SIZE(buf), g_L10n.Translate("%s (custom build)").c_str(), dateTimeString.c_str());
		}
		else
		{
			// Translation: First item is a date and time, item between parenthesis is the Subversion revision number of the current build.
			// dennis-ignore: *
			sprintf_s(buf, ARRAY_SIZE(buf), g_L10n.Translate("%s (%ls)").c_str(), dateTimeString.c_str(), svn_revision);
		}
	}
	else if (mode == 0) // Date.
	{
		UDate dateTime = g_L10n.ParseDateTime(__DATE__, "MMM d yyyy", Locale::getUS());
		std::string dateTimeString = g_L10n.LocalizeDateTime(dateTime, L10n::Date, SimpleDateFormat::MEDIUM);
		sprintf_s(buf, ARRAY_SIZE(buf), "%s", dateTimeString.c_str());
	}
	else if (mode == 1) // Time.
	{
		UDate dateTime = g_L10n.ParseDateTime(__TIME__, "HH:mm:ss", Locale::getUS());
		std::string dateTimeString = g_L10n.LocalizeDateTime(dateTime, L10n::Time, SimpleDateFormat::MEDIUM);
		sprintf_s(buf, ARRAY_SIZE(buf), "%s", dateTimeString.c_str());
	}
	else if (mode == 2) // Revision.
	{
		char svnRevision[32];
		sprintf_s(svnRevision, ARRAY_SIZE(svnRevision), "%ls", svn_revision);
		if (strcmp(svnRevision, "custom build") == 0)
		{
			sprintf_s(buf, ARRAY_SIZE(buf), "%s", g_L10n.Translate("custom build").c_str());
		}
		else
		{
			sprintf_s(buf, ARRAY_SIZE(buf), "%ls", svn_revision);
		}
	}

	return wstring_from_utf8(buf);
}

JS::Value ReadJSONFile(ScriptInterface::CxPrivate* pCxPrivate, const std::wstring& filePath)
{
	JSContext* cx = pCxPrivate->pScriptInterface->GetContext();
	JSAutoRequest rq(cx);
	JS::RootedValue out(cx);
	pCxPrivate->pScriptInterface->ReadJSONFile(filePath, &out);
	return out;
}

void WriteJSONFile(ScriptInterface::CxPrivate* pCxPrivate, const std::wstring& filePath, JS::HandleValue val1)
{
	JSContext* cx = pCxPrivate->pScriptInterface->GetContext();
	JSAutoRequest rq(cx);

	// TODO: This is a workaround because we need to pass a MutableHandle to StringifyJSON.
	JS::RootedValue val(cx, val1);

	std::string str(pCxPrivate->pScriptInterface->StringifyJSON(&val, false));

	VfsPath path(filePath);
	WriteBuffer buf;
	buf.Append(str.c_str(), str.length());
	g_VFS->CreateFile(path, buf.Data(), buf.Size());
}

int GetTextWidth(ScriptInterface::CxPrivate* UNUSED(pCxPrivate), const CStr& fontName, const CStrW& text)
{
	int width = 0;
	int height = 0;
	CStrIntern _fontName(fontName);
	CFontMetrics fontMetrics(_fontName);
	fontMetrics.CalculateStringSize(text.c_str(), width, height);
	return width;
}

//-----------------------------------------------------------------------------
// Timer
//-----------------------------------------------------------------------------


// Script profiling functions: Begin timing a piece of code with StartJsTimer(num)
// and stop timing with StopJsTimer(num). The results will be printed to stdout
// when the game exits.

static const size_t MAX_JS_TIMERS = 20;
static TimerUnit js_start_times[MAX_JS_TIMERS];
static TimerUnit js_timer_overhead;
static TimerClient js_timer_clients[MAX_JS_TIMERS];
static wchar_t js_timer_descriptions_buf[MAX_JS_TIMERS * 12];	// depends on MAX_JS_TIMERS and format string below

static void InitJsTimers(const ScriptInterface& scriptInterface)
{
	wchar_t* pos = js_timer_descriptions_buf;
	for(size_t i = 0; i < MAX_JS_TIMERS; i++)
	{
		const wchar_t* description = pos;
		pos += swprintf_s(pos, 12, L"js_timer %d", (int)i)+1;
		timer_AddClient(&js_timer_clients[i], description);
	}

	// call several times to get a good approximation of 'hot' performance.
	// note: don't use a separate timer slot to warm up and then judge
	// overhead from another: that causes worse results (probably some
	// caching effects inside JS, but I don't entirely understand why).
	std::wstring calibration_script =
		L"Engine.StartXTimer(0);\n" \
		L"Engine.StopXTimer (0);\n" \
		L"\n";
	scriptInterface.LoadGlobalScript("timer_calibration_script", calibration_script);
	// slight hack: call LoadGlobalScript twice because we can't average several
	// TimerUnit values because there's no operator/. this way is better anyway
	// because it hopefully avoids the one-time JS init overhead.
	js_timer_clients[0].sum.SetToZero();
	scriptInterface.LoadGlobalScript("timer_calibration_script", calibration_script);
	js_timer_clients[0].sum.SetToZero();
	js_timer_clients[0].num_calls = 0;
}

void StartJsTimer(ScriptInterface::CxPrivate* pCxPrivate, unsigned int slot)
{
	ONCE(InitJsTimers(*(pCxPrivate->pScriptInterface)));

	if (slot >= MAX_JS_TIMERS)
	{
		LOGERROR("Exceeded the maximum number of timer slots for scripts!");
		return;
	}

	js_start_times[slot].SetFromTimer();
}

void StopJsTimer(ScriptInterface::CxPrivate* UNUSED(pCxPrivate), unsigned int slot)
{
	if (slot >= MAX_JS_TIMERS)
	{
		LOGERROR("Exceeded the maximum number of timer slots for scripts!");
		return;
	}

	TimerUnit now;
	now.SetFromTimer();
	now.Subtract(js_timer_overhead);
	BillingPolicy_Default()(&js_timer_clients[slot], js_start_times[slot], now);
	js_start_times[slot].SetToZero();
}

/**
 * Microseconds since the epoch.
 */
double GetMicroseconds(ScriptInterface::CxPrivate* UNUSED(pCxPrivate))
{
	return JS_Now();
}

} // namespace

void GuiScriptingInit(ScriptInterface& scriptInterface)
{
	JSI_IGUIObject::init(scriptInterface);
	JSI_GUITypes::init(scriptInterface);

	JSI_GUIManager::RegisterScriptFunctions(scriptInterface);
	JSI_GameView::RegisterScriptFunctions(scriptInterface);
	JSI_Renderer::RegisterScriptFunctions(scriptInterface);
	JSI_Console::RegisterScriptFunctions(scriptInterface);
	JSI_ConfigDB::RegisterScriptFunctions(scriptInterface);
	JSI_Game::RegisterScriptFunctions(scriptInterface);
	JSI_Mod::RegisterScriptFunctions(scriptInterface);
	JSI_Network::RegisterScriptFunctions(scriptInterface);
	JSI_SavedGame::RegisterScriptFunctions(scriptInterface);
	JSI_Sound::RegisterScriptFunctions(scriptInterface);
	JSI_Simulation::RegisterScriptFunctions(scriptInterface);
	JSI_L10n::RegisterScriptFunctions(scriptInterface);
	JSI_Lobby::RegisterScriptFunctions(scriptInterface);
	JSI_VFS::RegisterScriptFunctions(scriptInterface);
	JSI_VisualReplay::RegisterScriptFunctions(scriptInterface);

	scriptInterface.RegisterFunction<JS::Value, VfsPath, &LoadMapSettings>("LoadMapSettings");

	// Misc functions
	scriptInterface.RegisterFunction<void, std::string, &OpenURL>("OpenURL");
	scriptInterface.RegisterFunction<std::wstring, &GetMatchID>("GetMatchID");
	scriptInterface.RegisterFunction<void, &RestartInAtlas>("RestartInAtlas");
	scriptInterface.RegisterFunction<bool, &AtlasIsAvailable>("AtlasIsAvailable");
	scriptInterface.RegisterFunction<bool, &IsAtlasRunning>("IsAtlasRunning");
	scriptInterface.RegisterFunction<JS::Value, VfsPath, &LoadMapSettings>("LoadMapSettings");
	scriptInterface.RegisterFunction<bool, std::string, &HotkeyIsPressed_>("HotkeyIsPressed");
	scriptInterface.RegisterFunction<void, std::wstring, &DisplayErrorDialog>("DisplayErrorDialog");
	scriptInterface.RegisterFunction<JS::Value, &GetProfilerState>("GetProfilerState");
	scriptInterface.RegisterFunction<void, &ExitProgram>("Exit");
	scriptInterface.RegisterFunction<std::wstring, int, &GetBuildTimestamp>("GetBuildTimestamp");
	scriptInterface.RegisterFunction<JS::Value, std::wstring, &ReadJSONFile>("ReadJSONFile");
	scriptInterface.RegisterFunction<void, std::wstring, JS::HandleValue, &WriteJSONFile>("WriteJSONFile");
	scriptInterface.RegisterFunction<int, CStr, CStrW, &GetTextWidth>("GetTextWidth");

	// User report functions
	scriptInterface.RegisterFunction<bool, &IsUserReportEnabled>("IsUserReportEnabled");
	scriptInterface.RegisterFunction<void, bool, &SetUserReportEnabled>("SetUserReportEnabled");
	scriptInterface.RegisterFunction<std::string, &GetUserReportStatus>("GetUserReportStatus");
	scriptInterface.RegisterFunction<void, std::string, int, std::wstring, &SubmitUserReport>("SubmitUserReport");

	// Development/debugging functions
	scriptInterface.RegisterFunction<void, unsigned int, &StartJsTimer>("StartXTimer");
	scriptInterface.RegisterFunction<void, unsigned int, &StopJsTimer>("StopXTimer");
	scriptInterface.RegisterFunction<double, &GetMicroseconds>("GetMicroseconds");
	scriptInterface.RegisterFunction<int, &Crash>("Crash");
	scriptInterface.RegisterFunction<void, &DebugWarn>("DebugWarn");
	scriptInterface.RegisterFunction<void, &ForceGC>("ForceGC");
	scriptInterface.RegisterFunction<CStrW, &GetSystemUsername>("GetSystemUsername");
}
