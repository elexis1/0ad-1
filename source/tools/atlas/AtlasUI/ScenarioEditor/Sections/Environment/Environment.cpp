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

#include "Environment.h"
#include "LightControl.h"

#include "GameInterface/Messages.h"
#include "ScenarioEditor/ScenarioEditor.h"
#include "General/Observable.h"
#include "CustomControls/ColorDialog/ColorDialog.h"

#include <wx/clrpicker.h>

using AtlasMessage::Shareable;

const float M_PIf = 3.14159265f;
//////////////////////////////////////////////////////////////////////////

class VariableSliderBox : public wxEvtHandler
{
	static const int range = 1024;
public:
	VariableSliderBox(wxSlider* slider,Shareable<float>& var, float min, float max)
	: wxEvtHandler(), m_Var(var), m_Min(min), m_Max(max)
	{
		m_Conn = g_EnvironmentSettings.RegisterObserver(0, &VariableSliderBox::OnSettingsChange, this);

		m_Slider = slider;
		m_Slider->SetMin(0);
		m_Slider->SetMax(range);
		m_Slider->Connect(wxEVT_SCROLL_CHANGED, wxScrollEventHandler(VariableSliderBox::OnScroll), NULL, this);
		m_Slider->Connect(wxEVT_SCROLL_TOP, wxScrollEventHandler(VariableSliderBox::OnScroll), NULL, this);
		m_Slider->Connect(wxEVT_SCROLL_BOTTOM, wxScrollEventHandler(VariableSliderBox::OnScroll), NULL, this);
		m_Slider->Connect(wxEVT_SCROLL_LINEUP, wxScrollEventHandler(VariableSliderBox::OnScroll), NULL, this);
		m_Slider->Connect(wxEVT_SCROLL_LINEDOWN, wxScrollEventHandler(VariableSliderBox::OnScroll), NULL, this);
		m_Slider->Connect(wxEVT_SCROLL_PAGEUP, wxScrollEventHandler(VariableSliderBox::OnScroll), NULL, this);
		m_Slider->Connect(wxEVT_SCROLL_PAGEDOWN, wxScrollEventHandler(VariableSliderBox::OnScroll), NULL, this);
		m_Slider->Connect(wxEVT_SCROLL_THUMBTRACK, wxScrollEventHandler(VariableSliderBox::OnScroll), NULL, this);
		m_Slider->Connect(wxEVT_SCROLL_THUMBRELEASE, wxScrollEventHandler(VariableSliderBox::OnScroll), NULL, this);
	}
	~VariableSliderBox()
	{		
	}
	
	void OnSettingsChange(const AtlasMessage::sEnvironmentSettings& WXUNUSED(env))
	{
		m_Slider->SetValue((m_Var - m_Min) * (range / (m_Max - m_Min)));
	}

	void OnScroll(wxScrollEvent& evt)
	{
		m_Var = m_Min + (m_Max - m_Min)*(evt.GetInt() / (float)range);

		g_EnvironmentSettings.NotifyObserversExcept(m_Conn);
	}

private:
	ObservableScopedConnection m_Conn;
	wxSlider* m_Slider;
	Shareable<float>& m_Var;
	float m_Min, m_Max;
};
//////////////////////////////////////////////////////////////////////////

class VariableListBox : public wxEvtHandler
{
public:
	VariableListBox(wxComboBox* combo, Shareable<std::wstring>& var, const std::vector<std::wstring>& choices, bool clearCombo = true)
		: wxEvtHandler(),
		m_Var(var)
	{
		m_Conn = g_EnvironmentSettings.RegisterObserver(0, &VariableListBox::OnSettingsChange, this);
		m_Combo = combo;
		
		wxArrayString choices_arraystr;
		for (std::wstring sky : choices)
			choices_arraystr.Add(sky.c_str());
		
		if (clearCombo)
			m_Combo->Clear();
		m_Combo->Append(choices_arraystr);
		m_Combo->SetValue(m_Var.c_str());
		m_Combo->Connect(wxEVT_COMBOBOX, wxCommandEventHandler(VariableListBox::OnSelect), NULL, this);
	}

	void OnSettingsChange(const AtlasMessage::sEnvironmentSettings& WXUNUSED(env))
	{
		m_Combo->SetValue(m_Var.c_str());
	}

	void OnSelect(wxCommandEvent& WXUNUSED(evt))
	{
		m_Var = std::wstring(m_Combo->GetValue().c_str());

		g_EnvironmentSettings.NotifyObserversExcept(m_Conn);
	}

private:
	ObservableScopedConnection m_Conn;
	wxComboBox* m_Combo;
	Shareable<std::wstring>& m_Var;

};

//////////////////////////////////////////////////////////////////////////

class VariableColorBox : public wxEvtHandler
{
public:
	VariableColorBox(wxColourPickerCtrl* colourCtrl, Shareable<AtlasMessage::Color>& color)
		: wxEvtHandler(),
		m_Color(color)
	{
		m_Conn = g_EnvironmentSettings.RegisterObserver(0, &VariableColorBox::OnSettingsChange, this);
		m_ColorCtr = colourCtrl;
		wxColor currentValue = wxColor(m_Color->r, m_Color->g, m_Color->b);
		m_ColorCtr->SetColour(currentValue);
		m_ColorCtr->Connect(wxEVT_COLOURPICKER_CHANGED, wxColourPickerEventHandler(VariableColorBox::OnColourChanged), NULL, this);
	}

	void OnSettingsChange(const AtlasMessage::sEnvironmentSettings& WXUNUSED(env))
	{
		wxColor currentValue = wxColor(m_Color->r, m_Color->g, m_Color->b);
		m_ColorCtr->SetColour(currentValue);
	}

	void OnColourChanged(wxColourPickerEvent& evt)
	{
		wxColor currentSelection = evt.GetColour();
		m_Color = AtlasMessage::Color(currentSelection.Red(), currentSelection.Green(), currentSelection.Blue());
		g_EnvironmentSettings.NotifyObserversExcept(m_Conn);
	}

private:
	ObservableScopedConnection m_Conn;
	wxColourPickerCtrl* m_ColorCtr;
	Shareable<AtlasMessage::Color>& m_Color;

};

//////////////////////////////////////////////////////////////////////////

enum {
	ID_SunSettingsBegin = 0,
	ID_SunRotation,
	ID_SunElevation,
	ID_SunOverbrightness,
	ID_SunSphere,
	ID_SunColor,
	ID_SkySet,
	ID_FogFactor,
	ID_FogThickness,
	ID_FogColor,
	ID_TerrainAmbientColor,
	ID_ObjectAmbientColor,
	ID_SunSettingsEnd,
	ID_WaterSettingsBegin = 100,
	ID_RecomputeWaterData,
	ID_WaterType,
	ID_WaterHeight,
	ID_WaterWaviness,
	ID_WaterMurkiness,
	ID_WingAngle,
	ID_WaterColor,
	ID_WaterTint,
	ID_WaterSettingsEnd,
	ID_PostProcessingSettingsBegin = 200,
	ID_PostEffect,
	ID_Brightness,
	ID_Contrast,
	ID_Saturation,
	ID_Bloom,
	ID_PostProcessingSettingsEnd
};

IMPLEMENT_DYNAMIC_CLASS(SunSettings, wxPanel);

SunSettings::SunSettings()
{
}

void SunSettings::Init(ScenarioEditor* WXUNUSED(scenarioEditor))
{
	// Start Sliders
	handlers.push_back(new VariableSliderBox(wxDynamicCast(FindWindow(ID_SunRotation), wxSlider), g_EnvironmentSettings.sunrotation, -M_PIf, M_PIf));
	handlers.push_back(new VariableSliderBox(wxDynamicCast(FindWindow(ID_SunElevation), wxSlider), g_EnvironmentSettings.sunelevation, -M_PIf/2, M_PIf/2));
	handlers.push_back(new VariableSliderBox(wxDynamicCast(FindWindow(ID_SunOverbrightness), wxSlider), g_EnvironmentSettings.sunoverbrightness, 1.0f, 3.0f));
	handlers.push_back(new VariableSliderBox(wxDynamicCast(FindWindow(ID_FogFactor), wxSlider), g_EnvironmentSettings.fogfactor, 0.0f, 0.01f));
	handlers.push_back(new VariableSliderBox(wxDynamicCast(FindWindow(ID_FogThickness), wxSlider), g_EnvironmentSettings.fogmax, 0.5f, 0.0f));
	
	// Start Color Pickers
	handlers.push_back(new VariableColorBox(wxDynamicCast(FindWindow(ID_SunColor), wxColourPickerCtrl), g_EnvironmentSettings.suncolor));
	handlers.push_back(new VariableColorBox(wxDynamicCast(FindWindow(ID_FogColor), wxColourPickerCtrl), g_EnvironmentSettings.fogcolor));
	handlers.push_back(new VariableColorBox(wxDynamicCast(FindWindow(ID_TerrainAmbientColor), wxColourPickerCtrl), g_EnvironmentSettings.terraincolor));
	handlers.push_back(new VariableColorBox(wxDynamicCast(FindWindow(ID_ObjectAmbientColor), wxColourPickerCtrl), g_EnvironmentSettings.unitcolor));

	wxPanel* panelLightControl = wxDynamicCast(FindWindow(ID_SunSphere), wxPanel);
	panelLightControl->GetSizer()->Add(new LightControl(panelLightControl, wxSize(150, 150), g_EnvironmentSettings), wxSizerFlags().Expand());
	
	AtlasMessage::qGetSkySets qry_skysets;
	qry_skysets.Post();
	handlers.push_back(new VariableListBox(wxDynamicCast(FindWindow(ID_SkySet), wxComboBox), g_EnvironmentSettings.skyset, *qry_skysets.skysets));
}

//////////////////////////////////////////////////////////////////////////

IMPLEMENT_DYNAMIC_CLASS(WaterSettings, wxPanel);
WaterSettings::WaterSettings()
{
}

void WaterSettings::Init(ScenarioEditor* WXUNUSED(scenaroEditor))
{
	handlers.push_back(new VariableSliderBox(wxDynamicCast(FindWindow(ID_WaterHeight), wxSlider), g_EnvironmentSettings.waterheight, 0.f, 1.2f));
	handlers.push_back(new VariableSliderBox(wxDynamicCast(FindWindow(ID_WaterWaviness), wxSlider), g_EnvironmentSettings.waterwaviness, 0.f, 10.f));
	handlers.push_back(new VariableSliderBox(wxDynamicCast(FindWindow(ID_WaterMurkiness), wxSlider), g_EnvironmentSettings.watermurkiness, 0.f, 1.f));
	handlers.push_back(new VariableSliderBox(wxDynamicCast(FindWindow(ID_WingAngle), wxSlider), g_EnvironmentSettings.windangle, -M_PIf, M_PIf));
	
	std::vector<std::wstring> emptyList;
	handlers.push_back(new VariableListBox(wxDynamicCast(FindWindow(ID_WaterType), wxComboBox), g_EnvironmentSettings.watertype, emptyList, false));

	handlers.push_back(new VariableColorBox(wxDynamicCast(FindWindow(ID_WaterColor), wxColourPickerCtrl), g_EnvironmentSettings.watercolor));
	handlers.push_back(new VariableColorBox(wxDynamicCast(FindWindow(ID_WaterTint), wxColourPickerCtrl), g_EnvironmentSettings.watertint));
}

void WaterSettings::RecomputeWaterData(wxCommandEvent& WXUNUSED(evt))
{
	POST_COMMAND(RecalculateWaterData, (0.0f));
}

BEGIN_EVENT_TABLE(WaterSettings, wxPanel)
	EVT_BUTTON(ID_RecomputeWaterData, WaterSettings::RecomputeWaterData)
END_EVENT_TABLE();

//////////////////////////////////////////////////////////////////////////

IMPLEMENT_DYNAMIC_CLASS(PostProcessingSettings, wxPanel);
PostProcessingSettings::PostProcessingSettings()
{
}

void PostProcessingSettings::Init(ScenarioEditor* WXUNUSED(scenarioEditor))
{
	handlers.push_back(new VariableSliderBox(wxDynamicCast(FindWindow(ID_Brightness), wxSlider), g_EnvironmentSettings.brightness, -0.5f, 0.5f));
	handlers.push_back(new VariableSliderBox(wxDynamicCast(FindWindow(ID_Contrast), wxSlider), g_EnvironmentSettings.contrast, 0.5f, 1.5f));
	handlers.push_back(new VariableSliderBox(wxDynamicCast(FindWindow(ID_Saturation), wxSlider), g_EnvironmentSettings.saturation, 0.0f, 2.0f));
	handlers.push_back(new VariableSliderBox(wxDynamicCast(FindWindow(ID_Bloom), wxSlider), g_EnvironmentSettings.bloom, 0.2f, 0.0f));

	AtlasMessage::qGetPostEffects qry_effects;
	qry_effects.Post();
	handlers.push_back(new VariableListBox(wxDynamicCast(FindWindow(ID_PostEffect), wxComboBox), g_EnvironmentSettings.posteffect, *qry_effects.posteffects));
}
