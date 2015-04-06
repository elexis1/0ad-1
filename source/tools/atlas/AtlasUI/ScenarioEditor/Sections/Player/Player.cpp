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

#include "precompiled.h"

#include "Player.h"

#include "wx/choicebk.h"
#include "wx/clrpicker.h"
#include "wx/xrc/xmlres.h"

enum
{
	ID_NumPlayers,
	ID_PlayerFood,
	ID_PlayerWood,
	ID_PlayerMetal,
	ID_PlayerStone,
	ID_PlayerPop,
	ID_PlayerColor,

	ID_DefaultName,
	ID_DefaultCiv,
	ID_DefaultColor,
	ID_DefaultAI,
	ID_DefaultFood,
	ID_DefaultWood,
	ID_DefaultMetal,
	ID_DefaultStone,
	ID_DefaultPop,
	ID_DefaultTeam,

	ID_CameraSet,
	ID_CameraView,
	ID_CameraClear,

	ID_PlayerName = 100,
	ID_Civilization,
	ID_AI,
	ID_Team
};

class PlayerNotebookPage : public wxPanel
{
	DECLARE_DYNAMIC_CLASS(PlayerNotebookPage);
public:
	PlayerNotebookPage()
	{
	}

	void Init(const wxString& name, size_t playerID)
	{
		m_PlayerID = playerID;
		m_Name = name;
	}

	wxTextCtrl* GetNameCtrl()
	{
		return wxDynamicCast(FindWindow(ID_PlayerName), wxTextCtrl);
	}

	wxChoice* GetCivilizationCtrl()
	{
		return wxDynamicCast(FindWindow(ID_Civilization), wxChoice);
	}

	wxColourPickerCtrl* GetColorPickerCtrl()
	{
		return wxDynamicCast(FindWindow(ID_PlayerColor), wxColourPickerCtrl);
	}

	wxChoice* GetAICtrl()
	{
		return wxDynamicCast(FindWindow(ID_AI), wxChoice);
	}

	wxSpinCtrl* GetFoodCtrl()
	{
		return wxDynamicCast(FindWindow(ID_PlayerFood), wxSpinCtrl);
	}

	wxSpinCtrl* GetWoodCtrl()
	{
		return wxDynamicCast(FindWindow(ID_PlayerWood), wxSpinCtrl);
	}

	wxSpinCtrl* GetMetalCtrl()
	{
		return wxDynamicCast(FindWindow(ID_PlayerMetal), wxSpinCtrl);
	}

	wxSpinCtrl* GetStoneCtrl()
	{
		return wxDynamicCast(FindWindow(ID_PlayerStone), wxSpinCtrl);
	}

	wxSpinCtrl* GetPopulationCtrl()
	{
		return wxDynamicCast(FindWindow(ID_PlayerFood), wxSpinCtrl);
	}

	wxChoice* GetTeamCtrl()
	{
		return wxDynamicCast(FindWindow(ID_Team), wxChoice);
	}

	wxString GetPlayerName()
	{
		return m_Name;
	}

	size_t GetPlayerID()
	{
		return m_PlayerID;
	}

	bool IsCameraDefined()
	{
		return m_CameraDefined;
	}

	sCameraInfo GetCamera()
	{
		return m_Camera;
	}

	void SetCamera(sCameraInfo info, bool isDefined = true)
	{
		m_Camera = info;
		m_CameraDefined = isDefined;

		// Enable/disable controls
		wxDynamicCast(FindWindow(ID_CameraView), wxButton)->Enable(isDefined);
		wxDynamicCast(FindWindow(ID_CameraClear), wxButton)->Enable(isDefined);
	}

private:
	void OnCameraSet(wxCommandEvent& evt)
	{
		AtlasMessage::qGetView qryView;
		qryView.Post();
		SetCamera(qryView.info, true);

		// Pass event on to next handler
		evt.Skip();
	}

	void OnCameraView(wxCommandEvent& WXUNUSED(evt))
	{
		POST_MESSAGE(SetView, (m_Camera));
	}

	void OnCameraClear(wxCommandEvent& evt)
	{
		SetCamera(sCameraInfo(), false);

		// Pass event on to next handler
		evt.Skip();
	}

	void OnCheckChanged(wxCommandEvent& evt)
	{
		if (evt.GetId() == ID_DefaultName)
			this->GetNameCtrl()->Enable(evt.IsChecked());
		else if (evt.GetId() == ID_DefaultCiv)
			this->GetCivilizationCtrl()->Enable(evt.IsChecked());
		else if (evt.GetId() == ID_DefaultColor)
			this->GetColorPickerCtrl()->Enable(evt.IsChecked());
		else if (evt.GetId() == ID_DefaultAI)
			this->GetAICtrl()->Enable(evt.IsChecked());
		else if (evt.GetId() == ID_DefaultFood)
			this->GetFoodCtrl()->Enable(evt.IsChecked());
		else if (evt.GetId() == ID_DefaultWood)
			this->GetWoodCtrl()->Enable(evt.IsChecked());
		else if (evt.GetId() == ID_DefaultMetal)
			this->GetMetalCtrl()->Enable(evt.IsChecked());
		else if (evt.GetId() == ID_DefaultStone)
			this->GetStoneCtrl()->Enable(evt.IsChecked());
		else if (evt.GetId() == ID_DefaultPop)
			this->GetPopulationCtrl()->Enable(evt.IsChecked());
		else if (evt.GetId() == ID_DefaultTeam)
			this->GetTeamCtrl()->Enable(evt.IsChecked());

		evt.Skip();
	}

	sCameraInfo m_Camera;
	bool m_CameraDefined;
	wxString m_Name;
	size_t m_PlayerID;

	DECLARE_EVENT_TABLE();
};

IMPLEMENT_DYNAMIC_CLASS(PlayerNotebookPage, wxPanel);
BEGIN_EVENT_TABLE(PlayerNotebookPage, wxPanel)
	EVT_BUTTON(ID_CameraSet, PlayerNotebookPage::OnCameraSet)
	EVT_BUTTON(ID_CameraView, PlayerNotebookPage::OnCameraView)
	EVT_BUTTON(ID_CameraClear, PlayerNotebookPage::OnCameraClear)
	EVT_CHECKBOX(wxID_ANY, PlayerNotebookPage::OnCheckChanged)
END_EVENT_TABLE();

//////////////////////////////////////////////////////////////////////////

class PlayerNotebook : public wxChoicebook
{
public:
	PlayerNotebook(wxWindow* parent)
		:wxChoicebook(parent, wxID_ANY)
	{
	}

	PlayerNotebookPage* AddPlayer(wxString name, size_t player)
	{
		PlayerNotebookPage* playerPage = wxDynamicCast(wxXmlResource::Get()->LoadPanel(this, "PlayerPanel"),PlayerNotebookPage);
		playerPage->Init(name, player);
		AddPage(playerPage, name);
		m_Pages.push_back(playerPage);
		return playerPage;
	}

	void ResizePlayers(size_t numPlayers)
	{
		wxASSERT(numPlayers <= m_Pages.size());

		// We don't really want to destroy the windows corresponding
		//	to the tabs, so we've kept them in a vector and will
		//	only remove and add them to the notebook as needed
		int selection = GetSelection();
		size_t pageCount = GetPageCount();

		if (numPlayers > pageCount)
		{
			// Add previously removed pages
			for (size_t i = pageCount; i < numPlayers; ++i)
			{
				AddPage(m_Pages[i], m_Pages[i]->GetPlayerName());
			}
		}
		else
		{
			// Remove previously added pages
			// we have to manually hide them or they remain visible
			for (size_t i = pageCount - 1; i >= numPlayers; --i)
			{
				m_Pages[i]->Hide();
				RemovePage(i);
			}
		}

		// Workaround for bug on wxGTK 2.8: wxChoice selection doesn't update
		//	(in fact it loses its selection when adding/removing pages)
		GetChoiceCtrl()->SetSelection(selection);
	}
private:
	std::vector<PlayerNotebookPage*> m_Pages;
};

//////////////////////////////////////////////////////////////////////////

IMPLEMENT_DYNAMIC_CLASS(PlayerSettingsControl, wxPanel)
BEGIN_EVENT_TABLE(PlayerSettingsControl, wxPanel)
	EVT_COLOURPICKER_CHANGED(ID_PlayerColor, PlayerSettingsControl::OnPlayerColour)
	EVT_BUTTON(ID_CameraSet, PlayerSettingsControl::OnEdit)
	EVT_BUTTON(ID_CameraClear, PlayerSettingsControl::OnEdit)
	EVT_CHECKBOX(wxID_ANY, PlayerSettingsControl::OnEdit)
	EVT_CHOICE(wxID_ANY, PlayerSettingsControl::OnEdit)
	EVT_TEXT(ID_NumPlayers, PlayerSettingsControl::OnNumPlayersText)
	EVT_TEXT(wxID_ANY, PlayerSettingsControl::OnEdit)
	EVT_SPINCTRL(ID_NumPlayers, PlayerSettingsControl::OnNumPlayersSpin)
	EVT_SPINCTRL(ID_PlayerFood, PlayerSettingsControl::OnEditSpin)
	EVT_SPINCTRL(ID_PlayerWood, PlayerSettingsControl::OnEditSpin)
	EVT_SPINCTRL(ID_PlayerMetal, PlayerSettingsControl::OnEditSpin)
	EVT_SPINCTRL(ID_PlayerStone, PlayerSettingsControl::OnEditSpin)
	EVT_SPINCTRL(ID_PlayerPop, PlayerSettingsControl::OnEditSpin)
END_EVENT_TABLE();

PlayerSettingsControl::PlayerSettingsControl()
 : m_InGUIUpdate(false), m_NumPlayers(0)
{
}

void PlayerSettingsControl::OnNumPlayersSpin(wxSpinEvent& evt)
{
	if (!m_InGUIUpdate)
	{
		wxASSERT(evt.GetInt() > 0);

		// When wxMessageBox pops up, wxSpinCtrl loses focus, which
		//	forces another EVT_SPINCTRL event, which we don't want
		//	to handle, so we check here for a change
		if (evt.GetInt() == (int)m_NumPlayers)
		{
			return;	// No change
		}

		size_t oldNumPlayers = m_NumPlayers;
		m_NumPlayers = evt.GetInt();

		if (m_NumPlayers < oldNumPlayers)
		{
			// Remove players, but check if they own any entities
			bool notified = false;
			for (size_t i = oldNumPlayers; i > m_NumPlayers; --i)
			{
				qGetPlayerObjects objectsQry(i);
				objectsQry.Post();

				std::vector<AtlasMessage::ObjectID> ids = *objectsQry.ids;

				if (ids.size() > 0)
				{
					if (!notified)
					{
						// TODO: Add option to reassign objects?
						if (wxMessageBox(_("WARNING: All objects belonging to the removed players will be deleted. Continue anyway?"), _("Remove player confirmation"), wxICON_EXCLAMATION | wxYES_NO) != wxYES)
						{
							// Restore previous player count
							m_NumPlayers = oldNumPlayers;
							wxDynamicCast(FindWindow(ID_NumPlayers), wxSpinCtrl)->SetValue(m_NumPlayers);
							return;
						}

						notified = true;
					}

					// Delete objects
					// TODO: Merge multiple commands?
					POST_COMMAND(DeleteObjects, (ids));
				}
			}
		}

		m_Players->ResizePlayers(m_NumPlayers);
		SendToEngine();

		// Reload players, notify observers
		POST_MESSAGE(LoadPlayerSettings, (true));
	}
}

void PlayerSettingsControl::Init(ScenarioEditor* scenarioEditor)
{
	m_ScenarioEditor = scenarioEditor;
	wxSizer* sizer = this->GetSizer();

	m_Players = new PlayerNotebook(this);
	sizer->AddSpacer(15);
	sizer->Add(m_Players, wxSizerFlags().Expand().Proportion(1));

	LoadDefaults();
	CreateWidgets();
	ReadFromEngine();
}

void PlayerSettingsControl::CreateWidgets()
{
	// To prevent recursion, don't handle GUI events right now
	m_InGUIUpdate = true;

	// Load default civ and player data
	wxArrayString civNames;
	wxArrayString civCodes;
	AtlasMessage::qGetCivData qryCiv;
	qryCiv.Post();
	std::vector<std::string> civData = *qryCiv.data;
	for (size_t i = 0; i < civData.size(); ++i)
	{
		AtObj civ = AtlasObject::LoadFromJSON(civData[i]);
		civNames.Add(wxString(civ["Name"]));
		civCodes.Add(wxString(civ["Code"]));
	}

	// Load AI data
	ArrayOfAIData ais(AIData::CompareAIData);
	AtlasMessage::qGetAIData qryAI;
	qryAI.Post();
	AtObj aiData = AtlasObject::LoadFromJSON(*qryAI.data);
	for (AtIter a = aiData["AIData"]["item"]; a.defined(); ++a)
	{
		ais.Add(new AIData(wxString(a["id"]), wxString(a["data"]["name"])));
	}

	// Create player pages
	AtIter playerDefs = m_PlayerDefaults["item"];
	if (playerDefs.defined())
		++playerDefs;	// Skip gaia

	for (size_t i = 0; i < MAX_NUM_PLAYERS; ++i)
	{
		// Create new player tab and get controls
		wxString name(_("Unknown"));
		if (playerDefs["Name"].defined())
			name = playerDefs["Name"];

		PlayerNotebookPage* controls = m_Players->AddPlayer(name, i);
		m_PlayerControls.push_back(controls);

		// Populate civ choice box
		wxChoice* civChoice = controls->GetCivilizationCtrl();
		for (size_t j = 0; j < civNames.Count(); ++j)
			civChoice->Append(civNames[j], new wxStringClientData(civCodes[j]));
		civChoice->SetSelection(0);

		// Populate ai choice box
		wxChoice* aiChoice = controls->GetAICtrl();
		aiChoice->Append(_("<None>"), new wxStringClientData());
		for (size_t j = 0; j < ais.Count(); ++j)
			aiChoice->Append(ais[j]->GetName(), new wxStringClientData(ais[j]->GetID()));
		aiChoice->SetSelection(0);

		// Only increment AtIters if they are defined
		if (playerDefs.defined())
			++playerDefs;
	}

	m_InGUIUpdate = false;
}

void PlayerSettingsControl::LoadDefaults()
{
	AtlasMessage::qGetPlayerDefaults qryPlayers;
	qryPlayers.Post();
	AtObj playerData = AtlasObject::LoadFromJSON(*qryPlayers.defaults);
	m_PlayerDefaults = *playerData["PlayerData"];
}

void PlayerSettingsControl::ReadFromEngine()
{
	m_ScenarioEditor->RefreshMapSettings();

	AtIter player = (m_ScenarioEditor->GetMapSettings())["PlayerData"]["item"];
	if (!m_ScenarioEditor->GetMapSettings().defined() || !player.defined() || player.count() == 0)
	{
		// Player data missing - set number of players to max
		m_NumPlayers = MAX_NUM_PLAYERS;
	}
	else
	{
		++player; // skip gaia
		m_NumPlayers = player.count();
	}

	wxASSERT(m_NumPlayers <= MAX_NUM_PLAYERS && m_NumPlayers != 0);

	// To prevent recursion, don't handle GUI events right now
	m_InGUIUpdate = true;

	wxDynamicCast(FindWindow(ID_NumPlayers), wxSpinCtrl)->SetValue(m_NumPlayers);

	// Remove / add extra player pages as needed
	m_Players->ResizePlayers(m_NumPlayers);

	// Update player controls with player data
	AtIter playerDefs = m_PlayerDefaults["item"];
	if (playerDefs.defined())
		++playerDefs;	// skip gaia

	#define EmitDefineCheckbox(id)\
	do {\
		wxCommandEvent evid(wxEVT_CHECKBOX, id); \
		wxCheckBox* optionid = wxDynamicCast(FindWindowById(id, controls), wxCheckBox); \
		evid.SetInt(defined); \
		optionid->SetValue(defined); \
		optionid->GetEventHandler()->ProcessEvent(evid);\
	} while(false)

	for (size_t i = 0; i < MAX_NUM_PLAYERS; ++i)
	{
		PlayerNotebookPage* controls = m_PlayerControls[i];

		// name
		wxString name(_("Unknown"));
		bool defined = player["Name"].defined();
		if (defined)
			name = wxString(player["Name"]);
		else if (playerDefs["Name"].defined())
			name = wxString(playerDefs["Name"]);

		controls->GetNameCtrl()->SetValue(name);
		EmitDefineCheckbox(ID_DefaultName);

		// civ
		wxChoice* choice = controls->GetCivilizationCtrl();
		wxString civCode;
		defined = player["Civ"].defined();
		if (defined)
			civCode = wxString(player["Civ"]);
		else
			civCode = wxString(playerDefs["Civ"]);

		for (size_t j = 0; j < choice->GetCount(); ++j)
		{
			wxStringClientData* str = dynamic_cast<wxStringClientData*>(choice->GetClientObject(j));
			if (str->GetData() != civCode) continue;

			choice->SetSelection(j);
			break;
		}
		EmitDefineCheckbox(ID_DefaultCiv);

		// color
		wxColor color;
		AtObj clrObj = *player["Color"];
		defined = clrObj.defined();
		if (!defined)
			clrObj = *playerDefs["Colur"];
		color = wxColor((*clrObj["r"]).getInt(), (*clrObj["g"]).getInt(), (*clrObj["b"]).getInt());
		controls->GetColorPickerCtrl()->SetColour(color);
		EmitDefineCheckbox(ID_DefaultColor);

		// player type
		wxString aiID;
		defined = player["AI"].defined();
		if (defined)
			aiID = wxString(player["AI"]);
		else
			aiID = wxString(playerDefs["AI"]);

		choice = controls->GetAICtrl();
		if (!aiID.empty())
		{
			// AI
			for (size_t j = 0; j < choice->GetCount(); ++j)
			{
				wxStringClientData* str = dynamic_cast<wxStringClientData*>(choice->GetClientObject(j));
				if (str->GetData() != aiID) continue;

				choice->SetSelection(j);
				break;
			}
		}
		else // Human
			choice->SetSelection(0);
		EmitDefineCheckbox(ID_DefaultAI);

		// resources
		AtObj resObj = *player["Resources"];
		defined = resObj.defined() && resObj["food"].defined();
		if (defined)
			controls->GetFoodCtrl()->SetValue(wxString(resObj["food"]));
		else
			controls->GetFoodCtrl()->SetValue(0);
		EmitDefineCheckbox(ID_DefaultFood);

		defined = resObj.defined() && resObj["wood"].defined();
		if (defined)
			controls->GetWoodCtrl()->SetValue(wxString(resObj["wood"]));
		else
			controls->GetWoodCtrl()->SetValue(0);
		EmitDefineCheckbox(ID_DefaultWood);

		defined = resObj.defined() && resObj["metal"].defined();
		if (defined)
			controls->GetMetalCtrl()->SetValue(wxString(resObj["metal"]));
		else
			controls->GetMetalCtrl()->SetValue(0);
		EmitDefineCheckbox(ID_DefaultMetal);

		defined = resObj.defined() && resObj["stone"].defined();
		if (defined)
			controls->GetStoneCtrl()->SetValue(wxString(resObj["stone"]));
		else
			controls->GetStoneCtrl()->SetValue(0);
		EmitDefineCheckbox(ID_DefaultStone);

		// population limit
		defined = player["PopulationLimit"].defined();
		if (defined)
			controls->GetPopulationCtrl()->SetValue(wxString(player["PopulationLimit"]));
		else
			controls->GetPopulationCtrl()->SetValue(0);
		EmitDefineCheckbox(ID_DefaultPop);

		// team
		defined = player["Team"].defined();
		if (defined)
			controls->GetTeamCtrl()->SetSelection((*player["Team"]).getInt() + 1);
		else
			controls->GetTeamCtrl()->SetSelection(0);
		EmitDefineCheckbox(ID_DefaultTeam);

		// camera
		if (player["StartingCamera"].defined())
		{
			sCameraInfo info;
			// Don't use wxAtof because it depends on locales which
			//	may cause problems with decimal points
			//	see: http://www.wxwidgets.org/docs/faqgtk.htm#locale
			AtObj camPos = *player["StartingCamera"]["Position"];
			info.pX = (float)(*camPos["x"]).getDouble();
			info.pY = (float)(*camPos["y"]).getDouble();
			info.pZ = (float)(*camPos["z"]).getDouble();
			AtObj camRot = *player["StartingCamera"]["Rotation"];
			info.rX = (float)(*camRot["x"]).getDouble();
			info.rY = (float)(*camRot["y"]).getDouble();
			info.rZ = (float)(*camRot["z"]).getDouble();

			controls->SetCamera(info, true);
		}
		else
			controls->SetCamera(sCameraInfo(), false);

		// Only increment AtIters if they are defined
		if (player.defined())
			++player;
		if (playerDefs.defined())
			++playerDefs;
	}

	#undef EmitDefineCheckbox
	SendToEngine();
	m_ScenarioEditor->GetCommandProc().ClearCommands();

	m_InGUIUpdate = false;
}

AtObj PlayerSettingsControl::UpdateSettingsObject()
{
	// Update player data in the map settings
	AtObj players;
	players.set("@array", L"");

	wxASSERT(m_NumPlayers <= MAX_NUM_PLAYERS);

	for (size_t i = 0; i < m_NumPlayers; ++i)
	{
		PlayerNotebookPage* controls = m_PlayerControls[i];

		AtObj player;

		// name
		wxTextCtrl* text = controls->GetNameCtrl();
		if (text->IsEnabled())
			player.set("Name", text->GetValue());

		// civ
		wxChoice* choice = controls->GetCivilizationCtrl();
		if (choice->IsEnabled() && choice->GetSelection() >= 0)
		{
			wxStringClientData* str = dynamic_cast<wxStringClientData*>(choice->GetClientObject(choice->GetSelection()));
			player.set("Civ", str->GetData());
		}

		// color
		if (controls->GetColorPickerCtrl()->IsEnabled())
		{
			wxColour color = controls->GetColorPickerCtrl()->GetColour();
			AtObj clrObj;
			clrObj.setInt("r", (int)color.Red());
			clrObj.setInt("g", (int)color.Green());
			clrObj.setInt("b", (int)color.Blue());
			player.set("Color", clrObj);
		}

		// player type
		choice = controls->GetAICtrl();
		if (choice->IsEnabled())
		{
			if (choice->GetSelection() > 0)
			{
				// ai - get id
				wxStringClientData* str = dynamic_cast<wxStringClientData*>(choice->GetClientObject(choice->GetSelection()));
				player.set("AI", str->GetData());
			}
			else // human
				player.set("AI", _T(""));
		}

		// resources
		AtObj resObj;
		if (controls->GetFoodCtrl()->IsEnabled())
			resObj.setInt("food", controls->GetFoodCtrl()->GetValue());
		if (controls->GetWoodCtrl()->IsEnabled())
			resObj.setInt("wood", controls->GetWoodCtrl()->GetValue());
		if (controls->GetMetalCtrl()->IsEnabled())
			resObj.setInt("metal", controls->GetMetalCtrl()->GetValue());
		if (controls->GetStoneCtrl()->IsEnabled())
			resObj.setInt("stone", controls->GetStoneCtrl()->GetValue());
		if (resObj.defined())
			player.set("Resources", resObj);

		// population limit
		if (controls->GetPopulationCtrl()->IsEnabled())
			player.setInt("PopulationLimit", controls->GetPopulationCtrl()->GetValue());

		// team
		choice = controls->GetTeamCtrl();
		if (choice->IsEnabled() && choice->GetSelection() >= 0)
			player.setInt("Team", choice->GetSelection() - 1);

		// camera
		AtObj camObj;
		if (controls->IsCameraDefined())
		{
			sCameraInfo cam = controls->GetCamera();
			AtObj camPos;
			camPos.setDouble("x", cam.pX);
			camPos.setDouble("y", cam.pY);
			camPos.setDouble("z", cam.pZ);
			camObj.set("Position", camPos);

			AtObj camRot;
			camRot.setDouble("x", cam.rX);
			camRot.setDouble("y", cam.rY);
			camRot.setDouble("z", cam.rZ);
			camObj.set("Rotation", camRot);
		}
		player.set("StartingCamera", camObj);

		players.add("item", player);
	}

	m_ScenarioEditor->GetMapSettings().set("PlayerData", players);

	return m_ScenarioEditor->GetMapSettings();
}

void PlayerSettingsControl::SendToEngine()
{
	UpdateSettingsObject();

	std::string json = AtlasObject::SaveToJSON(m_ScenarioEditor->GetMapSettings());

	// TODO: would be nice if we supported undo for settings changes

	POST_COMMAND(SetMapSettings, (json));
	m_ScenarioEditor->GetMapSettings().NotifyObservers();
}