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
#include "JSInterface_GUITypes.h"

#include "gui/IGUIObject.h"
#include "gui/IGUIPage.h"
#include "gui/CGUI.h"
#include "gui/IGUIScrollBar.h"
#include "gui/CList.h"
#include "gui/GUIManager.h"

#include "ps/CLogger.h"

#include "scriptinterface/ScriptInterface.h"
#include "scriptinterface/ScriptExtraHeaders.h"

JSClass JSI_IGUIPage::JSI_class = {
	"GUIPage", JSCLASS_HAS_PRIVATE,
	nullptr, nullptr,
	JSI_IGUIPage::getProperty, JSI_IGUIPage::setProperty,
	nullptr, nullptr, nullptr, nullptr,
	nullptr, nullptr, JSI_IGUIPage::construct, nullptr
};

JSPropertySpec JSI_IGUIPage::JSI_props[] =
{
	{ 0 }
};

JSFunctionSpec JSI_IGUIPage::JSI_methods[] =
{
	JS_FS("CallFunction", JSI_IGUIPage::CallFunction, 0, 0),
	JS_FS_END
};

bool JSI_IGUIPage::construct(JSContext* cx, uint argc, JS::Value* vp)
{
	JSAutoRequest rq(cx);
	JS::CallArgs args = JS::CallArgsFromVp(argc, vp);
	ScriptInterface* pScriptInterface = ScriptInterface::GetScriptInterfaceAndCBData(cx)->pScriptInterface;

	if (args.length() == 0)
	{
		JS_ReportError(cx, "GUIPage has no default constructor");
		return false;
	}

	JS::RootedObject obj(cx, pScriptInterface->CreateCustomObject("GUIPage"));

	// Store the IGUIPage in the JS object's 'private' area
	IGUIPage* guiPage = (IGUIPage*)args[0].get().toPrivate();
	JS_SetPrivate(obj, guiPage);

	args.rval().setObject(*obj);
	return true;
}

void JSI_IGUIPage::init(ScriptInterface& scriptInterface)
{
	scriptInterface.DefineCustomObjectType(&JSI_class, construct, 1, JSI_props, JSI_methods, NULL, NULL);
}

bool JSI_IGUIPage::getProperty(JSContext* UNUSED(cx), JS::HandleObject UNUSED(obj), JS::HandleId UNUSED(id), JS::MutableHandleValue UNUSED(vp))
{
	return true;
}

bool JSI_IGUIPage::setProperty(JSContext* UNUSED(cx), JS::HandleObject UNUSED(obj), JS::HandleId UNUSED(id), bool UNUSED(strict), JS::MutableHandleValue UNUSED(vp))
{
	return true;
}

bool JSI_IGUIPage::CallFunction(JSContext* cx, uint argc, JS::Value* vp)
{
	JSAutoRequest rq(cx);
	//JS::CallReceiver rec = JS::CallReceiverFromVp(vp);

	JS::RootedObject thisObj(cx, JS_THIS_OBJECT(cx, vp));

	IGUIPage* guiPage = (IGUIPage*)JS_GetInstancePrivate(cx, thisObj, &JSI_IGUIPage::JSI_class, NULL);

	if (!guiPage)
	{
		JS_ReportError(cx, "GUIPage is not defined!");
		return false;
	}

	return guiPage->CallFunction(argc, vp);
}
