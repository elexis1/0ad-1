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

#ifndef INCLUDED_PLAYER
#define INCLUDED_PLAYER

#include "../../../General/Observable.h"

#include "AtlasObject/AtlasObject.h"
#include "GameInterface/Messages.h"
#include "ScenarioEditor/ScenarioEditor.h"

#include "wx/clrpicker.h"
#include "wx/collpane.h"
#include "wx/spinctrl.h"

using namespace AtlasMessage;

class PlayerNotebook;
class PlayerNotebookPage;

class PlayerSettingsControl : public wxPanel
{
	DECLARE_DYNAMIC_CLASS(PlayerSettingsControl);
public:
	PlayerSettingsControl();
	void Init(ScenarioEditor* scenarioEditor);

	void CreateWidgets();
	void LoadDefaults();
	void ReadFromEngine();
	AtObj UpdateSettingsObject();

private:
	void SendToEngine();

	void OnEdit(wxCommandEvent& WXUNUSED(evt))
	{
		if (!m_InGUIUpdate)
			SendToEngine();
	}

	void OnEditSpin(wxSpinEvent& WXUNUSED(evt))
	{
		if (!m_InGUIUpdate)
			SendToEngine();
	}

	void OnPlayerColour(wxColourPickerEvent& WXUNUSED(evt))
	{
		if (m_InGUIUpdate) return;

		SendToEngine();

		// Update player settings, to show new colour
		POST_MESSAGE(LoadPlayerSettings, (false));
	}

	void OnNumPlayersText(wxCommandEvent& WXUNUSED(evt))
	{	// Ignore because it will also trigger EVT_SPINCTRL
		//	and we don't want to handle the same event twice
	}

	void OnNumPlayersSpin(wxSpinEvent& evt);

	// TODO: we shouldn't hardcode this, but instead dynamically create
	//	new player notebook pages on demand; of course the default data
	//	will be limited by the entries in player_defaults.json
	static const size_t MAX_NUM_PLAYERS = 8;

	bool m_InGUIUpdate;
	AtObj m_PlayerDefaults;
	PlayerNotebook* m_Players;
	std::vector<PlayerNotebookPage*> m_PlayerControls;
	Observable<AtObj>* m_MapSettings;
	size_t m_NumPlayers;
	ScenarioEditor* m_ScenarioEditor;

	DECLARE_EVENT_TABLE();
};

// Definitions for keeping AI data sorted
class AIData
{
public:
	AIData(const wxString& id, const wxString& name)
		: m_ID(id), m_Name(name)
	{
	}

	wxString& GetID()
	{
		return m_ID;
	}

	wxString& GetName()
	{
		return m_Name;
	}

	static int CompareAIData(AIData* ai1, AIData* ai2)
	{
		return ai1->m_Name.Cmp(ai2->m_Name);
	}

private:
	wxString m_ID;
	wxString m_Name;
};
WX_DEFINE_SORTED_ARRAY(AIData*, ArrayOfAIData);

#endif
