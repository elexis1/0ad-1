/* Copyright (C) 2011 Wildfire Games.
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

#ifndef INCLUDED_MAP
#define INCLUDED_MAP

#include "precompiled.h"

#include "AtlasObject/AtlasObject.h"
#include "../../../General/Observable.h"
#include "wx/collpane.h"
#include "ScenarioEditor/ScenarioEditor.h"

class MapSettingsControl : public wxPanel
{
	DECLARE_DYNAMIC_CLASS(MapSettingsControl);
public:
	MapSettingsControl();
	//MapSettingsControl(wxWindow* parent, ScenarioEditor& scenarioEditor);
	//void CreateWidgets();
	void ReadFromEngine();
	void SetMapSettings(const AtObj& obj);
	AtObj UpdateSettingsObject();
	void Init(ScenarioEditor* scenarioEditor);
private:
	void SendToEngine();

	void OnEdit(wxCommandEvent& WXUNUSED(evt))
	{
		SendToEngine();
	}

	std::set<std::wstring> m_MapSettingsKeywords;
	Observable<AtObj>* m_MapSettings;

	DECLARE_EVENT_TABLE();
};

class NewMapConfiguration : public wxPanel
{
	DECLARE_DYNAMIC_CLASS(NewMapConfiguration);
public:
	NewMapConfiguration();
	void Init(ScenarioEditor* scenarioEditor);
private:
	ScenarioEditor* m_ScenarioEditor;
	bool m_OpenPlayerPanel;

	void OnRandomReseed(wxCommandEvent& evt);
	void OnGenerate(wxCommandEvent& evt);
	void OnOpenPlayerPanel(wxCommandEvent& evt);
	void OnTypeMap(wxCommandEvent& evt);
	void OnChooseImage(wxCommandEvent& evt);
	
	std::wstring* m_Image;

	DECLARE_EVENT_TABLE();
};

#endif