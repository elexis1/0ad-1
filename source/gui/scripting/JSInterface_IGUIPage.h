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

#ifndef INCLUDED_JSI_IGUIPAGE
#define INCLUDED_JSI_IGUIPAGE

#include "scriptinterface/ScriptInterface.h"

namespace JSI_IGUIPage
{
	extern JSClass JSI_class;
	extern JSPropertySpec JSI_props[];
	extern JSFunctionSpec JSI_methods[];

	bool getName(JSContext* cx, uint argc, JS::Value*);
	bool getProperty(JSContext* cx, JS::HandleObject obj, JS::HandleId id, JS::MutableHandleValue vp);
	bool setProperty(JSContext* cx, JS::HandleObject obj, JS::HandleId id, bool strict, JS::MutableHandleValue vp);
	bool construct(JSContext* cx, uint argc, JS::Value* vp);
	void init(ScriptInterface& scriptInterface);
	bool callFunction(JSContext* cx, uint argc, JS::Value* vp);
}

#endif // INCLUDED_JSI_IGUIPAGE
