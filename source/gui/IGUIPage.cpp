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
#include "gui/GUIManager.h"
#include "gui/scripting/JSInterface_GUITypes.h"
#include "gui/scripting/JSInterface_IGUIPage.h"
#include "scriptinterface/ScriptInterface.h"

IGUIPage::IGUIPage(shared_ptr<CGUI> pGUI)
{
	m_GUIPage = pGUI;
	JS_AddExtraGCRootsTracer(m_GUIPage->GetScriptInterface()->GetJSRuntime(), Trace, this);

	// TODO: Would be nice to
	// not have these objects hang around forever using up memory, though.
	JSContext* cx = m_GUIPage->GetScriptInterface()->GetContext();
	JSAutoRequest rq(cx);
	m_JSPage = JS::Heap<JS::Value>(JS::ObjectValue(*m_GUIPage->GetScriptInterface()->CreateCustomObject("GUIPage")));
	JS_SetPrivate(&m_JSPage.toObject(), this);
}

IGUIPage::~IGUIPage()
{
	JS_RemoveExtraGCRootsTracer(m_GUIPage->GetScriptInterface()->GetJSRuntime(), Trace, this);
}

JS::Value IGUIPage::GetJSPage()
{
	return m_JSPage;
}

const CStrW IGUIPage::GetName()
{
	if (!m_GUIPage)
		return CStrW();

	return m_GUIPage->GetName();
}

bool IGUIPage::CallFunction(uint argc, JS::Value* vp)
{
	JSContext* cx = m_GUIPage->GetScriptInterface()->GetContext();
	JSAutoRequest rq(cx);

	if (argc == 0)
	{
		JS_ReportError(cx, "GUIObject has no default constructor");
		return false;
	}

	JS::CallArgs args = JS::CallArgsFromVp(argc, vp);

	std::wstring functionName;
	if (!ScriptInterface::FromJSVal(cx, args[0], functionName))
		return false;

	// Perpetuate silly workaround
	shared_ptr<CGUI> oldGUI = g_GUI->m_CurrentGUI;
	 g_GUI->m_CurrentGUI = m_GUIPage;

	JS::RootedValue global(cx, m_GUIPage->GetGlobalObject());
	JS::RootedValue arg(cx, argc > 1 ? args[1] : JS::UndefinedValue());
	JS::RootedValue returnValue(cx);

	m_GUIPage->GetScriptInterface()->CallFunction(global, utf8_from_wstring(functionName).c_str(), &returnValue, arg);

	g_GUI->m_CurrentGUI = oldGUI;

	return true;
}

void IGUIPage::TraceMember(JSTracer* trc)
{
	JS_CallValueTracer(trc, &m_JSPage, "IGUIPage::m_JSPage");
}
