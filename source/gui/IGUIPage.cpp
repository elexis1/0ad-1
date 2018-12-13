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

void IGUIPage::CallFunction()
{
	shared_ptr<ScriptInterface> scriptInterface = m_pGUI->GetScriptInterface();
	JSContext* cx = scriptInterface->GetContext();
	JSAutoRequest rq(cx);

	JS::RootedValue data(cx);
	JS::RootedValue global(cx, m_pGUI->GetGlobalObject());
	scriptInterface->CallFunction(global, "hellworld", &data);
	//return scriptInterface->StringifyJSON(&data, false);
}

void IGUIPage::TraceMember(JSTracer* UNUSED(trc))
{
}
