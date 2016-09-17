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

#include "../Common/Sidebar.h"

#include "General/Observable.h"


class CinemaSidebar : public Sidebar
{
public:
	CinemaSidebar(ScenarioEditor& scenarioEditor, wxWindow* sidebarContainer, wxWindow* bottomBarContainer);

	virtual void OnMapReload();
	virtual void OnTogglePathsDrawing(wxCommandEvent& evt);
	virtual void OnToggleCameraDrawing(wxCommandEvent& evt);
	virtual void OnCenterOnPath(wxCommandEvent& evt);
	virtual void OnAddPath(wxCommandEvent& evt);
	virtual void OnDeletePath(wxCommandEvent& evt);
	virtual void OnSelectPath(wxCommandEvent& evt);
	virtual void OnChangeCameraTime(wxCommandEvent& evt);

	void ReloadPathList();

protected:
	virtual void OnFirstDisplay();

private:
	wxScrolledWindow* scrolledWindow;
	wxCheckBox* m_DrawPath;
	wxCheckBox* m_DrawCamera;
	wxListBox* m_PathList;
	wxSizer* m_PathSizer;
	wxTextCtrl* m_PathName;
	wxStaticText* m_InfoPathName;
	wxSlider* m_CameraTime;

	DECLARE_EVENT_TABLE();
};
