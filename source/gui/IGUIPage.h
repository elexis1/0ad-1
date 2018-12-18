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

#ifndef INCLUDED_IGUIPage
#define INCLUDED_IGUIPage

#include "gui/scripting/JSInterface_IGUIPage.h"
#include "ps/CStr.h"

#include <string>
#include <map>
#include <vector>

class CGUI;

/**
 * This class implements the JS object whose functions call into the CGUI functions of that page.
 *
 * The JS object is accessible from the parent GUI (and only from the parent GUI) and
 * allows it call functions in the given page.
 */
class IGUIPage
{
	friend class CGUI;
	friend bool JSI_IGUIPage::CallFunction(JSContext* cx, uint argc, JS::Value* vp);

public:
	IGUIPage(shared_ptr<CGUI> pGUI);
	~IGUIPage();

	/**
	 * Exposes the properties and functions of the GUI page to JS.
	 */
	JSObject* GetJSObject();

	/**
	 * Get name passed to PushPage, allows JS to identify pages without keeping global references.
	 */
	const CStrW GetName();

	/**
	 * Call a JS function given in the first argument and pass the optional second argument.
	 */
	bool CallFunction(uint argc, JS::Value* vp);

private:

	/**
	 * JS functions of the GUI page operate on this instance.
	 */
	shared_ptr<CGUI> m_GUIPage;

	/**
	 * Cached JSObject representing this GUI page.
	 */
	JS::PersistentRootedObject m_JSPage;

	static void Trace(JSTracer* trc, void* data)
	{
		reinterpret_cast<IGUIPage*>(data)->TraceMember(trc);
	}

	void TraceMember(JSTracer* trc);
};

#endif // INCLUDED_IGUIPage
