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

#include "wx/busyinfo.h"
#include "wx/xrc/xmlres.h"

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
	ID_ViewerAnimation,
	ID_ViewerBoundingBox,
	ID_ViewerAxesMarker,
	ID_ViewerPropPoints,
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

/*
class ObjectBottomBar : public wxPanel
{
public:
	ObjectBottomBar(
		wxWindow* parent,
		Observable<ObjectSettings>& objectSettings,
		Observable<AtObj>& mapSettings,
		ObjectSidebarImpl* p
	);

	void OnFirstDisplay();
	void ShowActorViewer(bool show);

private:
	void OnViewerSetting(wxCommandEvent& evt);
	void OnSelectAnim(wxCommandEvent& evt);
	void OnSpeed(wxCommandEvent& evt);

	bool m_ViewerWireframe;
	bool m_ViewerMove;
	bool m_ViewerGround;
	bool m_ViewerWater;
	bool m_ViewerShadows;
	bool m_ViewerPolyCount;
	bool m_ViewerBoundingBox;
	bool m_ViewerAxesMarker;
	int m_ViewerPropPointsMode; // 0 disabled, 1 for point markers, 2 for point markers + axes

	wxPanel* m_ViewerPanel;

	ObjectSidebarImpl* p;
	DECLARE_EVENT_TABLE();
};

struct ObjectSidebarImpl
{
	ObjectSidebarImpl(ScenarioEditor& scenarioEditor) :
		m_ObjectListBox(NULL), m_ActorViewerActive(false),
		m_ActorViewerEntity(_T("actor|structures/fndn_1x1.xml")),
		m_ActorViewerAnimation(_T("idle")), m_ActorViewerSpeed(0.f),
		m_ObjectSettings(scenarioEditor.GetObjectSettings())
	{
	}

	wxListBox* m_ObjectListBox;
	std::vector<AtlasMessage::sObjectsListItem> m_Objects;
	ObservableScopedConnection m_ToolConn;

	bool m_ActorViewerActive;
	wxString m_ActorViewerEntity;
	wxString m_ActorViewerAnimation;
	float m_ActorViewerSpeed;
	Observable<ObjectSettings>& m_ObjectSettings;

	void ActorViewerPostToGame()
	{
		POST_MESSAGE(SetActorViewer, ((std::wstring)m_ActorViewerEntity.wc_str(), (std::wstring)m_ActorViewerAnimation.wc_str(), m_ObjectSettings.GetPlayerID(), m_ActorViewerSpeed, false));
	}
};
*/

ObjectSidebar::ObjectSidebar()
	:m_ScenarioEditor(NULL), m_ObjectList(NULL)
{
}

void ObjectSidebar::Init(ScenarioEditor *scenarioEditor)
{
	m_ScenarioEditor = scenarioEditor;
	//wxBusyInfo busy (_("Loading list of objects"));

	//Load TreeView Here
	m_ObjectList = new wxDataViewTreeCtrl(this, ID_SelectObject);
	wxXmlResource::Get()->AttachUnknownControl(wxString::Format(wxT("%i"),ID_SelectObject), m_ObjectList);

	// Display first group of objects
	FilterObjects();
}

/*void ObjectSidebar::OnToolChange(ITool* tool)
{
	if (wxString(tool->GetClassInfo()->GetClassName()) == _T("ActorViewerTool"))
	{
		p->m_ActorViewerActive = true;
		p->ActorViewerPostToGame();
		wxDynamicCast(FindWindow(ID_ToggleViewer), wxButton)->SetLabel(_("Return to game view"));
	}
	else
	{
		p->m_ActorViewerActive = false;
		wxDynamicCast(FindWindow(ID_ToggleViewer), wxButton)->SetLabel(_("Switch to Actor Viewer"));
	}

	static_cast<ObjectBottomBar*>(m_BottomBar)->ShowActorViewer(p->m_ActorViewerActive);
}*/

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

/*void ObjectSidebar::OnToggleViewer(wxCommandEvent& WXUNUSED(evt))
{
	if (p->m_ActorViewerActive)
	{
		m_ScenarioEditor.GetToolManager().SetCurrentTool(_T(""), NULL);
	}
	else
	{
		m_ScenarioEditor.GetToolManager().SetCurrentTool(_T("ActorViewerTool"), NULL);
	}
}*/

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

	wxString id = static_cast<wxStringClientData*>(data->GetData())->GetData();
	m_ScenarioEditor->GetToolManager().SetCurrentTool(_T("PlaceObject"), &id);

	// Always update the actor viewer's state even if it's inactive,
	// so it will be correct when first enabled
	/*p->m_ActorViewerEntity = id;

	if (p->m_ActorViewerActive)
	{
		p->ActorViewerPostToGame();
	}
	else
	{*/
		// On selecting an object, enable the PlaceObject tool with this object
		//m_ScenarioEditor->GetToolManager().SetCurrentTool(_T("PlaceObject"), &id);
	//}
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
	for (const std::string& it : names)
	{
		if (lastTemplateName == "")
			lastTemplateName = (it);

		if (lastTemplateName == (it))
		{
			++counterTemplate;
			return;
		}

		sizer->Add(CreateTemplateNameObject(m_TemplateNames, lastTemplateName, counterTemplate), wxSizerFlags().Align(wxALIGN_LEFT));

		lastTemplateName = it;
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
	for (size_t i = 0; i <= numPlayers && i < m_Players->Count(); ++i)
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
/*
ObjectBottomBar::ObjectBottomBar(
	wxWindow* parent,
	Observable<ObjectSettings>& objectSettings,
	Observable<AtObj>& mapSettings,
	ObjectSidebarImpl* p
)
	: wxPanel(parent, wxID_ANY), p(p)
{
	m_ViewerWireframe = false;
	m_ViewerMove = false;
	m_ViewerGround = true;
	m_ViewerWater = false;
	m_ViewerShadows = true;
	m_ViewerPolyCount = false;
	m_ViewerBoundingBox = false;
	m_ViewerAxesMarker = false;
	m_ViewerPropPointsMode = 0;

	wxSizer* mainSizer = new wxBoxSizer(wxHORIZONTAL);

	// --- viewer options panel -------------------------------------------------------------------------------

	m_ViewerPanel = new wxPanel(this, wxID_ANY);
	wxSizer* viewerSizer = new wxBoxSizer(wxHORIZONTAL);

	wxSizer* viewerButtonsSizer = new wxStaticBoxSizer(wxHORIZONTAL, m_ViewerPanel, _("Display settings"));
	{
		wxSizer* viewerButtonsLeft = new wxBoxSizer(wxVERTICAL);
		viewerButtonsLeft->SetMinSize(110, -1);
		viewerButtonsLeft->Add(Tooltipped(new wxButton(m_ViewerPanel, ID_ViewerWireframe,   _("Wireframe")),      _("Toggle wireframe / solid rendering")), wxSizerFlags().Expand());
		viewerButtonsLeft->Add(Tooltipped(new wxButton(m_ViewerPanel, ID_ViewerMove,        _("Move")),           _("Toggle movement along ground when playing walk/run animations")), wxSizerFlags().Expand());
		viewerButtonsLeft->Add(Tooltipped(new wxButton(m_ViewerPanel, ID_ViewerGround,      _("Ground")),         _("Toggle the ground plane")), wxSizerFlags().Expand());
		// TODO: disabled until http://trac.wildfiregames.com/ticket/2692 is fixed
		wxButton* waterButton = new wxButton(m_ViewerPanel, ID_ViewerWater, _("Water"));
		waterButton->Enable(false);
		viewerButtonsLeft->Add(Tooltipped(waterButton, _("Toggle the water plane")), wxSizerFlags().Expand());
		viewerButtonsLeft->Add(Tooltipped(new wxButton(m_ViewerPanel, ID_ViewerShadows,     _("Shadows")),        _("Toggle shadow rendering")), wxSizerFlags().Expand());
		viewerButtonsLeft->Add(Tooltipped(new wxButton(m_ViewerPanel, ID_ViewerPolyCount,   _("Poly count")),     _("Toggle polygon-count statistics - turn off ground and shadows for more useful data")), wxSizerFlags().Expand());

		wxSizer* viewerButtonsRight = new wxBoxSizer(wxVERTICAL);
		viewerButtonsRight->SetMinSize(110,-1);
		viewerButtonsRight->Add(Tooltipped(new wxButton(m_ViewerPanel, ID_ViewerBoundingBox, _("Bounding Boxes")), _("Toggle bounding boxes")), wxSizerFlags().Expand());
		viewerButtonsRight->Add(Tooltipped(new wxButton(m_ViewerPanel, ID_ViewerAxesMarker,  _("Axes Marker")), _("Toggle the axes marker (R=X, G=Y, B=Z)")), wxSizerFlags().Expand());
		viewerButtonsRight->Add(Tooltipped(new wxButton(m_ViewerPanel, ID_ViewerPropPoints,  _("Prop Points")), _("Toggle prop points (works best in wireframe mode)")), wxSizerFlags().Expand());

		viewerButtonsSizer->Add(viewerButtonsLeft, wxSizerFlags().Expand());
		viewerButtonsSizer->Add(viewerButtonsRight, wxSizerFlags().Expand());
	}

	viewerSizer->Add(viewerButtonsSizer, wxSizerFlags().Expand());
	viewerSizer->AddSpacer(3);

	// --- animations panel -------------------------------------------------------------------------------

	wxSizer* viewerAnimSizer = new wxStaticBoxSizer(wxVERTICAL, m_ViewerPanel, _("Animation"));

	// TODO: this list should come from the actor
	wxArrayString animChoices;
	AtObj anims (Datafile::ReadList("animations"));
	for (AtIter a = anims["item"]; a.defined(); ++a)
	{
		animChoices.Add(wxString(*a));
	}
	wxChoice* viewerAnimSelector = new wxChoice(m_ViewerPanel, ID_ViewerAnimation, wxDefaultPosition, wxDefaultSize, animChoices);
	viewerAnimSelector->SetSelection(0);
	viewerAnimSizer->Add(viewerAnimSelector, wxSizerFlags().Expand());

	wxSizer* viewerAnimSpeedSizer = new wxBoxSizer(wxHORIZONTAL);
	viewerAnimSpeedSizer->Add(new wxButton(m_ViewerPanel, ID_ViewerPlay, _("Play"), wxDefaultPosition, wxSize(50, -1)), wxSizerFlags().Expand());
	viewerAnimSpeedSizer->Add(new wxButton(m_ViewerPanel, ID_ViewerPause, _("Pause"), wxDefaultPosition, wxSize(50, -1)), wxSizerFlags().Expand());
	viewerAnimSpeedSizer->Add(new wxButton(m_ViewerPanel, ID_ViewerSlow, _("Slow"), wxDefaultPosition, wxSize(50, -1)), wxSizerFlags().Expand());
	viewerAnimSizer->Add(viewerAnimSpeedSizer);

	viewerSizer->Add(viewerAnimSizer, wxSizerFlags().Expand());

	// --- add viewer-specific options -------------------------------------------------------------------------------

	m_ViewerPanel->SetSizer(viewerSizer);
	mainSizer->Add(m_ViewerPanel, wxSizerFlags().Expand());

	m_ViewerPanel->Layout(); // prevents strange visibility glitch of the animation buttons on my machine (Vista 32-bit SP1) -- vtsj
	m_ViewerPanel->Show(false);
}

void ObjectBottomBar::OnFirstDisplay()
{
	// We use messages here because the simulation is not init'd otherwise (causing a crash)

	// Initialise the game with the default settings
	POST_MESSAGE(SetViewParamB, (AtlasMessage::eRenderView::ACTOR, L"wireframe", m_ViewerWireframe));
	POST_MESSAGE(SetViewParamB, (AtlasMessage::eRenderView::ACTOR, L"walk", m_ViewerMove));
	POST_MESSAGE(SetViewParamB, (AtlasMessage::eRenderView::ACTOR, L"ground", m_ViewerGround));
	POST_MESSAGE(SetViewParamB, (AtlasMessage::eRenderView::ACTOR, L"water", m_ViewerWater));
	POST_MESSAGE(SetViewParamB, (AtlasMessage::eRenderView::ACTOR, L"shadows", m_ViewerShadows));
	POST_MESSAGE(SetViewParamB, (AtlasMessage::eRenderView::ACTOR, L"stats", m_ViewerPolyCount));
	POST_MESSAGE(SetViewParamB, (AtlasMessage::eRenderView::ACTOR, L"bounding_box", m_ViewerBoundingBox));
	POST_MESSAGE(SetViewParamI, (AtlasMessage::eRenderView::ACTOR, L"prop_points", m_ViewerPropPointsMode));
}

void ObjectBottomBar::ShowActorViewer(bool show)
{
	m_ViewerPanel->Show(show);
	Layout();
}

void ObjectBottomBar::OnViewerSetting(wxCommandEvent& evt)
{
	switch (evt.GetId())
	{
	case ID_ViewerWireframe:
		m_ViewerWireframe = !m_ViewerWireframe;
		POST_MESSAGE(SetViewParamB, (AtlasMessage::eRenderView::ACTOR, L"wireframe", m_ViewerWireframe));
		break;
	case ID_ViewerMove:
		m_ViewerMove = !m_ViewerMove;
		POST_MESSAGE(SetViewParamB, (AtlasMessage::eRenderView::ACTOR, L"walk", m_ViewerMove));
		break;
	case ID_ViewerGround:
		m_ViewerGround = !m_ViewerGround;
		POST_MESSAGE(SetViewParamB, (AtlasMessage::eRenderView::ACTOR, L"ground", m_ViewerGround));
		break;
	case ID_ViewerWater:
		m_ViewerWater = !m_ViewerWater;
		POST_MESSAGE(SetViewParamB, (AtlasMessage::eRenderView::ACTOR, L"water", m_ViewerWater));
		break;
	case ID_ViewerShadows:
		m_ViewerShadows = !m_ViewerShadows;
		POST_MESSAGE(SetViewParamB, (AtlasMessage::eRenderView::ACTOR, L"shadows", m_ViewerShadows));
		break;
	case ID_ViewerPolyCount:
		m_ViewerPolyCount = !m_ViewerPolyCount;
		POST_MESSAGE(SetViewParamB, (AtlasMessage::eRenderView::ACTOR, L"stats", m_ViewerPolyCount));
		break;
	case ID_ViewerBoundingBox:
		m_ViewerBoundingBox = !m_ViewerBoundingBox;
		POST_MESSAGE(SetViewParamB, (AtlasMessage::eRenderView::ACTOR, L"bounding_box", m_ViewerBoundingBox));
		break;
	case ID_ViewerAxesMarker:
		m_ViewerAxesMarker = !m_ViewerAxesMarker;
		POST_MESSAGE(SetViewParamB, (AtlasMessage::eRenderView::ACTOR, L"axes_marker", m_ViewerAxesMarker));
		break;
	case ID_ViewerPropPoints:
		m_ViewerPropPointsMode = (m_ViewerPropPointsMode+1) % 3;
		POST_MESSAGE(SetViewParamI, (AtlasMessage::eRenderView::ACTOR, L"prop_points", m_ViewerPropPointsMode));
		break;
	}
}

void ObjectBottomBar::OnSelectAnim(wxCommandEvent& evt)
{
	p->m_ActorViewerAnimation = evt.GetString();
	p->ActorViewerPostToGame();
}

void ObjectBottomBar::OnSpeed(wxCommandEvent& evt)
{
	switch (evt.GetId())
	{
	case ID_ViewerPlay: p->m_ActorViewerSpeed = 1.0f; break;
	case ID_ViewerPause: p->m_ActorViewerSpeed = 0.0f; break;
	case ID_ViewerSlow: p->m_ActorViewerSpeed = 0.1f; break;
	}
	p->ActorViewerPostToGame();
}

BEGIN_EVENT_TABLE(ObjectBottomBar, wxPanel)
	EVT_BUTTON(ID_ViewerWireframe, ObjectBottomBar::OnViewerSetting)
	EVT_BUTTON(ID_ViewerMove, ObjectBottomBar::OnViewerSetting)
	EVT_BUTTON(ID_ViewerGround, ObjectBottomBar::OnViewerSetting)
	EVT_BUTTON(ID_ViewerWater, ObjectBottomBar::OnViewerSetting)
	EVT_BUTTON(ID_ViewerShadows, ObjectBottomBar::OnViewerSetting)
	EVT_BUTTON(ID_ViewerPolyCount, ObjectBottomBar::OnViewerSetting)
	EVT_CHOICE(ID_ViewerAnimation, ObjectBottomBar::OnSelectAnim)
	EVT_BUTTON(ID_ViewerPlay, ObjectBottomBar::OnSpeed)
	EVT_BUTTON(ID_ViewerPause, ObjectBottomBar::OnSpeed)
	EVT_BUTTON(ID_ViewerSlow, ObjectBottomBar::OnSpeed)
	EVT_BUTTON(ID_ViewerBoundingBox, ObjectBottomBar::OnViewerSetting)
	EVT_BUTTON(ID_ViewerAxesMarker, ObjectBottomBar::OnViewerSetting)
	EVT_BUTTON(ID_ViewerPropPoints, ObjectBottomBar::OnViewerSetting)
END_EVENT_TABLE();*/
