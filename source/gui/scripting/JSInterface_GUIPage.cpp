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

#include "JSInterface_IGUIPage.h"

#include "gui/CGUI.h"
#include "gui/GUIManager.h"
#include "scriptinterface/ScriptInterface.h"

JSClass JSI_IGUIPage::JSI_class = {
	"GUIPage", JSCLASS_HAS_PRIVATE,
	nullptr, nullptr, nullptr, nullptr,
	nullptr, nullptr, nullptr, nullptr,
	nullptr, nullptr, nullptr, nullptr
};

JSPropertySpec JSI_IGUIPage::JSI_props[] =
{
	{ 0 }
};

JSFunctionSpec JSI_IGUIPage::JSI_methods[] =
{
	JS_FS("CallFunction", JSI_IGUIPage::CallFunction, 0, JSPROP_ENUMERATE | JSPROP_READONLY | JSPROP_PERMANENT),
	JS_FS_END
};

void JSI_IGUIPage::RegisterScriptClass(ScriptInterface& scriptInterface)
{
	scriptInterface.DefineCustomObjectType(&JSI_class, nullptr, 1, JSI_props, JSI_methods, nullptr, nullptr);
}

bool JSI_IGUIPage::CallFunction(JSContext* cxSource, uint argc, JS::Value* vp)
{
	JSAutoRequest rq(cxSource);

	JS::CallArgs args = JS::CallArgsFromVp(argc, vp);
	if (!args.thisv().isObject())
	{
		JS_ReportError(cxSource, "Called on incompatible object!");
		return false;
	}

	JS::RootedObject thisObj(cxSource, &args.thisv().toObject());
	CGUI* gui = (CGUI*)JS_GetInstancePrivate(cxSource, thisObj, &JSI_IGUIPage::JSI_class, nullptr);

	if (!gui)
	{
		JS_ReportError(cxSource, "JSI_IGUIPage::CallFunction: GUIPage is not defined!");
		return false;
	}

	std::wstring functionName;
	if (!ScriptInterface::FromJSVal(cxSource, args[0], functionName))
		   return false;

	JSContext* cxDestination = gui->GetScriptInterface()->GetContext();
	JS::RootedValue global(cxDestination, gui->GetGlobalObject());
	JS::RootedValue arg(cxDestination, argc > 1 ? gui->GetScriptInterface()->CloneValueFromOtherContext(*ScriptInterface::GetScriptInterfaceAndCBData(cxSource)->pScriptInterface, args[1]) : JS::UndefinedValue());
	JS::RootedValue returnValue(cxDestination);

	gui->GetScriptInterface()->CallFunction(global, utf8_from_wstring(functionName).c_str(), &returnValue, arg);

	args.rval().setUndefined();

	return true;
}
