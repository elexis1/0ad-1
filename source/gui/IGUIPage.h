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
class IGUIPage
{
	friend class CGUI;
	friend bool JSI_IGUIPage::CallFunction(JSContext* cx, uint argc, JS::Value* vp);

public:
       IGUIPage(CGUI* const& pGUI);
       ~IGUIPage();

	CStrW GetName();

	JSObject* GetJSObject();



	bool CallFunction(uint argc, JS::Value* vp);

private:
	shared_ptr<CGUI> m_GUIPage;


	// Cached JSObject representing this GUI page
	JS::PersistentRootedObject m_JSPage;

	static void Trace(JSTracer* trc, void* data)
	{
		reinterpret_cast<IGUIPage*>(data)->TraceMember(trc);
	}

	void TraceMember(JSTracer* trc);
};

#endif // INCLUDED_IGUIPage
