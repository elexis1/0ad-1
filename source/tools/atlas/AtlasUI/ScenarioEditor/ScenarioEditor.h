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

#ifndef INCLUDED_SCENARIOEDITOR
#define INCLUDED_SCENARIOEDITOR

#include <wx/aui/aui.h>
#include "wx/toolbar.h"

#include "CustomControls/FileHistory/FileHistory.h"
#include "General/AtlasWindowCommandProc.h"
#include "General/Observable.h"
#include "Tools/Common/ObjectSettings.h"
#include "Tools/Common/Tools.h"

class PlayerSettingsControl;

class ScenarioEditor : public wxFrame
{
public:
	ScenarioEditor(wxWindow* parent);
	~ScenarioEditor();
	void OnClose(wxCloseEvent& event);
	void OnTimer(wxTimerEvent& event);
	void OnIdle(wxIdleEvent& event);

 	void OnNew(wxCommandEvent& event);
	void OnOpen(wxCommandEvent& event);
	void OnSave(wxCommandEvent& event);
	void OnSaveAs(wxCommandEvent& event);
	void OnImportHeightmap(wxCommandEvent& event);
	void OnMRUFile(wxCommandEvent& event);

	void OnQuit(wxCommandEvent& event);
	void OnUndo(wxCommandEvent& event);
	void OnRedo(wxCommandEvent& event);
    void OnCopy(wxCommandEvent& event);
    void OnPaste(wxCommandEvent& event);

	void OnWireframe(wxCommandEvent& event);
	void OnMessageTrace(wxCommandEvent& event);
	void OnScreenshot(wxCommandEvent& event);
	void OnMediaPlayer(wxCommandEvent& event);
	void OnJavaScript(wxCommandEvent& event);
	void OnCameraReset(wxCommandEvent& event);
	void OnRenderPath(wxCommandEvent& event);
	void OnDumpState(wxCommandEvent& event);
    void OnSelectedObjectsChange(const std::vector<AtlasMessage::ObjectID>& selectedObjects);
	void OnSimulateControls(wxCommandEvent& event);
	void OnAuiPanelClosed(wxAuiManagerEvent& event);
	template<typename T>
	void UpdatePanelTool(bool show, wxString panelName, wxString xrcName, bool closeButton = true);
	template<typename T>
	T* CreateOrGetPanelTool(wxString panelName, wxString xrcName, bool show = false, bool closeButton = true);

	void UpdateNewMapPanel(bool show);
	void UpdatePlayerPanel(bool show);
	PlayerSettingsControl* GetPlayerSettingsCtrl();

	void OnToolbarButtons(wxCommandEvent& event);

    void OnMenuOpen(wxMenuEvent& event);

	bool OpenFile(const wxString& name, const wxString& filename);

	void NotifyOnMapReload();

	static AtlasWindowCommandProc& GetCommandProc();

	static float GetSpeedModifier();

	Observable<ObjectSettings>& GetObjectSettings() { return m_ObjectSettings; }
	Observable<AtObj>& GetMapSettings() { return m_MapSettings; }
	Observable<AtObj>& GetMapReloaded() { return m_MapReloaded; }
	void RefreshMapSettings();

	ToolManager& GetToolManager() { return m_ToolManager; }

	bool DiscardChangesDialog();

	void SetOpenFilename(const wxString& filename);
	void SendToGame(const AtlasMessage::sEnvironmentSettings& settings);

	void OnToolChange(ITool* tool);
	void OnResizeMap(wxCommandEvent& event);
private:

	ToolManager m_ToolManager;

	wxTimer m_Timer;

	Observable<ObjectSettings> m_ObjectSettings;
	Observable<AtObj> m_MapSettings;
	Observable<AtObj> m_MapReloaded;

	wxString m_OpenFilename;
	FileHistory m_FileHistory;

	wxIcon m_Icon;
	wxAuiManager  m_Mgr;
	std::map<int, wxString> m_ToolsMap;
	int m_SimState;

	DECLARE_EVENT_TABLE();
};

#endif // INCLUDED_SCENARIOEDITOR
