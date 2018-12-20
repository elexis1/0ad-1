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

#include "JSInterface_GUIPage.h"

#include "gui/CGUI.h"
#include "gui/GUIManager.h"
#include "scriptinterface/ScriptInterface.h"

JSClass JSI_GUIPage::JSI_class = {
	"GUIPage", JSCLASS_HAS_PRIVATE,
	nullptr, nullptr,
	JSI_GUIPage::GetProperty, JSI_GUIPage::SetProperty,
	nullptr, nullptr, nullptr, nullptr,
	nullptr, nullptr, nullptr, nullptr
};

void JSI_GUIPage::RegisterScriptClass(ScriptInterface& scriptInterface)
{
	scriptInterface.DefineCustomObjectType(&JSI_class, nullptr, 1, nullptr, nullptr, nullptr, nullptr);
}

// TODO: could test that the pointer is still on the stack...

//bool CallFunction(JSContext* cx, uint argc, JS::Value* vp);
bool JSI_GUIPage::GetProperty(JSContext* cxSource, JS::HandleObject obj, JS::HandleId id, JS::MutableHandleValue vp)
{
	JSAutoRequest rqSource(cxSource);

	JS::RootedValue idval(cxSource);
	if (!JS_IdToValue(cxSource, id, &idval))
		return false;

	std::string functionName;
	if (!ScriptInterface::FromJSVal(cxSource, idval, functionName))
		return false;

	debug_printf("meh %s\n", (functionName).c_str());

	JS::RootedObject parent(cxSource);
	JS::Rooted<JSFunction*> function(cxSource, JS_NewFunction(cxSource, JSI_GUIPage::CallFunction, 1, 0, obj, functionName.c_str()));
	vp.setObject(*JS_GetFunctionObject(function));

	return true;
}

bool JSI_GUIPage::CallFunction(JSContext *cxSource, unsigned argc, JS::Value *vp)
{
	JSAutoRequest rqSource(cxSource);

	JS::CallArgs args = JS::CallArgsFromVp(argc, vp);
	JS::RootedValue calleeValue(cxSource, JS::ObjectValue(args.callee()));
	JS::RootedString functionName(cxSource, JS_GetFunctionId(JS_ValueToFunction(cxSource, calleeValue)));
	JS::RootedValue functionNameValue(cxSource, JS::StringValue(functionName));
	std::string functionNameString;
	ScriptInterface::FromJSVal(cxSource, functionNameValue, functionNameString);

	JS::RootedObject thisObj(cxSource, &JS::CallArgsFromVp(argc, vp).thisv().toObject());
	CGUI* gui = static_cast<CGUI*>(JS_GetInstancePrivate(cxSource, thisObj, &JSI_GUIPage::JSI_class, nullptr));

	SGUIPage* page;
	for (SGUIPage& p : g_GUI->m_PageStack)
		if (p.gui.get() == gui)
			page = &p;

	if (!page)
	{
		JS_ReportError(cxSource, "GUIPage is not opened.");
		return false;
	}

	{
		JSContext* cxDestination = gui->GetScriptInterface()->GetContext();
		JSAutoRequest rqDestination(cxDestination);
		JS::RootedValue global(cxDestination, gui->GetGlobalObject());
		JS::RootedValue arg(cxDestination, argc > 0 ? gui->GetScriptInterface()->CloneValueFromOtherContext(*ScriptInterface::GetScriptInterfaceAndCBData(cxSource)->pScriptInterface, args[0]) : JS::UndefinedValue());
		JS::RootedValue returnValue(cxDestination);
		gui->GetScriptInterface()->CallFunction(global, functionNameString.c_str(), &returnValue, arg);
	}

	// TODO: set VP
	return true;
}

bool JSI_GUIPage::SetProperty(JSContext* cx, JS::HandleObject UNUSED(obj), JS::HandleId UNUSED(id), bool UNUSED(strict), JS::MutableHandleValue UNUSED(vp))
{
	JS_ReportError(cx, "Page settings are immutable.");
	return false;
}
