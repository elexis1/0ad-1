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

	for (std::vector<wxArrayString>::const_iterator grp = m_VariantGroups.begin();
		grp != m_VariantGroups.end();
		++grp)
	{
		Group group;
		group.variants = *grp;

		// Variant choice method, as used by the game: Choose the first variant
		// which matches any of the selections

		size_t chosen = 0; // default to first
		for (size_t i = 0; i < grp->GetCount(); ++i)
		{
			if (m_ActorSelections.find(grp->Item(i)) != m_ActorSelections.end())
			{
				chosen = i;
				break;
			}
		}
		group.chosen = grp->Item(chosen);

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
	for (std::set<wxString>::const_iterator it = m_ActorSelections.begin();
		it != m_ActorSelections.end();
		++it)
	{
		selections.push_back((std::wstring)it->wc_str());
	}
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
	std::for_each(variation.begin(), variation.end(), [&](const std::vector<std::wstring>& grp){
		wxArrayString variants;
		std::for_each(grp.begin(), grp.end(), [&](const std::wstring& it){
			variants.Add(it.c_str());
		});
		m_VariantGroups.push_back(variants);
	});

	std::vector<std::wstring> selections = *qry.settings->selections;
	std::for_each(selections.begin(), selections.end(), [&](const std::wstring& sel){
		m_ActorSelections.insert(sel.c_str());
	});

	static_cast<Observable<ObjectSettings>*>(this)->NotifyObservers();
}

void ObjectSettings::PostToGame()
{
	if (g_SelectedObjects.empty())
		return;

	std::for_each(g_SelectedObjects.begin(), g_SelectedObjects.end(), [&](const AtlasMessage::ObjectID& it){
		POST_COMMAND(SetObjectSettings, (m_View, it, GetSettings()));
	});
}
