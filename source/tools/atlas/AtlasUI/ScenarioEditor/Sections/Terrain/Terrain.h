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
#ifndef INCLUDED_TERRAIN
#define INCLUDED_TERRAIN

#include "../Common/Sidebar.h"
#include "ScenarioEditor/Tools/Common/Tools.h"

class TerrainSettings : public wxPanel
{
	DECLARE_DYNAMIC_CLASS(TerrainSettings);
public:
	TerrainSettings();
	void Init(ScenarioEditor* scenarioEditor);

	void OnButton(wxCommandEvent& evt);
	void OnToolChanged(ITool* tool);
	void OnTextureChanged(const wxString& texture);
	void LoadPreviewTexture();
	void OnShapeChange(wxCommandEvent& evt);
	void OnSizeChange(wxSpinEvent& evt);
	void OnStrengthChange(wxSpinEvent& evt);

private:
	static const int imageWidth = 120;
	static const int imageHeight = 40;
	ScenarioEditor* m_ScenarioEditor;
	std::map<int, wxString> m_ToolsMap;
	wxString m_PreviewTexture;

	DECLARE_EVENT_TABLE();
};

class VisualizeSettings : public wxPanel
{
	DECLARE_DYNAMIC_CLASS(VisualizeSettings);
public:
	VisualizeSettings();
	void Init(ScenarioEditor* scenarioEditor);
private:
	void OnShowPriorities(wxCommandEvent& evt);
	void OnPassabilityChoice(wxCommandEvent& evt);

	DECLARE_EVENT_TABLE();
};

class TexturePreviewPanel : public wxPanel
{
	DECLARE_DYNAMIC_CLASS(TexturePreviewPanel);
public:
	TexturePreviewPanel();
	void Init(ScenarioEditor* scenarioEditor);
};
#endif // INCLUDED_TERRAIN
