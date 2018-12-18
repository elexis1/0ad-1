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
#include "gui/IGUIPage.h"
#include "gui/GUIManager.h"
#include "scriptinterface/ScriptInterface.h"

JSClass JSI_IGUIPage::JSI_class = {
	"GUIPage", JSCLASS_HAS_PRIVATE,
	nullptr, nullptr, nullptr, nullptr,
	nullptr, nullptr, nullptr, nullptr,
	nullptr, nullptr, JSI_IGUIPage::ConstructInstance, nullptr
};

JSPropertySpec JSI_IGUIPage::JSI_props[] =
{
	{ "name", JSPROP_ENUMERATE | JSPROP_READONLY | JSPROP_PERMANENT, JSI_IGUIPage::GetName },
	{ 0 }
};

JSFunctionSpec JSI_IGUIPage::JSI_methods[] =
{
	JS_FS("GetName", JSI_IGUIPage::GetName, 0, JSPROP_ENUMERATE | JSPROP_READONLY | JSPROP_PERMANENT),
	JS_FS("CallFunction", JSI_IGUIPage::CallFunction, 0, JSPROP_ENUMERATE | JSPROP_READONLY | JSPROP_PERMANENT),
	JS_FS_END
};

void JSI_IGUIPage::RegisterScriptClass(ScriptInterface& scriptInterface)
{
	scriptInterface.DefineCustomObjectType(&JSI_class, ConstructInstance, 1, JSI_props, JSI_methods, nullptr, nullptr);
}

bool JSI_IGUIPage::ConstructInstance(JSContext* cx, uint argc, JS::Value* vp)
{
	JSAutoRequest rq(cx);
	JS::CallArgs args = JS::CallArgsFromVp(argc, vp);

	if (args.length() == 0)
	{
		JS_ReportError(cx, "GUIPage has no default constructor");
		return false;
	}

	ScriptInterface* pScriptInterface = ScriptInterface::GetScriptInterfaceAndCBData(cx)->pScriptInterface;
	JS::RootedObject obj(cx, pScriptInterface->CreateCustomObject("GUIPage"));

	// Store the IGUIPage in the JS object's 'private' area
	IGUIPage* guiPage = (IGUIPage*)args[0].get().toPrivate();
	JS_SetPrivate(obj, guiPage);

	args.rval().setObject(*obj);
	return true;
}

bool JSI_IGUIPage::GetName(JSContext* cx, uint argc, JS::Value* vp)
{
	JSAutoRequest rq(cx);

	JS::CallArgs args = JS::CallArgsFromVp(argc, vp);
	if (!args.thisv().isObject())
	{
		JS_ReportError(cx, "Called on incompatible object!");
		return false;
	}

	JS::RootedObject thisObj(cx, &args.thisv().toObject());
	IGUIPage* guiPage = (IGUIPage*)JS_GetInstancePrivate(cx, thisObj, &JSI_IGUIPage::JSI_class, NULL);
	if (!guiPage)
	{
		JS_ReportError(cx, "JSI_IGUIPage::getName: GUIPage is not defined!");
		return false;
	}

	JS::RootedValue nameValue(cx);
	ScriptInterface::ToJSVal(cx, &nameValue, guiPage->GetName());

	JS::CallReceiver rec = JS::CallReceiverFromVp(vp);
	rec.rval().set(nameValue);
	return true;
}


bool JSI_IGUIPage::CallFunction(JSContext* cx, uint argc, JS::Value* vp)
{
       return true;
	JSAutoRequest rq(cx);
	//ScriptInterface* pScriptInterface = ScriptInterface::GetScriptInterfaceAndCBData(cx)->pScriptInterface;
	//JS::CallReceiver rec = JS::CallReceiverFromVp(vp);

	JS::CallArgs args = JS::CallArgsFromVp(argc, vp);
	if (!args.thisv().isObject())
	{
		JS_ReportError(cx, "Called on incompatible object!");
		return false;
	}

	JS::RootedObject thisObj(cx, &args.thisv().toObject());
	IGUIPage* guiPage = (IGUIPage*)JS_GetInstancePrivate(cx, thisObj, &JSI_IGUIPage::JSI_class, NULL);

	if (!guiPage)
	{
		JS_ReportError(cx, "JSI_IGUIPage::CallFunction: GUIPage is not defined!");
		return false;
	}

	args.rval().setUndefined();

	return guiPage->CallFunction(argc, vp);
}
