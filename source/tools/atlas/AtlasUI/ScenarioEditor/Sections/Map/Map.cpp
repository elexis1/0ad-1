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
#include "Map.h"

#include "GameInterface/Messages.h"
#include "ScenarioEditor/ScenarioEditor.h"
#include "ScenarioEditor/Tools/Common/Tools.h"
#include "ScenarioEditor/Sections/Player/Player.h"

#include "wx/busyinfo.h"
#include "wx/filename.h"

enum
{
	ID_MapName = 1,
	ID_MapDescription,
	ID_MapReveal,
	ID_MapType,
	ID_MapPreview,
	ID_MapTeams,
	ID_MapKW_Demo,
	ID_MapKW_Naval,
	ID_RandomScript,
	ID_RandomSize,
	ID_RandomSeed,
	ID_RandomReseed,
	ID_OpenPlayerPanel,
	ID_TypeMap,
	ID_ChooseImage,
	ID_Image
};

// Helper class for storing AtObjs
class AtObjClientData : public wxClientData
{
public:
	AtObjClientData(const AtObj& obj) : obj(obj) {}
	virtual ~AtObjClientData() {}
	AtObj GetValue() { return obj; }
private:
	AtObj obj;
};

IMPLEMENT_DYNAMIC_CLASS(MapSettingsControl, wxPanel);

BEGIN_EVENT_TABLE(MapSettingsControl, wxPanel)
	EVT_TEXT(ID_MapName, MapSettingsControl::OnEdit)
	EVT_TEXT(ID_MapDescription, MapSettingsControl::OnEdit)
	EVT_TEXT(ID_MapPreview, MapSettingsControl::OnEdit)
	EVT_CHECKBOX(wxID_ANY, MapSettingsControl::OnEdit)
	EVT_CHOICE(wxID_ANY, MapSettingsControl::OnEdit)
END_EVENT_TABLE();

MapSettingsControl::MapSettingsControl()
{
}

void MapSettingsControl::Init(ScenarioEditor* scenarioEditor)
{
	m_ScenarioEditor = scenarioEditor;

	wxArrayString gameTypes;
	gameTypes.Add(_T("conquest"));
	gameTypes.Add(_T("conquest_structures"));
	gameTypes.Add(_T("conquest_units"));
	gameTypes.Add(_T("wonder"));
	gameTypes.Add(_T("endless"));

	wxDynamicCast(FindWindow(ID_MapType), wxChoice)->Append(gameTypes);
	ReadFromEngine();
}

void MapSettingsControl::ReadFromEngine()
{
	m_ScenarioEditor->RefreshMapSettings();
	Observable<AtObj>& mapSettings = m_ScenarioEditor->GetMapSettings();
	// map name
	wxDynamicCast(FindWindow(ID_MapName), wxTextCtrl)->ChangeValue(wxString(mapSettings["Name"]));

	// map description
	wxDynamicCast(FindWindow(ID_MapDescription), wxTextCtrl)->ChangeValue(wxString(mapSettings["Description"]));

	// map preview
	wxDynamicCast(FindWindow(ID_MapPreview), wxTextCtrl)->ChangeValue(wxString(mapSettings["Preview"]));

	// reveal map
	wxDynamicCast(FindWindow(ID_MapReveal), wxCheckBox)->SetValue(wxString(mapSettings["RevealMap"]) == L"true");

	// game type / victory conditions
	if (mapSettings["GameType"].defined())
		wxDynamicCast(FindWindow(ID_MapType), wxChoice)->SetStringSelection(wxString(mapSettings["GameType"]));
	else
		wxDynamicCast(FindWindow(ID_MapType), wxChoice)->SetSelection(0);

	// lock teams
	wxDynamicCast(FindWindow(ID_MapTeams), wxCheckBox)->SetValue(wxString(mapSettings["LockTeams"]) == L"true");

	// keywords
	{
		m_MapSettingsKeywords.clear();
		for (AtIter keyword = mapSettings["Keywords"]["item"]; keyword.defined(); ++keyword)
			m_MapSettingsKeywords.insert(std::wstring(keyword));

		wxDynamicCast(FindWindow(ID_MapKW_Demo), wxCheckBox)->SetValue(m_MapSettingsKeywords.count(L"demo") != 0);
		wxDynamicCast(FindWindow(ID_MapKW_Naval), wxCheckBox)->SetValue(m_MapSettingsKeywords.count(L"naval") != 0);
	}
}

void MapSettingsControl::SetMapSettings(const AtObj& obj)
{
	m_ScenarioEditor->GetMapSettings() = obj;
	m_ScenarioEditor->GetMapSettings().NotifyObservers();

	SendToEngine();
}

AtObj MapSettingsControl::UpdateSettingsObject()
{
	// map name
	m_ScenarioEditor->GetMapSettings().set("Name", wxDynamicCast(FindWindow(ID_MapName), wxTextCtrl)->GetValue());

	// map description
	m_ScenarioEditor->GetMapSettings().set("Description", wxDynamicCast(FindWindow(ID_MapDescription), wxTextCtrl)->GetValue());

	// map preview
	m_ScenarioEditor->GetMapSettings().set("Preview", wxDynamicCast(FindWindow(ID_MapPreview), wxTextCtrl)->GetValue());

	// reveal map
	m_ScenarioEditor->GetMapSettings().setBool("RevealMap", wxDynamicCast(FindWindow(ID_MapReveal), wxCheckBox)->GetValue());

	// game type / victory conditions
	m_ScenarioEditor->GetMapSettings().set("GameType", wxDynamicCast(FindWindow(ID_MapType), wxChoice)->GetStringSelection());

	// keywords
	{
		if (wxDynamicCast(FindWindow(ID_MapKW_Demo), wxCheckBox)->GetValue())
			m_MapSettingsKeywords.insert(L"demo");
		else
			m_MapSettingsKeywords.erase(L"demo");

		if (wxDynamicCast(FindWindow(ID_MapKW_Naval), wxCheckBox)->GetValue())
			m_MapSettingsKeywords.insert(L"naval");
		else
			m_MapSettingsKeywords.erase(L"naval");

		AtObj keywords;
		keywords.set("@array", L"");
		for (std::set<std::wstring>::iterator it = m_MapSettingsKeywords.begin(); it != m_MapSettingsKeywords.end(); ++it)
			keywords.add("item", it->c_str());
		m_ScenarioEditor->GetMapSettings().set("Keywords", keywords);
	}

	// teams locked
	m_ScenarioEditor->GetMapSettings().setBool("LockTeams", wxDynamicCast(FindWindow(ID_MapTeams), wxCheckBox)->GetValue());

	return m_ScenarioEditor->GetMapSettings();
}

void MapSettingsControl::SendToEngine()
{
	UpdateSettingsObject();

	std::string json = AtlasObject::SaveToJSON(m_ScenarioEditor->GetMapSettings());

	// TODO: would be nice if we supported undo for settings changes

	POST_COMMAND(SetMapSettings, (json));
}

IMPLEMENT_DYNAMIC_CLASS(NewMapConfiguration, wxPanel);

BEGIN_EVENT_TABLE(NewMapConfiguration, wxPanel)
	EVT_BUTTON(ID_RandomReseed, NewMapConfiguration::OnRandomReseed)
	EVT_BUTTON(wxID_APPLY, NewMapConfiguration::OnGenerate)
	EVT_BUTTON(ID_OpenPlayerPanel, NewMapConfiguration::OnOpenPlayerPanel)
	EVT_BUTTON(ID_ChooseImage, NewMapConfiguration::OnChooseImage)
	EVT_RADIOBOX(ID_TypeMap, NewMapConfiguration::OnTypeMap)
END_EVENT_TABLE();


NewMapConfiguration::NewMapConfiguration()
	: m_ScenarioEditor(NULL)
{
	m_Image.clear();
}

void NewMapConfiguration::Init(ScenarioEditor *scenarioEditor)
{
	m_ScenarioEditor = scenarioEditor;

	// Load the map sizes list
	AtlasMessage::qGetMapSizes qrySizes;
	qrySizes.Post();
	AtObj sizes = AtlasObject::LoadFromJSON(*qrySizes.sizes);
	wxChoice* sizeChoice = wxDynamicCast(FindWindow(ID_RandomSize), wxChoice);
	for (AtIter s = sizes["Data"]["item"]; s.defined(); ++s)
	{
		long tiles = 0;
		wxString(s["Tiles"]).ToLong(&tiles);
		sizeChoice->Append(wxString(s["Name"]), (void*)(intptr_t)tiles);
	}
	sizeChoice->SetSelection(0);

	// Load the RMS script list
	AtlasMessage::qGetRMSData qry;
	qry.Post();
	std::vector<std::string> scripts = *qry.data;
	wxChoice* scriptChoice = wxDynamicCast(FindWindow(ID_RandomScript), wxChoice);
	scriptChoice->Clear();
	for (size_t i = 0; i < scripts.size(); ++i)
	{
		AtObj data = AtlasObject::LoadFromJSON(scripts[i]);
		wxString name(data["settings"]["Name"]);
		scriptChoice->Append(name, new AtObjClientData(*data["settings"]));
	}
	scriptChoice->SetSelection(0);

	FindWindow(ID_OpenPlayerPanel)->Show(false);
	FindWindow(ID_ChooseImage)->GetParent()->Show(false);
	FindWindow(ID_RandomScript)->GetParent()->Show(false);
	FindWindow(ID_RandomScript)->GetParent()->Layout();

	// Load Player Configuration
	m_ScenarioEditor->GetPlayerSettingsCtrl();
}

void NewMapConfiguration::OnRandomReseed(wxCommandEvent& WXUNUSED(evt))
{
	// Pick a shortish randomish value
	wxString seed;
	seed << (int)floor((rand() / (float)RAND_MAX) * 10000.f);
	wxDynamicCast(FindWindow(ID_RandomSeed), wxTextCtrl)->SetValue(seed);
}

void NewMapConfiguration::OnGenerate(wxCommandEvent& WXUNUSED(evt))
{
	wxRadioBox* typeMap = dynamic_cast<wxRadioBox*>(FindWindow(ID_TypeMap));
	int selection = typeMap->GetSelection();

	if (selection == 2 && m_Image.empty())
	{
		wxMessageBox(_("Please select an image to apply"));
		return;
	}

	if ((selection == 0 && !(!m_ScenarioEditor->GetCommandProc().IsDirty() || wxMessageBox(_("Discard current map and start blank new map?"), _("New map"), wxOK|wxCANCEL|wxICON_QUESTION, this) == wxOK))
		|| (selection > 0 && m_ScenarioEditor->DiscardChangesDialog()))
	{
		if (m_OpenPlayerPanel)
			m_ScenarioEditor->UpdatePlayerPanel(false);
		m_ScenarioEditor->UpdateNewMapPanel(false);
		return;
	}

	wxChoice* scriptChoice = wxDynamicCast(FindWindow(ID_RandomScript), wxChoice);

	if (selection != 1)
	{
		for (size_t j = 0; j < scriptChoice->GetCount(); ++j)
		{
			wxString name = scriptChoice->GetString(j);
			if (name == "Blank")
			{
				scriptChoice->SetSelection(j);
				break;
			}
		}
	}

	if (scriptChoice->GetSelection() < 0)
		return;

	// TODO: this settings thing seems a bit of a mess,
	// since it's mixing data from three different sources

	AtObj settings = m_ScenarioEditor->GetPlayerSettingsCtrl()->UpdateSettingsObject();

	AtObj scriptSettings = dynamic_cast<AtObjClientData*>(scriptChoice->GetClientObject(scriptChoice->GetSelection()))->GetValue();

	settings.addOverlay(scriptSettings);

	wxChoice* sizeChoice = wxDynamicCast(FindWindow(ID_RandomSize), wxChoice);
	wxString size;
	size << (intptr_t)sizeChoice->GetClientData(sizeChoice->GetSelection());
	settings.setInt("Size", wxAtoi(size));

	settings.setInt("Seed", wxAtoi(wxDynamicCast(FindWindow(ID_RandomSeed), wxTextCtrl)->GetValue()));

	std::string json = AtlasObject::SaveToJSON(settings);

	if (m_OpenPlayerPanel)
		m_ScenarioEditor->UpdatePlayerPanel(false);
	m_ScenarioEditor->UpdateNewMapPanel(false);
	wxBusyInfo busy(_("Generating map"));
	wxBusyCursor busyc;

	wxString scriptName(settings["Script"]);

	// Copy the old map settings, so we don't lose them if the map generation fails
	AtObj oldSettings = settings;

	AtlasMessage::qGenerateMap qry((std::wstring)scriptName.wc_str(), json);
	qry.Post();

	if (qry.status < 0)
	{
		// Display error message and revert to old map settings
		wxLogError(_("Random map script '%ls' failed"), scriptName.wc_str());
		m_ScenarioEditor->GetMapSettings() = oldSettings;
		std::string oldJson = AtlasObject::SaveToJSON(oldSettings);
		POST_COMMAND(SetMapSettings, (oldJson));
		m_ScenarioEditor->GetMapSettings().NotifyObservers();
	}

	if (selection == 2) //Import HeighMap
		POST_MESSAGE(ImportHeightmap, (m_Image));

	m_ScenarioEditor->SetOpenFilename(_T(""));
	m_ScenarioEditor->NotifyOnMapReload();
	m_Image.clear();
	wxDynamicCast(FindWindow(ID_Image), wxStaticText)->SetLabel("");
	scriptChoice->SetSelection(0);
	sizeChoice->SetSelection(0);
}

void NewMapConfiguration::OnTypeMap(wxCommandEvent& evt)
{
	FindWindow(ID_ChooseImage)->GetParent()->Show(evt.GetSelection() == 2);
	FindWindow(ID_OpenPlayerPanel)->Show(evt.GetSelection() == 1);
	FindWindow(ID_RandomScript)->GetParent()->Show(evt.GetSelection() == 1);
	this->Layout();
}

void NewMapConfiguration::OnOpenPlayerPanel(wxCommandEvent& WXUNUSED(evt))
{
	m_ScenarioEditor->UpdatePlayerPanel(true);
	m_OpenPlayerPanel = true;
}

void NewMapConfiguration::OnChooseImage(wxCommandEvent& WXUNUSED(evt))
{
	wxFileDialog dlg (NULL, wxFileSelectorPromptStr,
					  _T(""), _T(""),
					  _T("Valid Image files|*.png;*.jpg;*.bmp|All files (*.*)|*.*"),
					  wxFD_OPEN);
	// Set default filter
	dlg.SetFilterIndex(0);
	m_Image.clear();
	if (dlg.ShowModal() != wxID_OK)
	{
		wxDynamicCast(FindWindow(ID_Image), wxStaticText)->SetLabel("");
		return;
	}
	
	m_Image = dlg.GetPath().wc_str();
	wxDynamicCast(FindWindow(ID_Image), wxStaticText)->SetLabel(dlg.GetPath());
}
