/* Copyright (C) 2015 Wildfire Games.
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

#ifndef INCLUDED_OBJECT
#define INCLUDED_OBJECT

#include "precompiled.h"
#include "ScenarioEditor/ScenarioEditor.h"
#include "wx/dataview.h"

class ObjectSidebar : public wxPanel
{
	DECLARE_DYNAMIC_CLASS(ObjectSidebar);
public:
	ObjectSidebar();
	void Init(ScenarioEditor* scenarioEditor);
	void FilterObjects();

private:
	ScenarioEditor* m_ScenarioEditor;
	wxDataViewTreeCtrl* m_ObjectList;
	/*void OnToolChange(ITool* tool);
	void OnToggleViewer(wxCommandEvent& evt);*/
	void OnSelectType(wxCommandEvent& evt);
	void OnSelectFilter(wxCommandEvent& evt);
	void OnSelectObject(wxDataViewEvent& evt);

	DECLARE_EVENT_TABLE();
};

class DisplayTemplate : public wxPanel
{
	DECLARE_DYNAMIC_CLASS(DisplayTemplate)
public:
	DisplayTemplate();
	void Init(ScenarioEditor* scenarioEditor);
	void OnSelectedObjectsChange(const std::vector<AtlasMessage::ObjectID>& selectedObjects);

private:
	wxScrolledWindow* m_TemplateNames;
};
#endif