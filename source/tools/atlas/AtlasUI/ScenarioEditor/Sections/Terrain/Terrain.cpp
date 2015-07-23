/* Copyright (C) 2012 Wildfire Games.
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

#include "Terrain.h"

#include "GameInterface/Messages.h"
#include "ScenarioEditor/ScenarioEditor.h"
#include "ScenarioEditor/Tools/Common/Brushes.h"
#include "ScenarioEditor/Tools/Common/MiscState.h"

#include <wx/busyinfo.h>
#include <wx/choicebk.h>
#include <wx/listctrl.h>
#include <wx/image.h>
#include <wx/imaglist.h>
#include <wx/spinctrl.h>
#include <wx/tglbtn.h>

class TextureNotebook;

class TerrainBottomBar : public wxPanel
{
public:
	TerrainBottomBar(ScenarioEditor& scenarioEditor, wxWindow* parent);
	void LoadTerrain();
private:
	TextureNotebook* m_Textures;
};

enum
{
	ID_Passability = 1,
	ID_ShowPriorities
};

// Add spaces into the displayed name so there are more wrapping opportunities
static wxString FormatTextureName(wxString name)
{
	if (name.Len())
		name[0] = wxToupper(name[0]);
	name.Replace(_T("_"), _T(" "));

	return name;
}

//////////////////////////////////////////////////////////////////////////

class TextureNotebookPage : public wxPanel
{
private:
	static const int imageWidth = 120;
	static const int imageHeight = 40;

public:
	TextureNotebookPage(ScenarioEditor* scenarioEditor, wxWindow* parent, const wxString& name)
		: wxPanel(parent, wxID_ANY), m_ScenarioEditor(scenarioEditor), m_Timer(this), m_Name(name), m_Loaded(false)
	{
		m_ScrolledPanel = new wxScrolledWindow(this, wxID_ANY, wxDefaultPosition, wxDefaultSize, wxVSCROLL);
		m_ScrolledPanel->SetScrollRate(0, 10);
		m_ScrolledPanel->SetBackgroundColour(wxColor(255, 255, 255));

		wxSizer* sizer = new wxBoxSizer(wxVERTICAL);
		sizer->Add(m_ScrolledPanel, wxSizerFlags().Proportion(1).Expand());
		SetSizer(sizer);

		m_ItemSizer = new wxGridSizer(6, 4, 0);
		m_ScrolledPanel->SetSizer(m_ItemSizer);
	}

	void OnDisplay()
	{
		// Trigger the terrain loading on first display

		if (m_Loaded)
			return;

		m_Loaded = true;

		wxBusyInfo busy (_("Loading terrain previews"));

		ReloadPreviews();
	}

	void ReloadPreviews()
	{
		Freeze();

		m_ScrolledPanel->DestroyChildren();
		m_ItemSizer->Clear();

		m_LastTerrainSelection = NULL; // clear any reference to deleted button

		AtlasMessage::qGetTerrainGroupPreviews qry((std::wstring)m_Name.wc_str(), imageWidth, imageHeight);
		qry.Post();

		std::vector<AtlasMessage::sTerrainTexturePreview> previews = *qry.previews;

		bool allLoaded = true;

		for (const AtlasMessage::sTerrainTexturePreview& preview : *qry.previews)
		{
			if (!preview.loaded)
				allLoaded = false;

			wxString name = preview.name.c_str();

			// Construct the wrapped-text label
			wxStaticText* label = new wxStaticText(m_ScrolledPanel, wxID_ANY, FormatTextureName(name), wxDefaultPosition, wxDefaultSize, wxALIGN_CENTER);
			label->Wrap(imageWidth);

			unsigned char* buf = (unsigned char*)(malloc(preview.imageData.GetSize()));
			// imagedata.GetBuffer() gives a Shareable<unsigned char>*, which
			// is stored the same as a unsigned char*, so we can just copy it.
			memcpy(buf, preview.imageData.GetBuffer(), preview.imageData.GetSize());
			wxImage img (imageWidth, imageHeight, buf);

			wxButton* button = new wxBitmapButton(m_ScrolledPanel, wxID_ANY, wxBitmap(img));
			// Store the texture name in the clientdata slot
			button->SetClientObject(new wxStringClientData(name));

			wxSizer* imageSizer = new wxBoxSizer(wxVERTICAL);
			imageSizer->Add(button, wxSizerFlags().Center());
			imageSizer->Add(label, wxSizerFlags().Proportion(1).Center());
			m_ItemSizer->Add(imageSizer, wxSizerFlags().Expand().Center());
		}

		m_ScrolledPanel->Fit();
		Layout();

		Thaw();

		// If not all textures were loaded yet, run a timer to reload the previews
		// every so often until they've all finished
		if (allLoaded && m_Timer.IsRunning())
			m_Timer.Stop();
		else if (!allLoaded && !m_Timer.IsRunning())
			m_Timer.Start(2000);
	}

	void OnButton(wxCommandEvent& evt)
	{
		wxButton* button = wxDynamicCast(evt.GetEventObject(), wxButton);
		wxString name = static_cast<wxStringClientData*>(button->GetClientObject())->GetData();
		g_SelectedTexture = name;
		g_SelectedTexture.NotifyObservers();

		if (m_LastTerrainSelection)
		{
			m_LastTerrainSelection->SetBackgroundColour(wxNullColour);
			m_LastTerrainSelection->Refresh();
		}

		button->SetBackgroundColour(wxColor(255, 255, 0));
		m_LastTerrainSelection = button;

		// Slight hack: Default to Paint mode because that's probably what the user wanted
		// when they selected a terrain; unless already explicitly in Replace mode, because
		// then the user probably wanted that instead
		if (m_ScenarioEditor->GetToolManager().GetCurrentToolName() != _T("ReplaceTerrain") && m_ScenarioEditor->GetToolManager().GetCurrentToolName() != _T("FillTerrain"))
			m_ScenarioEditor->GetToolManager().SetCurrentTool(_T("PaintTerrain"));
	}

	void OnSize(wxSizeEvent& evt)
	{
		int numCols = std::max(1, (int)(evt.GetSize().GetWidth() / (imageWidth + 16)));
		m_ItemSizer->SetCols(numCols);
		evt.Skip();
	}

	void OnTimer(wxTimerEvent& WXUNUSED(evt))
	{
		ReloadPreviews();
	}

private:
	ScenarioEditor* m_ScenarioEditor;
	bool m_Loaded;
	wxTimer m_Timer;
	wxString m_Name;
	wxScrolledWindow* m_ScrolledPanel;
	wxGridSizer* m_ItemSizer;
	wxButton* m_LastTerrainSelection; // button that was last selected, so we can undo its coloring

	DECLARE_EVENT_TABLE();
};

BEGIN_EVENT_TABLE(TextureNotebookPage, wxPanel)
	EVT_BUTTON(wxID_ANY, TextureNotebookPage::OnButton)
	EVT_SIZE(TextureNotebookPage::OnSize)
	EVT_TIMER(wxID_ANY, TextureNotebookPage::OnTimer)
END_EVENT_TABLE();


class TextureNotebook : public wxChoicebook
{
	DECLARE_DYNAMIC_CLASS(TextureNotebook);
public:
	TextureNotebook()
	{
	}

	void SetScenarioEditor(ScenarioEditor* scenarioEditor)
	{
		m_ScenarioEditor = scenarioEditor;
	}

	void LoadTerrain()
	{
		wxBusyInfo busy (_("Loading terrain groups"));

		DeleteAllPages();
		wxArrayString m_TerrainGroups;

		// Get the list of terrain groups from the engine
		AtlasMessage::qGetTerrainGroups qry;
		qry.Post();
		for (const std::wstring& groupName : *qry.groupNames)
			m_TerrainGroups.Add(groupName.c_str());

		for (const wxString& terrainGroup : m_TerrainGroups)
			AddPage(new TextureNotebookPage(m_ScenarioEditor, this, terrainGroup), FormatTextureName(terrainGroup));

		// On some platforms (wxOSX) there is no initial OnPageChanged event, so it loads with a blank page
		//	and setting selection to 0 won't trigger it either, so just force first page to display
		// (this is safe because the sidebar has already been displayed)
		if (GetPageCount() > 0)
			static_cast<TextureNotebookPage*>(GetPage(0))->OnDisplay();
	}

protected:
	void OnPageChanged(wxBookCtrlEvent& event)
	{
		if (event.GetSelection() >= 0 && event.GetSelection() < (int)GetPageCount())
		{
			static_cast<TextureNotebookPage*>(GetPage(event.GetSelection()))->OnDisplay();
		}
		event.Skip();
	}

private:
	ScenarioEditor* m_ScenarioEditor;

	DECLARE_EVENT_TABLE();
};

IMPLEMENT_DYNAMIC_CLASS(TextureNotebook, wxChoicebook);
BEGIN_EVENT_TABLE(TextureNotebook, wxChoicebook)
	EVT_CHOICEBOOK_PAGE_CHANGED(wxID_ANY, TextureNotebook::OnPageChanged)
END_EVENT_TABLE();

//////////////////////////////////////////////////////////////////////////
enum
{
	ID_Paint,
	ID_Replace,
	ID_Fill,
	ID_TextureImage,
	ID_TextureName,
	ID_Shape,
	ID_Size,
	ID_Strength
};

IMPLEMENT_DYNAMIC_CLASS(TerrainSettings, wxPanel);
TerrainSettings::TerrainSettings()
	: m_ScenarioEditor(NULL)
{
}

void TerrainSettings::Init(ScenarioEditor *scenarioEditor)
{
	m_ScenarioEditor = scenarioEditor;
	m_ToolsMap[ID_Paint]="PaintTerrain";
	m_ToolsMap[ID_Replace]="ReplaceTerrain";
	m_ToolsMap[ID_Fill]="FillTerrain";

	m_ScenarioEditor->GetToolManager().GetCurrentTool().RegisterObserver(0, &TerrainSettings::OnToolChanged, this);
	OnToolChanged(NULL);

 	m_PreviewTexture = g_SelectedTexture;
	LoadPreviewTexture();
	g_SelectedTexture.RegisterObserver(0, &TerrainSettings::OnTextureChanged, this);

	wxDynamicCast(FindWindow(ID_Shape), wxRadioBox)->SetSelection(g_Brush_Elevation.GetShape());

	wxDynamicCast(FindWindow(ID_Size), wxSpinCtrl)->SetValue(wxString::Format("%d", g_Brush_Elevation.GetSize()));

	wxDynamicCast(FindWindow(ID_Strength), wxSpinCtrl)->SetValue(wxString::Format("%d", (int)(10.f*g_Brush_Elevation.GetStrength())));
}

void TerrainSettings::OnToolChanged(ITool* WXUNUSED(tool))
{
	for (const std::pair<int, wxString>& toolItem : m_ToolsMap)
		wxDynamicCast(FindWindow(toolItem.first), wxToggleButton)->SetValue(m_ScenarioEditor->GetToolManager().GetCurrentToolName() == toolItem.second);
}

void TerrainSettings::OnButton(wxCommandEvent &evt)
{
	std::map<int, wxString>::iterator tool = m_ToolsMap.find(evt.GetId());
	if (tool == m_ToolsMap.end())
		return;

	m_ScenarioEditor->GetToolManager().SetCurrentTool(evt.IsChecked() ? tool->second : "");
}

void TerrainSettings::OnTextureChanged(const wxString& texture)
{
	if (texture == m_PreviewTexture)
		return;

	m_PreviewTexture = texture;
	LoadPreviewTexture();
}

void TerrainSettings::LoadPreviewTexture()
{
	AtlasMessage::qGetTerrainTexturePreview qry((std::wstring)m_PreviewTexture.wx_str(), imageWidth, imageHeight);

	qry.Post();

	wxDynamicCast(FindWindow(ID_TextureName), wxStaticText)->SetLabel(FormatTextureName(*qry.preview->name));

	unsigned char* buf = (unsigned char*)(malloc(qry.preview->imageData.GetSize()));
	memcpy(buf, qry.preview->imageData.GetBuffer(), qry.preview->imageData.GetSize());
	wxImage img(qry.preview->imageWidth, qry.imageHeight, buf);
	wxDynamicCast(FindWindow(ID_TextureImage), wxStaticBitmap)->SetBitmap(wxBitmap(img));
}

void TerrainSettings::OnShapeChange(wxCommandEvent& evt)
{
	g_Brush_Elevation.SetShape((BrushShape)evt.GetSelection());
	g_Brush_Elevation.Send();
}

void TerrainSettings::OnSizeChange(wxSpinEvent &evt)
{
	g_Brush_Elevation.SetSize(evt.GetValue());
	g_Brush_Elevation.Send();
}

void TerrainSettings::OnStrengthChange(wxSpinEvent &evt)
{
	g_Brush_Elevation.SetStrength(evt.GetValue()/10.f);
	g_Brush_Elevation.Send();
}

BEGIN_EVENT_TABLE(TerrainSettings, wxPanel)
	EVT_TOGGLEBUTTON(wxID_ANY, TerrainSettings::OnButton)
	EVT_RADIOBOX(wxID_ANY, TerrainSettings::OnShapeChange)
	EVT_SPINCTRL(ID_Size, TerrainSettings::OnSizeChange)
	EVT_SPINCTRL(ID_Strength, TerrainSettings::OnStrengthChange)
END_EVENT_TABLE();

//////////////////////////////////////////////////////////////////////////
IMPLEMENT_DYNAMIC_CLASS(VisualizeSettings, wxPanel);

VisualizeSettings::VisualizeSettings()
{
}

void VisualizeSettings::Init(ScenarioEditor* WXUNUSED(scenarioEditor))
{
	AtlasMessage::qGetTerrainPassabilityClasses qry;
	qry.Post();

	wxChoice* passabilityChoice = wxDynamicCast(FindWindow(ID_Passability), wxChoice);

	for (const std::wstring& className : *qry.classNames)
		passabilityChoice->Append(className.c_str());
}

void VisualizeSettings::OnShowPriorities(wxCommandEvent& evt)
{
	POST_MESSAGE(SetViewParamB, (AtlasMessage::eRenderView::GAME, L"priorities", evt.IsChecked()));
}

void VisualizeSettings::OnPassabilityChoice(wxCommandEvent& evt)
{
	POST_MESSAGE(SetViewParamS, (AtlasMessage::eRenderView::GAME, L"passability", evt.GetSelection() == 0 ? L"" : (std::wstring)evt.GetString().wc_str()));
}

BEGIN_EVENT_TABLE(VisualizeSettings, wxPanel)
	EVT_CHOICE(ID_Passability, VisualizeSettings::OnPassabilityChoice)
	EVT_CHECKBOX(ID_ShowPriorities, VisualizeSettings::OnShowPriorities)
END_EVENT_TABLE()

//////////////////////////////////////////////////////////////////////////
IMPLEMENT_DYNAMIC_CLASS(TexturePreviewPanel, wxPanel);
enum
{
	ID_TextureNoteBook
};

TexturePreviewPanel::TexturePreviewPanel()
{
}

void TexturePreviewPanel::Init(ScenarioEditor* scenarioEditor)
{
	TextureNotebook* texturePreviewPanel = wxDynamicCast(FindWindow(ID_TextureNoteBook), TextureNotebook);
	texturePreviewPanel->SetScenarioEditor(scenarioEditor);
	texturePreviewPanel->LoadTerrain();
}
