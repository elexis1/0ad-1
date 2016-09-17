/* Copyright (C) 2009 Wildfire Games.
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

#include "MessageHandler.h"
#include "../CommandProc.h"
#include "graphics/Camera.h"
#include "graphics/CinemaManager.h"
#include "graphics/GameView.h"
#include "ps/Game.h"
#include "ps/CStr.h"
#include "ps/CLogger.h"
#include "ps/Filesystem.h"
#include "maths/MathUtil.h"
#include "maths/Quaternion.h"
#include "lib/res/graphics/ogl_tex.h"


namespace AtlasMessage {


sCinemaPath ConstructCinemaPath(const CCinemaPath* source)
{
	sCinemaPath path;
	const CCinemaData* data = source->GetData();
	//path.mode = data->m_Mode;
	//path.style = data->m_Style;
	path.growth = data->m_Growth;
	path.timescale = data->m_Timescale.ToFloat();
	path.change = data->m_Switch;

	return path;
}
CCinemaData ConstructCinemaData(const sCinemaPath& path)
{
	CCinemaData data;
	data.m_Growth = data.m_GrowthCount = path.growth;
	data.m_Switch = path.change;
	//data.m_Mode = path.mode;
	//data.m_Style = path.style;
	
	return data;
}
sCinemaSplineNode ConstructCinemaNode(const SplineData& data)
{
	sCinemaSplineNode node;
	node.px = data.Position.X.ToFloat();
	node.py = data.Position.Y.ToFloat();
	node.pz = data.Position.Z.ToFloat();
	
	node.rx = data.Rotation.X.ToFloat();
	node.ry = data.Rotation.Y.ToFloat();
	node.rz = data.Rotation.Z.ToFloat();
	node.t = data.Distance.ToFloat();
	
	return node;
}

std::vector<sCinemaPath> GetCurrentPaths()
{
	const std::map<CStrW, CCinemaPath>& paths = g_Game->GetView()->GetCinema()->GetAllPaths();
	std::vector<sCinemaPath> atlasPaths;

	for ( std::map<CStrW, CCinemaPath>::const_iterator it=paths.begin(); it!=paths.end(); ++it  )
	{
		sCinemaPath path = ConstructCinemaPath(&it->second);	
		path.name = it->first;
		
		const std::vector<SplineData>& nodes = it->second.GetAllNodes();
		std::vector<sCinemaSplineNode> atlasNodes;
			
		for ( size_t i=0; i<nodes.size(); ++i )
			atlasNodes.push_back( ConstructCinemaNode(nodes[i]) );
		
		if ( !atlasNodes.empty() )
		{
			float back = atlasNodes.back().t;
			if ( atlasNodes.size() > 2 )
			{
				for ( size_t i=atlasNodes.size()-2; i>0; --i )
					atlasNodes[i].t = atlasNodes[i-1].t;
			}
			atlasNodes.back().t = atlasNodes.front().t;
			atlasNodes.front().t = back;
		}
		path.nodes = atlasNodes;
		atlasPaths.push_back(path);
	}
	return atlasPaths;
}

void SetCurrentPaths(const std::vector<sCinemaPath>& atlasPaths)
{
	std::map<CStrW, CCinemaPath> paths;
	
	for ( std::vector<sCinemaPath>::const_iterator it=atlasPaths.begin(); it!=atlasPaths.end(); ++it )
	{
		CStrW pathName(*it->name);
		paths[pathName] = CCinemaPath();
		paths[pathName].SetTimescale(fixed::FromFloat(it->timescale));

		const sCinemaPath& atlasPath = *it;
		const std::vector<sCinemaSplineNode> nodes = *atlasPath.nodes;
		TNSpline spline;
		CCinemaData data = ConstructCinemaData(atlasPath);
	
 		for ( size_t j=0; j<nodes.size(); ++j )
		{	
			spline.AddNode(CFixedVector3D(fixed::FromFloat(nodes[j].px), fixed::FromFloat(nodes[j].py), fixed::FromFloat(nodes[j].pz)), 
				CFixedVector3D(fixed::FromFloat(nodes[j].rx), fixed::FromFloat(nodes[j].ry), fixed::FromFloat(nodes[j].rz)), fixed::FromFloat(nodes[j].t));
		}
		paths[pathName] = CCinemaPath(data, spline, TNSpline());
	}

	g_Game->GetView()->GetCinema()->SetAllPaths(paths);
}
QUERYHANDLER(GetCameraInfo)
{
	sCameraInfo info;
	CMatrix3D* cam = &g_Game->GetView()->GetCamera()->m_Orientation;

	CQuaternion quatRot = cam->GetRotation();
	quatRot.Normalize();
	CVector3D rotation = quatRot.ToEulerAngles();
	rotation.X = RADTODEG(rotation.X); 
	rotation.Y = RADTODEG(rotation.Y);
	rotation.Z = RADTODEG(rotation.Z);
	CVector3D translation = cam->GetTranslation();
	
	info.pX = translation.X;
	info.pY = translation.Y;
	info.pZ = translation.Z;
	info.rX = rotation.X;
	info.rY = rotation.Y;
	info.rZ = rotation.Z;
	msg->info = info;
}

MESSAGEHANDLER(CinemaEvent)
{
	CCinemaManager* manager = g_Game->GetView()->GetCinema();
	
	if (msg->mode == eCinemaEventMode::SMOOTH)
	{
		manager->ClearQueue();
		manager->AddPathToQueue(*msg->path);
	}
	else if ( msg->mode == eCinemaEventMode::RESET )
	{
//		g_Game->GetView()->ResetCamera();
	}
	else
		ENSURE(false);
}

BEGIN_COMMAND(AddCinemaPath)
{
	void Do()
	{
		if (g_Game->GetView()->GetCinema()->HasPath(*msg->pathName))
			return;
		CCinemaData pathData;
		pathData.m_Name = *msg->pathName;
		pathData.m_Timescale = fixed::FromInt(1);
		pathData.m_Orientation = L"target";
		pathData.m_Mode = L"ease_inout";
		pathData.m_Style = L"default";

		CVector3D focus = g_Game->GetView()->GetCamera()->GetFocus();
		CFixedVector3D target(fixed::FromFloat(focus.X), fixed::FromFloat(focus.Y + 1.0f), fixed::FromFloat(focus.Z));
		CFixedVector3D position(target + CFixedVector3D(fixed::Zero(), fixed::FromInt(1), fixed::Zero()));
		CFixedVector3D shift(fixed::FromInt(3), fixed::Zero(), fixed::Zero());

		TNSpline positionSpline, targetSpline;
		positionSpline.AddNode(position, CFixedVector3D(), fixed::FromInt(0));
		positionSpline.AddNode(position + shift, CFixedVector3D(), fixed::FromInt(3));
		targetSpline.AddNode(target, CFixedVector3D(), fixed::FromInt(0));
		targetSpline.AddNode(target + shift, CFixedVector3D(), fixed::FromInt(3));

		// Construct cinema path with data gathered
		CCinemaPath path(pathData, positionSpline, targetSpline);

		g_Game->GetView()->GetCinema()->AddPath(*msg->pathName, path);
	}
	void Redo()
	{
	}
	void Undo()
	{
	}
};
END_COMMAND(AddCinemaPath)

BEGIN_COMMAND(DeleteCinemaPath)
{
	void Do()
	{
		if (!g_Game->GetView()->GetCinema()->HasPath(*msg->pathName))
			return;
		g_Game->GetView()->GetCinema()->GetCinematicSimulationData()->m_Paths.erase(*msg->pathName);
	}
	void Redo()
	{
	}
	void Undo()
	{
	}
};
END_COMMAND(DeleteCinemaPath)

BEGIN_COMMAND(SelectCinemaPath)
{
	void Do()
	{
		if (!g_Game->GetView()->GetCinema()->HasPath(*msg->pathName))
			return;
		g_Game->GetView()->GetCinema()->SelectPath(*msg->pathName);
	}
	void Redo()
	{
	}
	void Undo()
	{
	}
};
END_COMMAND(SelectCinemaPath)
			
BEGIN_COMMAND(SetCinemaPaths)
{
	std::vector<sCinemaPath> m_oldPaths, m_newPaths;
	void Do()
	{
		m_oldPaths = GetCurrentPaths();
		m_newPaths = *msg->paths;
		Redo();
	}
	void Redo()
	{
		SetCurrentPaths(m_newPaths);
	}
	void Undo()
	{
		SetCurrentPaths(m_oldPaths);
	}
};
END_COMMAND(SetCinemaPaths)

QUERYHANDLER(GetCinemaPaths)
{
	msg->paths = GetCurrentPaths();
}

BEGIN_COMMAND(SetCinemaPathsDrawing)
{
	void Do()
	{
		g_Game->GetView()->GetCinema()->SetPathsDrawing(msg->drawPaths);
	}
	void Redo()
	{
	}
	void Undo()
	{
	}
};
END_COMMAND(SetCinemaPathsDrawing)

BEGIN_COMMAND(SetCinemaCameraDrawing)
{
	void Do()
	{
		g_Game->GetView()->GetCinema()->SetCameraDrawing(msg->drawCamera);
	}
	void Redo()
	{
	}
	void Undo()
	{
	}
};
END_COMMAND(SetCinemaCameraDrawing)

BEGIN_COMMAND(SetCinemaCameraTime)
{
	void Do()
	{
		g_Game->GetView()->GetCinema()->SetSelectedPathCameraTime(msg->cameraTime);
	}
	void Redo()
	{
	}
	void Undo()
	{
	}
};
END_COMMAND(SetCinemaCameraTime)

BEGIN_COMMAND(SetCameraCenterOnCinemaPath)
{
	void Do()
	{
		const CStrW pathName = *msg->pathName;
		if (!g_Game->GetView()->GetCinema()->HasPath(pathName))
			return;
		const CCinemaPath path = g_Game->GetView()->GetCinema()->GetCinematicSimulationData()->m_Paths[pathName];
		CBoundingBoxAligned bb;
		for (SplineData node : path.GetAllNodes())
			bb += node.Position;
		for (SplineData node : path.GetTargetSpline().GetAllNodes())
			bb += node.Position;
		CVector3D dir(0, 1, -1), target;
		bb.GetCentre(target);
		// TODO: calculate view with fov/aspect ratio
		float distance = std::max((bb[1].X - bb[0].X) / 2.0f, (bb[1].Y - bb[0].Y) / 2.0f);
		distance = std::max(std::max((bb[1].Z - bb[0].Z) / 2.0f, distance) * 3.0f, 10.0f);
		g_Game->GetView()->GetCamera()->LookAt(dir * distance + target, target, CVector3D(0, 1, 0));
	}
	void Redo()
	{
	}
	void Undo()
	{
	}
};
END_COMMAND(SetCameraCenterOnCinemaPath)

}
