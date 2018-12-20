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

bool JSI_GUIPage::GetProperty(JSContext* cxSource, JS::HandleObject obj, JS::HandleId id, JS::MutableHandleValue vp)
{
	JSAutoRequest rqSource(cxSource);

	JS::RootedValue idval(cxSource);
	if (!JS_IdToValue(cxSource, id, &idval))
		return false;

	std::string functionName;
	if (!ScriptInterface::FromJSVal(cxSource, idval, functionName))
		return false;

	JS::RootedObject parent(cxSource);
	JS::Rooted<JSFunction*> function(cxSource, JS_NewFunction(cxSource, JSI_GUIPage::CallFunction, 1, 0, obj, functionName.c_str()));
	vp.setObject(*JS_GetFunctionObject(function));
	return true;
}

bool JSI_GUIPage::SetProperty(JSContext* cx, JS::HandleObject UNUSED(obj), JS::HandleId UNUSED(id), bool UNUSED(strict), JS::MutableHandleValue UNUSED(vp))
{
	JS_ReportError(cx, "Page settings are immutable.");
	return true;
}

bool JSI_GUIPage::CallFunction(JSContext *cxSource, unsigned argc, JS::Value *vp)
{
	// Determine function name
	JSAutoRequest rqSource(cxSource);
	JS::CallArgs args = JS::CallArgsFromVp(argc, vp);
	JS::RootedValue functionNameValue(cxSource, JS::StringValue(JS_GetFunctionId(JS_ValueToFunction(cxSource, args.calleev()))));
	std::string functionNameString;
	ScriptInterface::FromJSVal(cxSource, functionNameValue, functionNameString);

	// Determine target GUI page from the private data
	JS::RootedObject thisObj(cxSource, &args.thisv().toObject());
	CGUI* guiPage = static_cast<CGUI*>(JS_GetInstancePrivate(cxSource, thisObj, &JSI_GUIPage::JSI_class, nullptr));

	if (!g_GUI->IsPageOpen(guiPage))
	{
		JS_ReportError(cxSource, "GUIPage is not open.");
		return true;
	}

	{
		ScriptInterface* scriptInterfaceSource = ScriptInterface::GetScriptInterfaceAndCBData(cxSource)->pScriptInterface;
		JSContext* cxDestination = guiPage->GetScriptInterface()->GetContext();
		JSAutoRequest rqDestination(cxDestination);
		JS::RootedValue global(cxDestination, guiPage->GetGlobalObject());
		JS::RootedValue argument(cxDestination, argc > 0 ? guiPage->GetScriptInterface()->CloneValueFromOtherContext(*scriptInterfaceSource, args[0]) : JS::UndefinedValue());
		JS::RootedValue returnValueDestination(cxDestination);

		// Call the function of the determined name in the context of the other page
		guiPage->GetScriptInterface()->CallFunction(global, functionNameString.c_str(), &returnValueDestination, argument);

		// Clone return value
		JS::RootedValue returnValueSource(cxSource, scriptInterfaceSource->CloneValueFromOtherContext(*guiPage->GetScriptInterface(), returnValueDestination));
		JS::CallReceiverFromVp(vp).rval().set(returnValueSource);
	}

	return true;
}
