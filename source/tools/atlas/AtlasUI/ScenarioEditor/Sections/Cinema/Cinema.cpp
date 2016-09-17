/* Copyright (C) 2016 Wildfire Games.
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

#include "Cinema.h"

#include "GameInterface/Messages.h"
#include "ScenarioEditor/ScenarioEditor.h"
#include "General/Observable.h"
#include "CustomControls/ColorDialog/ColorDialog.h"

using AtlasMessage::Shareable;

enum {
	ID_PathsDrawing,
	ID_CameraDrawing,
	ID_PathsList,
	ID_CenterOnPath,
	ID_AddPath,
	ID_DeletePath,
	ID_InfoPathName,
	ID_CameraTime
};

// Helper function for adding tooltips
static wxWindow* Tooltipped(wxWindow* window, const wxString& tip)
{
	window->SetToolTip(tip);
	return window;
}

CinemaSidebar::CinemaSidebar(ScenarioEditor& scenarioEditor, wxWindow* sidebarContainer, wxWindow* bottomBarContainer)
	: Sidebar(scenarioEditor, sidebarContainer, bottomBarContainer)
{
	wxSizer* scrollSizer = new wxBoxSizer(wxVERTICAL);
	scrolledWindow = new wxScrolledWindow(this);
	scrolledWindow->SetScrollRate(10, 10);
	scrolledWindow->SetSizer(scrollSizer);
	m_MainSizer->Add(scrolledWindow, wxSizerFlags().Proportion(1).Expand());

	wxSizer* commonSizer = new wxStaticBoxSizer(wxVERTICAL, scrolledWindow, _T("Common settings"));
	scrollSizer->Add(commonSizer, wxSizerFlags().Expand());

	wxFlexGridSizer* gridSizer = new wxFlexGridSizer(2, 5, 5);
	gridSizer->AddGrowableCol(1);

	gridSizer->Add(new wxStaticText(scrolledWindow, wxID_ANY, _("Draw all paths")), wxSizerFlags().Align(wxALIGN_CENTER_VERTICAL | wxALIGN_RIGHT));
	gridSizer->Add(Tooltipped(m_DrawPath = new wxCheckBox(scrolledWindow, ID_PathsDrawing, wxEmptyString), _("Draw all paths")));
	
	gridSizer->Add(new wxStaticText(scrolledWindow, wxID_ANY, _("Draw camera")), wxSizerFlags().Align(wxALIGN_CENTER_VERTICAL | wxALIGN_RIGHT));
	gridSizer->Add(Tooltipped(m_DrawCamera = new wxCheckBox(scrolledWindow, ID_CameraDrawing, wxEmptyString), _("Draw camera at the current path")));
	commonSizer->Add(gridSizer, wxSizerFlags().Expand());

	// Paths list panel
	wxSizer* pathsSizer = new wxStaticBoxSizer(wxVERTICAL, scrolledWindow, _T("Paths"));
	scrollSizer->Add(pathsSizer, wxSizerFlags().Proportion(1).Expand());

	pathsSizer->Add(m_PathList = new wxListBox(scrolledWindow, ID_PathsList, wxDefaultPosition, wxDefaultSize, 0, NULL, wxLB_SINGLE | wxLB_SORT), wxSizerFlags().Proportion(1).Expand());
	scrollSizer->AddSpacer(3);
	pathsSizer->Add(Tooltipped(new wxButton(scrolledWindow, ID_CenterOnPath, _("Center")), _T("Center camera on selected path")), wxSizerFlags().Expand());
	pathsSizer->Add(Tooltipped(new wxButton(scrolledWindow, ID_DeletePath, _("Delete")), _T("Delete selected path")), wxSizerFlags().Expand());
	
	pathsSizer->Add(m_PathName = new wxTextCtrl(scrolledWindow, wxID_ANY), wxSizerFlags().Expand());
	pathsSizer->Add(new wxButton(scrolledWindow, ID_AddPath, _("Add")), wxSizerFlags().Expand());

	// Path info panel
	m_PathSizer = new wxStaticBoxSizer(wxVERTICAL, scrolledWindow, _T("Path"));
	scrollSizer->Add(m_PathSizer, wxSizerFlags().Expand());

	gridSizer = new wxFlexGridSizer(2, 5, 5);
	gridSizer->AddGrowableCol(1);
	gridSizer->Add(new wxStaticText(scrolledWindow, wxID_ANY, _("Name")), wxSizerFlags().Align(wxALIGN_CENTER_VERTICAL | wxALIGN_RIGHT));
	gridSizer->Add(Tooltipped(m_InfoPathName = new wxStaticText(scrolledWindow, ID_InfoPathName, _("")), _("Name of the selected path")));
	gridSizer->Add(new wxStaticText(scrolledWindow, wxID_ANY, _("Camera time")), wxSizerFlags().Align(wxALIGN_CENTER_VERTICAL | wxALIGN_RIGHT));
	gridSizer->Add(Tooltipped(m_CameraTime = new wxSlider(scrolledWindow, ID_CameraTime, 0, 0, 500), _("Camera time position of the selected path")));
	m_PathSizer->Add(gridSizer, wxSizerFlags().Expand());
}

void CinemaSidebar::ReloadPathList()
{
	m_InfoPathName->SetLabelText(_(""));

	int index = m_PathList->GetSelection();
	wxString pathName;
	if (index >= 0)
		pathName = m_PathList->GetString(index);

	AtlasMessage::qGetCinemaPaths query_paths;
	query_paths.Post();

	m_PathList->Clear();
	for (auto path : *query_paths.paths)
		m_PathList->Append(*path.name);

	m_InfoPathName->SetLabelText(_(""));
	if (index < 0 || pathName.empty())
		return;
	
	for (size_t i = 0; i < m_PathList->GetCount(); ++i)
		if (m_PathList->GetString(i) == pathName)
		{
			m_PathList->SetSelection(i);
			m_InfoPathName->SetLabelText(pathName);
		}
}

void CinemaSidebar::OnFirstDisplay()
{
	m_DrawPath->SetValue(false);
	m_DrawCamera->SetValue(false);

	ReloadPathList();
}


void CinemaSidebar::OnMapReload()
{
	m_DrawPath->SetValue(false);
	m_DrawCamera->SetValue(false);
	
	ReloadPathList();
}

void CinemaSidebar::OnTogglePathsDrawing(wxCommandEvent& evt)
{
	POST_COMMAND(SetCinemaPathsDrawing, (evt.IsChecked()));
}

void CinemaSidebar::OnToggleCameraDrawing(wxCommandEvent& evt)
{
	POST_COMMAND(SetCinemaCameraDrawing, (evt.IsChecked()));
}

void CinemaSidebar::OnCenterOnPath(wxCommandEvent&)
{
	int index = m_PathList->GetSelection();
	if (index < 0)
		return;
	wxString pathName = m_PathList->GetString(index);
	POST_COMMAND(SetCameraCenterOnCinemaPath, (pathName.ToStdWstring()));
}

void CinemaSidebar::OnAddPath(wxCommandEvent&)
{
	if (m_PathName->GetValue().empty())
		return;
	POST_COMMAND(AddCinemaPath, (m_PathName->GetValue().ToStdWstring()));
	m_PathName->Clear();

	ReloadPathList();
}

void CinemaSidebar::OnDeletePath(wxCommandEvent&)
{
	int index = m_PathList->GetSelection();
	if (index < 0)
		return;
	wxString pathName = m_PathList->GetString(index);
	if (pathName.empty())
		return;
	POST_COMMAND(DeleteCinemaPath, (pathName.ToStdWstring()));
	
	ReloadPathList();
}

void CinemaSidebar::OnSelectPath(wxCommandEvent&)
{
	m_InfoPathName->SetLabelText(_(""));
	int index = m_PathList->GetSelection();
	if (index < 0)
		return;
	wxString pathName = m_PathList->GetString(index);
	if (pathName.empty())
		return;
	m_InfoPathName->SetLabelText(pathName);
	m_CameraTime->SetValue(0);
	POST_COMMAND(SelectCinemaPath, (pathName.ToStdWstring()));
}

void CinemaSidebar::OnChangeCameraTime(wxCommandEvent&)
{
	m_InfoPathName->SetLabelText(_(""));
	int index = m_PathList->GetSelection();
	if (index < 0)
		return;
	wxString pathName = m_PathList->GetString(index);
	if (pathName.empty())
		return;
	POST_COMMAND(SetCinemaCameraTime, (((float)m_CameraTime->GetValue()) / 500.0f));
}


BEGIN_EVENT_TABLE(CinemaSidebar, Sidebar)
EVT_CHECKBOX(ID_PathsDrawing, CinemaSidebar::OnTogglePathsDrawing)
EVT_CHECKBOX(ID_CameraDrawing, CinemaSidebar::OnToggleCameraDrawing)
EVT_BUTTON(ID_CenterOnPath, CinemaSidebar::OnCenterOnPath)
EVT_BUTTON(ID_AddPath, CinemaSidebar::OnAddPath)
EVT_BUTTON(ID_DeletePath, CinemaSidebar::OnDeletePath)
EVT_LISTBOX(ID_PathsList, CinemaSidebar::OnSelectPath)
EVT_LISTBOX_DCLICK(ID_PathsList, CinemaSidebar::OnCenterOnPath)
EVT_SLIDER(ID_CameraTime, CinemaSidebar::OnChangeCameraTime)
END_EVENT_TABLE();

