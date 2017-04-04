/* Copyright (C) 2017 Wildfire Games.
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


#ifndef INCLUDED_CINEMAMANAGER
#define INCLUDED_CINEMAMANAGER

#include <list>
#include <map>

#include "lib/input.h" // InReaction - can't forward-declare enum

#include "graphics/CinemaPath.h"
#include "ps/CStr.h"

/*
	desc: contains various functions used for cinematic camera paths
	See also: CinemaHandler.cpp, CinemaPath.cpp
*/

/**
 * Class for in game playing of cinematics. Should only be instantiated in CGameView.
 */

class CCinemaManager
{
public:
	CCinemaManager();
	~CCinemaManager() {}

	/**
	 * Renders black bars and paths (if enabled)
	 */
	void Render() const;
	void DrawBars() const;

	bool IsPlaying() const;
	bool IsEnabled() const;

	/**
	 * Updates CCinemManager and current path
	 * @param deltaRealTime Elapsed real time since the last frame.
	 */
	void Update(const float deltaRealTime);

	InReaction HandleEvent(const SDL_Event_* ev);

	bool GetPathsDrawing() const;
	void SetPathsDrawing(const bool drawPath);

private:
	bool m_DrawPaths;
	bool m_Enabled;
	bool m_Paused;
};

extern InReaction cinema_manager_handler(const SDL_Event_* ev);

#endif
