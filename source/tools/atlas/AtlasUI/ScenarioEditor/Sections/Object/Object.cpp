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

#include "Object.h"

#include "General/Datafile.h"
#include "ScenarioEditor/ScenarioEditor.h"
#include "ScenarioEditor/Tools/Common/ObjectSettings.h"
#include "ScenarioEditor/Tools/Common/MiscState.h"

#include "GameInterface/Messages.h"

#include <wx/busyinfo.h>
#include <wx/xrc/xmlres.h>
#include <wx/tglbtn.h>

enum
{
	ID_ObjectType = 1,
	ID_ObjectFilter,
	ID_PlayerSelect,
	ID_SelectObject,
	ID_ToggleViewer,
	ID_ViewerWireframe,
	ID_ViewerMove,
	ID_ViewerGround,
	ID_ViewerWater,
	ID_ViewerShadows,
	ID_ViewerPolyCount,
	ID_ViewerBoundingBox,
	ID_ViewerAxesMarker,
	ID_ViewerPropPoints,
	ID_ViewerAnimation,
	ID_ViewerPlay,
	ID_ViewerPause,
	ID_ViewerSlow,
	ID_IncludeContent = 100,
	ID_TotalCountLabel,
	ID_DisplayTemplateCtrl,
	ID_PlayerOwner,
	ID_VariationsContainer
};


IMPLEMENT_DYNAMIC_CLASS(ObjectSidebar, wxPanel)
BEGIN_EVENT_TABLE(ObjectSidebar, wxPanel)
	EVT_CHOICE(ID_ObjectType, ObjectSidebar::OnSelectType)
	EVT_TEXT(ID_ObjectFilter, ObjectSidebar::OnSelectFilter)
	EVT_DATAVIEW_SELECTION_CHANGED(ID_SelectObject, ObjectSidebar::OnSelectObject)
END_EVENT_TABLE();

ObjectSidebar::ObjectSidebar()
	:m_ScenarioEditor(NULL), m_ObjectList(NULL)
{
}

void ObjectSidebar::Init(ScenarioEditor *scenarioEditor)
{
	m_ScenarioEditor = scenarioEditor;

	//Load TreeView Here
	m_ObjectList = new wxDataViewTreeCtrl(this, ID_SelectObject);
	wxXmlResource::Get()->AttachUnknownControl(wxString::Format(wxT("%i"),ID_SelectObject), m_ObjectList);

	// Display first group of objects
	FilterObjects();
}

void ObjectSidebar::FilterObjects()
{
	int filterType = wxDynamicCast(FindWindow(ID_ObjectType), wxChoice)->GetSelection();
	wxString filterName = wxDynamicCast(FindWindow(ID_ObjectFilter), wxTextCtrl)->GetValue();
	bool includeContent = wxDynamicCast(FindWindow(ID_IncludeContent), wxCheckBox)->GetValue();

	// Get the list of objects from the game
	AtlasMessage::qGetObjectsList qry(filterType, (std::wstring)filterName.wx_str(), includeContent);
	qry.Post();
	std::vector<AtlasMessage::sObjectsListItem> objects = *qry.objects;

	m_ObjectList->Freeze();
	m_ObjectList->DeleteAllItems();

	wxDataViewItem root = m_ObjectList->AppendContainer(wxDataViewItem(0), "0AD");

	for (const AtlasMessage::sObjectsListItem& it : objects)
	{
		wxString id = it.id.c_str();
		wxString name = it.name.c_str();
		m_ObjectList->AppendItem(root, name, -1, new wxStringClientData(id));
	}

	m_ObjectList->Expand(root);
	m_ObjectList->Thaw();

	wxDynamicCast(FindWindow(ID_TotalCountLabel), wxStaticText)->SetLabel(wxString::Format(wxT("%i"), (int)objects.size()));

	objects.clear();
}

void ObjectSidebar::OnSelectType(wxCommandEvent& WXUNUSED(evt))
{
	FilterObjects();
}

void ObjectSidebar::OnSelectObject(wxDataViewEvent& evt)
{
	if (evt.GetInt() < 0)
		return;

	wxDataViewTreeStoreNode* data = static_cast<wxDataViewTreeStoreNode*>(evt.GetItem().GetID());
	if (data == NULL || dynamic_cast<wxDataViewTreeStoreContainerNode*>(data))
		return;

	g_SelectedObject = static_cast<wxStringClientData*>(data->GetData())->GetData();
	g_SelectedObject.NotifyObservers();

	if (m_ScenarioEditor->GetToolManager().GetCurrentToolName() != "ActorViewerTool")
		m_ScenarioEditor->GetToolManager().SetCurrentTool(_T("PlaceObject"), &g_SelectedObject);
}

void ObjectSidebar::OnSelectFilter(wxCommandEvent& WXUNUSED(evt))
{
	FilterObjects();
}

//////////////////////////////////////////////////////////////////////////
IMPLEMENT_DYNAMIC_CLASS(DisplayTemplate, wxPanel)

DisplayTemplate::DisplayTemplate()
	:m_TemplateNames(NULL)
{
}

void DisplayTemplate::Init(ScenarioEditor* WXUNUSED(scenarioEditor))
{
	m_TemplateNames = wxDynamicCast(FindWindow(ID_DisplayTemplateCtrl), wxScrolledWindow);
	g_SelectedObjects.RegisterObserver(0, &DisplayTemplate::OnSelectedObjectsChange, this);

	if (!g_SelectedObjects.empty())
		OnSelectedObjectsChange(g_SelectedObjects);
}

static wxControl* CreateTemplateNameObject(wxWindow* parent, const std::string templateName, int counterTemplate)
{
	wxString idTemplate(wxString::FromUTF8(templateName.c_str()));
	if (counterTemplate > 1)
		idTemplate.Append(wxString::Format(wxT(" (%i)"), counterTemplate));

	wxStaticText* templateNameObject = new wxStaticText(parent, wxID_ANY, idTemplate);
	return templateNameObject;
}

void DisplayTemplate::OnSelectedObjectsChange(const std::vector<AtlasMessage::ObjectID>& selectedObjects)
{
	Freeze();
	wxSizer* sizer = m_TemplateNames->GetSizer();
	sizer->Clear(true);

	AtlasMessage::qGetSelectedObjectsTemplateNames objectTemplatesName(selectedObjects);
	objectTemplatesName.Post();
	std::vector<std::string> names = *objectTemplatesName.names;

	int counterTemplate = 0;
	std::string lastTemplateName = "";
	for (const std::string& name : names)
	{
		if (lastTemplateName == "")
			lastTemplateName = name;

		if (lastTemplateName == name)
		{
			++counterTemplate;
			return;
		}

		sizer->Add(CreateTemplateNameObject(m_TemplateNames, lastTemplateName, counterTemplate), wxSizerFlags().Align(wxALIGN_LEFT));

		lastTemplateName = name;
		counterTemplate = 1;
	}

	// Add the remaining template
	sizer->Add(CreateTemplateNameObject(m_TemplateNames, lastTemplateName, counterTemplate), wxSizerFlags().Align(wxALIGN_LEFT));

	Thaw();
	sizer->FitInside(m_TemplateNames);
}

//////////////////////////////////////////////////////////////////////////
IMPLEMENT_DYNAMIC_CLASS(EntitySettings, wxPanel)
BEGIN_EVENT_TABLE(EntitySettings, wxPanel)
	EVT_CHOICE(ID_PlayerOwner, EntitySettings::OnSelectOwner)
	EVT_CHOICE(wxID_ANY, EntitySettings::OnVariationSelect)
END_EVENT_TABLE();

EntitySettings::EntitySettings()
	:m_ScenarioEditor(NULL), m_PlayerOwner(NULL), m_VariationsContainer(NULL), m_Players(NULL)
{
}

void EntitySettings::Init(ScenarioEditor *scenarioEditor)
{
	m_ScenarioEditor = scenarioEditor;
	m_PlayerOwner = wxDynamicCast(FindWindow(ID_PlayerOwner), wxChoice);
	m_VariationsContainer = wxDynamicCast(FindWindow(ID_VariationsContainer), wxScrolledWindow);

	// Get player names
	m_Players = new wxArrayString();
	AtlasMessage::qGetPlayerDefaults qryPlayers;
	qryPlayers.Post();
	AtObj playerData = AtlasObject::LoadFromJSON(*qryPlayers.defaults);
	AtObj playerDefs = *playerData["PlayerData"];
	for (AtIter p = playerDefs["item"]; p.defined(); ++p)
		m_Players->Add(wxString(p["Name"]));

	m_PlayerOwner->Append(*m_Players);
	m_ObjectConn = m_ScenarioEditor->GetObjectSettings().RegisterObserver(0, &EntitySettings::OnObjectSettingsChange, this);

	m_ScenarioEditor->GetMapSettings().RegisterObserver(0, &EntitySettings::OnMapSettingsChange, this);
	OnMapSettingsChange(m_ScenarioEditor->GetMapSettings());

	g_SelectedObjects.RegisterObserver(0, &EntitySettings::OnSelectedObjectsChange, this);
}

void EntitySettings::OnMapSettingsChange(const AtObj& settings)
{
	m_PlayerOwner->Freeze();
	m_PlayerOwner->Clear();

	size_t numPlayers = settings["PlayerData"]["item"].count();
	int maxPlayer = std::min(numPlayers+1, m_Players->Count());
	for (size_t i = 0; i < maxPlayer; ++i)
		m_PlayerOwner->Append((*m_Players)[i]);

	OnObjectSettingsChange(m_ScenarioEditor->GetObjectSettings());
	m_PlayerOwner->Thaw();
}

void EntitySettings::OnObjectSettingsChange(const ObjectSettings& settings)
{
	m_PlayerOwner->SetSelection(((unsigned int)settings.GetPlayerID() < m_PlayerOwner->GetCount()) ? settings.GetPlayerID() : wxNOT_FOUND );

	//Load Variations
	m_VariationsContainer->Freeze();
	wxSizer* sizer = m_VariationsContainer->GetSizer();
	const std::vector<ObjectSettings::Group>& variation = settings.GetActorVariation();

	// Creating combo boxes seems to be pretty expensive - so we create as
	// few as possible, by never deleting any.
	size_t oldCount = m_Choices.size();
	size_t newCount = variation.size();

	// If we have too many combo boxes, hide the excess ones
	for (size_t i = newCount; i < oldCount; ++i)
		m_Choices[i]->Show(false);

	for (size_t i = 0; i < variation.size(); ++i)
	{
		const ObjectSettings::Group& group = variation[i];
		if (i >= oldCount)
		{
			// Create an initially empty combobox, because we can fill it
			// quicker than the default constructor can
			wxChoice* newChoice = new wxChoice(m_VariationsContainer, wxID_ANY);

			// Add box to sizer and list
			sizer->Add(newChoice, wxSizerFlags().Expand().Border(wxALL, 5));
			m_Choices.push_back(newChoice);
		}

		wxChoice* choice = m_Choices[i];
		choice->Freeze();
		choice->Clear();
		choice->Append(group.variants);
		choice->SetSelection(choice->FindString(group.chosen));
		choice->Show(true);
		choice->Thaw();
	}

	m_VariationsContainer->Layout();
	m_VariationsContainer->Thaw();
	m_VariationsContainer->FitInside();
	Layout();
}

void EntitySettings::OnSelectOwner(wxCommandEvent &evt)
{
	m_ScenarioEditor->GetObjectSettings().SetPlayerID(evt.GetSelection());
	m_ScenarioEditor->GetObjectSettings().NotifyObserversExcept(m_ObjectConn);
}

void EntitySettings::OnSelectedObjectsChange(const std::vector<AtlasMessage::ObjectID>& selectedObjects)
{
	if (!selectedObjects.empty())
		return;

	for (wxChoice* choice : m_Choices)
		choice->Show(false);
}

void EntitySettings::OnVariationSelect(wxCommandEvent& evt)
{
	std::set<wxString> selections;

	// It's possible for a variant name to appear in multiple groups.
	// If so, assume that all the names in each group are the same, so
	// we don't have to worry about some impossible combinations (e.g.
	// one group "a,b", a second "b,c", and a third "c,a", where's there's
	// no set of selections that matches one (and only one) of each group).
	//
	// So... When a combo box is changed from 'a' to 'b', add 'b' to the new
	// selections and make sure any other combo boxes containing both 'a' and
	// 'b' no longer contain 'a'.

	wxString newValue = evt.GetString();

	selections.insert(newValue);
	for (wxChoice* choice : m_Choices)
	{
		// If our newly selected value is used in another combobox, we want
		// that combobox to use the new value, so don't add its old value
		// to the list of selections
		if (choice->IsShown() && choice->FindString(newValue) == wxNOT_FOUND)
			selections.insert(choice->GetString(choice->GetSelection()));
	}

	m_ScenarioEditor->GetObjectSettings().SetActorSelections(selections);
	m_ScenarioEditor->GetObjectSettings().NotifyObserversExcept(m_ObjectConn);
}

//////////////////////////////////////////////////////////////////////////
IMPLEMENT_DYNAMIC_CLASS(ActorViewerPanel, wxPanel);
BEGIN_EVENT_TABLE(ActorViewerPanel, wxPanel)
	EVT_CHOICE(ID_ViewerPropPoints, ActorViewerPanel::OnPropPointChange)
	EVT_CHOICE(ID_ViewerAnimation, ActorViewerPanel::OnAnimationChange)
	EVT_TOGGLEBUTTON(wxID_ANY, ActorViewerPanel::OnToggleButton)
	EVT_BUTTON(wxID_ANY, ActorViewerPanel::OnSpeed)
END_EVENT_TABLE()

ActorViewerPanel::ActorViewerPanel()
{
}

void ActorViewerPanel::Init(ScenarioEditor* scenarioEditor)
{
	m_ScenarioEditor = scenarioEditor;
	m_ViewOptions[ID_ViewerWireframe] = L"wireframe";
	m_ViewOptions[ID_ViewerMove] = L"walk";
	m_ViewOptions[ID_ViewerGround] = L"ground";
	m_ViewOptions[ID_ViewerWater] = L"water";
	m_ViewOptions[ID_ViewerShadows] = L"shadows";
	m_ViewOptions[ID_ViewerPolyCount] = L"stats";
	m_ViewOptions[ID_ViewerBoundingBox] = L"bounding_box";
	m_ViewOptions[ID_ViewerAxesMarker] = L"axes_marker";

	// Initialise the game with the default settings
	for (const std::pair<int, std::wstring>& option : m_ViewOptions)
	{
		bool optionValue = wxDynamicCast(FindWindow(option.first), wxToggleButton)->GetValue();
		POST_MESSAGE(SetViewParamB, (AtlasMessage::eRenderView::ACTOR, option.second, optionValue));
	}

	POST_MESSAGE(SetViewParamI, (AtlasMessage::eRenderView::ACTOR, (std::wstring)L"prop_points", 0));

	if (g_SelectedObject == "")
		g_SelectedObject = "actor|structures/fndn_1x1.xml";

	m_ActorViewerAnimation = "idle";
	m_ActorViewerSpeed = 0.f;

	// TODO: this list should come from the actor
	wxArrayString animChoices;
	AtObj anims (Datafile::ReadList("animations"));
	for (AtIter a = anims["item"]; a.defined(); ++a)
	{
		animChoices.Add(wxString(*a));
	}
	wxChoice* animationList = wxDynamicCast(FindWindow(ID_ViewerAnimation), wxChoice);
	animationList->Append(animChoices);
	animationList->SetSelection(0);

	g_SelectedObject.RegisterObserver(0, &ActorViewerPanel::OnSelectedObjectChange, this);

	scenarioEditor->GetToolManager().GetCurrentTool().RegisterObserver(0, &ActorViewerPanel::OnToolChange, this);
}

void ActorViewerPanel::OnToggleButton(wxCommandEvent& evt)
{
	if (evt.GetId() == ID_ToggleViewer)
	{
		m_ScenarioEditor->GetToolManager().SetCurrentTool(evt.IsChecked() ? _T("ActorViewerTool") : _(""), NULL);

		PostToGame();
		return;
	}

	std::map<int, std::wstring>::const_iterator option = m_ViewOptions.find(evt.GetId());

	if (option != m_ViewOptions.end())
		POST_MESSAGE(SetViewParamB, (AtlasMessage::eRenderView::ACTOR, option->second, evt.IsChecked()));
}

void ActorViewerPanel::OnSpeed(wxCommandEvent& evt)
{
	switch (evt.GetId())
	{
		case ID_ViewerPlay: m_ActorViewerSpeed = 1.0f; break;
		case ID_ViewerPause: m_ActorViewerSpeed = 0.0f; break;
		case ID_ViewerSlow: m_ActorViewerSpeed = 0.1f; break;
	}
	PostToGame();
}


void ActorViewerPanel::OnToolChange(ITool* WXUNUSED(tool))
{
	wxString label = m_ScenarioEditor->GetToolManager().GetCurrentToolName() == "ActorViewerTool" ? _("Return to game view") : _("Switch to Actor Viewer");
	wxDynamicCast(FindWindow(ID_ToggleViewer), wxToggleButton)->SetLabel(label);
}

void ActorViewerPanel::OnSelectedObjectChange(const wxString& WXUNUSED(id))
{
	PostToGame();
}

void ActorViewerPanel::OnPropPointChange(wxCommandEvent& evt)
{
	POST_MESSAGE(SetViewParamI, (AtlasMessage::eRenderView::ACTOR, (std::wstring)L"prop_points", evt.GetSelection()));
}

void ActorViewerPanel::OnAnimationChange(wxCommandEvent& evt)
{
	m_ActorViewerAnimation = evt.GetString();
	PostToGame();
}

void ActorViewerPanel::PostToGame()
{
	if (m_ScenarioEditor->GetToolManager().GetCurrentToolName() != "ActorViewerTool")
		return;

	POST_MESSAGE(SetActorViewer, ((std::wstring)g_SelectedObject.wc_str(), (std::wstring)m_ActorViewerAnimation.wc_str(), m_ScenarioEditor->GetObjectSettings().GetPlayerID(), m_ActorViewerSpeed, false));
}
