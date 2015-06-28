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

#ifndef INCLUDED_BRUSHES
#define INCLUDED_BRUSHES

class BrushShapeCtrl;
class BrushSizeCtrl;
class BrushStrengthCtrl;

#include <vector>

enum BrushShape { CIRCLE = 0, SQUARE};

class Brush
{
public:
	Brush();
	~Brush();

	static const float STRENGTH_MULTIPLIER;

	int GetWidth() const;
	int GetHeight() const;
	std::vector<float> GetData() const;

	void SetCircle(int size);
	void SetSquare(int size);

	float GetStrength() const;
	void SetStrength(float strength);

	BrushShape GetShape();
	void SetShape(BrushShape shape);

	int GetSize();
	void SetSize(int size);
	// If active, send SetBrush message to the game
	void Send();

	// Set this brush to be active - sends SetBrush message now, and also
	// whenever the brush is altered (until a different one is activated).
	void MakeActive();

private:
	BrushShape m_Shape;
	int m_Size;
	float m_Strength;
	bool m_IsActive;
};

extern Brush g_Brush_Elevation;

#endif // INCLUDED_BRUSHES
