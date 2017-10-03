// Constants for using SmoothElevationPainter
const ELEVATION_SET = 0;
const ELEVATION_MODIFY = 1;

/////////////////////////////////////////////////////////////////////////////
//	ElevationPainter
//
//	Class for painting elevation over an area
//
//	elevation: Target elevation/height to be painted
//
/////////////////////////////////////////////////////////////////////////////

function ElevationPainter(elevation)
{
	this.elevation = elevation;
	this.DX = [0, 1, 1, 0];
	this.DZ = [0, 0, 1, 1];
}

ElevationPainter.prototype.paint = function(area)
{
	for (let pt of area.points)
		for (let j = 0; j < 4; ++j)
			if (g_Map.inMapBounds(pt.x + this.DX[j],pt.z + this.DZ[j]))
				g_Map.height[pt.x + this.DX[j]][pt.z + this.DZ[j]] = this.elevation;
};

/////////////////////////////////////////////////////////////////////////////
//	LayeredPainter
//
//	Class for painting multiple layered terrains over an area
//
// 	terrainArray: Array of terrain painter objects
//	widths: Array of widths for each layer
//
/////////////////////////////////////////////////////////////////////////////

function LayeredPainter(terrainArray, widths)
{
	if (!(terrainArray instanceof Array))
		throw("LayeredPainter: terrains must be an array!");

	this.terrains = terrainArray.map(terrArray => createTerrain(terrArray));
	this.widths = widths;
}

LayeredPainter.prototype.paint = function(area)
{
	let size = getMapSize();
	let saw = [];
	let dist = [];

	// init typed arrays
	for (let i = 0; i < size; ++i)
	{
		saw[i] = new Uint8Array(size);		// bool / uint8
		dist[i] = new Uint16Array(size);	// uint16
	}

	// Point queue (implemented with array)
	let pointQ = [];

	// push edge points
	let areaID = area.getID();

	for (let pt of area.points)
		for (let  dx = -1; dx <= 1; ++dx)
		{
			let nx = pt.x + dx;

			for (let dz=-1; dz <= 1; ++dz)
			{
				let nz = pt.z + dz;

				if (g_Map.inMapBounds(nx, nz) && g_Map.area[nx][nz] != areaID && !saw[nx][nz])
				{
					saw[nx][nz] = 1;
					dist[nx][nz] = 0;
					pointQ.push(new PointXZ(nx, nz));
				}
			}
		}

	// do BFS inwards to find distances to edge
	while (pointQ.length)
	{
		let pt = pointQ.shift();
		let d = dist[pt.x][pt.z];

		// paint if in area
		if (g_Map.area[pt.x][pt.z] == areaID)
		{
			let w = 0;
			let i = 0;

			for (; i < this.widths.length; ++i)
			{
				w += this.widths[i];
				if (w >= d)
					break;
			}
			this.terrains[i].place(pt.x, pt.z);
		}

		// enqueue neighbours
		for (let dx = -1; dx<=1; ++dx)
		{
			let nx = pt.x + dx;
			for (let dz = -1; dz <= 1; ++dz)
			{
				let nz = pt.z + dz;

				if (g_Map.inMapBounds(nx, nz) && g_Map.area[nx][nz] == areaID && !saw[nx][nz])
				{
					saw[nx][nz] = 1;
					dist[nx][nz] = d+1;
					pointQ.push(new PointXZ(nx, nz));
				}
			}
		}
	}
};

/////////////////////////////////////////////////////////////////////////////
//	MultiPainter
//
//	Class for applying multiple painters over an area
//
//	painters: Array of painter objects
//
/////////////////////////////////////////////////////////////////////////////

function MultiPainter(painters)
{
	this.painters = painters;
}

MultiPainter.prototype.paint = function(area)
{
	for (let painter of this.painters)
		painter.paint(area);
};

/////////////////////////////////////////////////////////////////////////////
//	SmoothElevationPainter
//
//	Class for painting elevation smoothly over an area
//
//	type: Type of elevation modification
//			ELEVATION_MODIFY = relative
//			ELEVATION_SET = absolute
//	elevation: Target elevation/height of area
//	blendRadius: How steep the elevation change is
//
/////////////////////////////////////////////////////////////////////////////

function SmoothElevationPainter(type, elevation, blendRadius)
{
	this.type = type;
	this.elevation = elevation;
	this.blendRadius = blendRadius;

	if (type != ELEVATION_SET && type != ELEVATION_MODIFY)
		throw("SmoothElevationPainter: invalid type '" + type + "'");
}

SmoothElevationPainter.prototype.checkInArea = function(areaID, x, z)
{
	// Check given tile and its neighbors
	return (
		g_Map.inMapBounds(x, z) && g_Map.area[x][z] == areaID ||
		g_Map.inMapBounds(x-1, z) && g_Map.area[x-1][z] == areaID ||
		g_Map.inMapBounds(x, z-1) && g_Map.area[x][z-1] == areaID ||
		g_Map.inMapBounds(x-1, z-1) && g_Map.area[x-1][z-1] == areaID
	);
};

SmoothElevationPainter.prototype.paint = function(area)
{
	let pointQ = [];
	let pts = area.points;
	let heightPts = [];

	let mapSize = getMapSize() + 1;

	let saw = [];
	let dist = [];
	let gotHeightPt = [];
	let newHeight = [];

	// init typed arrays
	for (let i = 0; i < mapSize; ++i)
	{
		saw[i] = new Uint8Array(mapSize);			// bool / uint8
		dist[i] = new Uint16Array(mapSize);			// uint16
		gotHeightPt[i] = new Uint8Array(mapSize);	// bool / uint8
		newHeight[i] = new Float32Array(mapSize);	// float32
	}

	let areaID = area.getID();

	// get a list of all points
	for (let pt of pts)
		for (let dx = -1; dx <= 2; ++dx)
		{
			let nx = pt.x + dx;
			for (let dz = -1; dz <= 2; ++dz)
			{
				let nz = pt.z + dz;

				if (g_Map.validH(nx, nz) && !gotHeightPt[nx][nz])
				{
					gotHeightPt[nx][nz] = 1;
					heightPts.push(new PointXZ(nx, nz));
					newHeight[nx][nz] = g_Map.height[nx][nz];
				}
			}
		}

	// push edge points
	for (let pt of pts)
		for (let dx = -1; dx <= 2; ++dx)
		{
			let nx = pt.x + dx;
			for (let dz = -1; dz <= 2; ++dz)
			{
				let nz = pt.z + dz;

				if (g_Map.validH(nx, nz) && !this.checkInArea(areaID, nx, nz) && !saw[nx][nz])
				{
					saw[nx][nz]= 1;
					dist[nx][nz] = 0;
					pointQ.push(new PointXZ(nx, nz));
				}
			}
		}

	// do BFS inwards to find distances to edge
	while(pointQ.length)
	{
		let pt = pointQ.shift();
		let d = dist[pt.x][pt.z];

		// paint if in area
		if (g_Map.validH(pt.x, pt.z) && this.checkInArea(areaID, pt.x, pt.z))
		{
			if (d <= this.blendRadius)
			{
				let a = (d - 1) / this.blendRadius;
				if (this.type == ELEVATION_SET)
					newHeight[pt.x][pt.z] = a * this.elevation + (1 - a) * g_Map.height[pt.x][pt.z];
				else
					newHeight[pt.x][pt.z] += a * this.elevation;
			}
			else
			{
				// also happens when blendRadius == 0
				if (this.type == ELEVATION_SET)
					newHeight[pt.x][pt.z] = this.elevation;
				else
					newHeight[pt.x][pt.z] += this.elevation;
			}
		}

		// enqueue neighbours
		for (let dx = -1; dx <= 1; ++dx)
		{
			let nx = pt.x + dx;
			for (let dz = -1; dz <= 1; ++dz)
			{
				let nz = pt.z + dz;

				if (g_Map.validH(nx, nz) && this.checkInArea(areaID, nx, nz) && !saw[nx][nz])
				{
					saw[nx][nz] = 1;
					dist[nx][nz] = d+1;
					pointQ.push(new PointXZ(nx, nz));
				}
			}
		}
	}

	// smooth everything out
	for (let pt of heightPts)
		if (this.checkInArea(areaID, pt.x, pt.z))
		{
			let sum = 8 * newHeight[pt.x][pt.z];
			let count = 8;

			for (let dx = -1; dx <= 1; ++dx)
			{
				let nx = pt.x + dx;

				for (let dz = -1; dz <= 1; ++dz)
				{
					let nz = pt.z + dz;

					if (g_Map.validH(nx, nz))
					{
						sum += newHeight[nx][nz];
						++count;
					}
				}
			}

			g_Map.height[pt.x][pt.z] = sum / count;
		}
};

/////////////////////////////////////////////////////////////////////////////
//	TerrainPainter
//
//	Class for painting a terrain over an area
//
//	terrain: Terrain placer object
//
/////////////////////////////////////////////////////////////////////////////

function TerrainPainter(terrain)
{
	this.terrain = createTerrain(terrain);
}

TerrainPainter.prototype.paint = function(area)
{
	for (let pt of area.points)
		this.terrain.place(pt.x, pt.z);
};

/////////////////////////////////////////////////////////////////////////////
//	TileClassPainter
//
//	Class for painting tileClasses over an area
//
//	tileClass: TileClass object
//
/////////////////////////////////////////////////////////////////////////////

function TileClassPainter(tileClass)
{
	this.tileClass = tileClass;
}

TileClassPainter.prototype.paint = function(area)
{
	for (let pt of area.points)
		this.tileClass.add(pt.x, pt.z);
};

/////////////////////////////////////////////////////////////////////////////
//	TileClassUnPainter
//
//	Class for unpainting tileClasses over an area
//
//	tileClass: TileClass object
//
/////////////////////////////////////////////////////////////////////////////

function TileClassUnPainter(tileClass)
{
	this.tileClass = tileClass;
}

TileClassUnPainter.prototype.paint = function(area)
{
	for (let pt of area.points)
		this.tileClass.remove(pt.x, pt.z);
};

/**
 * Create a painter for the given class
 */
function paintClass(id)
{
	return new TileClassPainter(getTileClass(id));
}

/**
 * Create a painter for the given class
 */
function unPaintClass(id)
{
	return new TileClassUnPainter(getTileClass(id));
}
