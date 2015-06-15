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

#ifndef INCLUDED_ENVIRONMENT
#define INCLUDED_ENVIRONMENT

#include "AtlasObject/AtlasObject.h"
#include "General/Observable.h"
#include "ScenarioEditor/ScenarioEditor.h"

class VariableListBox;
class VariableSliderBox;
class VariableColorBox;

class SunSettings : public wxPanel
{
	DECLARE_DYNAMIC_CLASS(SunSettings);
public:
	SunSettings();
	void Init(ScenarioEditor* scenarioEditor);

private:
	std::vector<wxEvtHandler*> handlers;
};

class WaterSettings : public wxPanel
{
	DECLARE_DYNAMIC_CLASS(WaterSettings);
public:
	WaterSettings();
	void Init(ScenarioEditor* scenaroEditor);
	void RecomputeWaterData(wxCommandEvent& evt);

private:
	std::vector<wxEvtHandler*> handlers;
	
	DECLARE_EVENT_TABLE();
};

class PostProcessingSettings : public wxPanel
{
	DECLARE_DYNAMIC_CLASS(PostProcessingSettings);
public:
	PostProcessingSettings();
	void Init(ScenarioEditor* scenarioEditor);
	
private:
	std::vector<wxEvtHandler*> handlers;

};
#endif