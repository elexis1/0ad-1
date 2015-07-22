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

#include "ObjectSettings.h"

#include "GameInterface/Messages.h"
#include "ScenarioEditor/ScenarioEditor.h"

ObjectSettings::ObjectSettings(int view)
: m_PlayerID(0), m_View(view)
{
 	m_Conn = g_SelectedObjects.RegisterObserver(0, &ObjectSettings::OnSelectionChange, this);
}

int ObjectSettings::GetPlayerID() const
{
	return m_PlayerID;
}

void ObjectSettings::SetPlayerID(int playerID)
{
	m_PlayerID = playerID;
	PostToGame();
}

void ObjectSettings::SetView(int view)
{
	m_View = view;
}

const std::set<wxString>& ObjectSettings::GetActorSelections() const
{
	return m_ActorSelections;
}

void ObjectSettings::SetActorSelections(const std::set<wxString>& selections)
{
	m_ActorSelections = selections;
	PostToGame();
}

const std::vector<ObjectSettings::Group> ObjectSettings::GetActorVariation() const
{
	std::vector<Group> variation;

	for (const wxArrayString& grp : m_VariantGroups)
	{
		Group group;
		group.variants = grp;

		// Variant choice method, as used by the game: Choose the first variant
		// which matches any of the selections

		size_t chosen = 0; // default to first
		for (size_t i = 0; i < grp.GetCount(); ++i)
		{
			if (m_ActorSelections.find(grp.Item(i)) != m_ActorSelections.end())
			{
				chosen = i;
				break;
			}
		}
		group.chosen = grp.Item(chosen);

		variation.push_back(group);
	}

	return variation;
}

AtlasMessage::sObjectSettings ObjectSettings::GetSettings() const
{
	AtlasMessage::sObjectSettings settings;

	settings.player = m_PlayerID;

	// Copy selections from set into vector
	std::vector<std::wstring> selections;
	for (const wxString& actorSelection : m_ActorSelections)
		selections.emplace_back((std::wstring)actorSelection.wc_str());

	settings.selections = selections;

	return settings;
}

void ObjectSettings::OnSelectionChange(const std::vector<AtlasMessage::ObjectID>& selection)
{
	// TODO: what would be the sensible action if nothing's selected?
	// and if multiple objects are selected?

	if (selection.empty())
		return;

	AtlasMessage::qGetObjectSettings qry (m_View, selection[0]);
	qry.Post();

	m_PlayerID = qry.settings->player;

	m_ActorSelections.clear();
	m_VariantGroups.clear();

	std::vector<std::vector<std::wstring> > variation = *qry.settings->variantGroups;
	for (const std::vector<std::wstring>& grp : variation)
	{
		wxArrayString variants;
		for (const std::wstring& variant : grp)
			variants.Add(variant.c_str());

		m_VariantGroups.push_back(variants);
	}

	for (const std::wstring& sel : *qry.settings->selections)
		m_ActorSelections.insert(sel.c_str());

	static_cast<Observable<ObjectSettings>*>(this)->NotifyObservers();
}

void ObjectSettings::PostToGame()
{
	for (const AtlasMessage::ObjectID& selectedObject : g_SelectedObjects)
		POST_COMMAND(SetObjectSettings, (m_View, selectedObject, GetSettings()));
}
