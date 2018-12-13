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

#include "IGUIPage.h"

#include "gui/GUI.h"
#include "gui/scripting/JSInterface_GUITypes.h"
#include "gui/scripting/JSInterface_IGUIPage.h"
#include "ps/GameSetup/Config.h"
#include "ps/CLogger.h"
#include "ps/Profile.h"
#include "scriptinterface/ScriptInterface.h"

IGUIPage::IGUIPage()
 : m_pGUI(NULL)
{
}

IGUIPage::~IGUIPage()
{
	if (m_pGUI)
		JS_RemoveExtraGCRootsTracer(m_pGUI->GetScriptInterface()->GetJSRuntime(), Trace, this);
}

void IGUIPage::SetGUI(CGUI* const& pGUI)
{
	if (!m_pGUI)
		JS_AddExtraGCRootsTracer(pGUI->GetScriptInterface()->GetJSRuntime(), Trace, this);
	m_pGUI = pGUI;
}

JSObject* IGUIPage::GetJSObject()
{
	JSContext* cx = m_pGUI->GetScriptInterface()->GetContext();
	JSAutoRequest rq(cx);
	// TODO: Would be nice to
	// not have these objects hang around forever using up memory, though.
	if (!m_JSPage.initialized())
	{
		m_JSPage.init(cx, m_pGUI->GetScriptInterface()->CreateCustomObject("GUIPage"));
		JS_SetPrivate(m_JSPage.get(), this);
	}
	return m_JSPage.get();
}

bool IGUIPage::CallFunction(uint argc, JS::Value* vp)
{
	JSContext* cx = m_pGUI->GetScriptInterface()->GetContext();
	JSAutoRequest rq(cx);

	if (argc == 0)
	{
		JS_ReportError(cx, "GUIObject has no default constructor");
		return false;
	}

	JS::CallArgs args = JS::CallArgsFromVp(argc, vp);

	std::wstring functionName;
	if (!m_pGUI->GetScriptInterface()->FromJSVal(cx, args[0], functionName))
		return false;

	JS::RootedValue data(cx);
	JS::RootedValue global(cx, m_pGUI->GetGlobalObject());
	m_pGUI->GetScriptInterface()->CallFunction(global, utf8_from_wstring(functionName).c_str(), &data);

	//return m_pGUI->GetScriptInterface()->StringifyJSON(&data, false);
	return true;
}

void IGUIPage::TraceMember(JSTracer* UNUSED(trc))
{
}
