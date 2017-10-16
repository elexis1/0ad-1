/**
 * Absolute height change.
 */
const ELEVATION_SET = 0;

/**
 * Relative height change.
 */
const ELEVATION_MODIFY = 1;

/**
 * A Painter
 *  - modifies an arbitrary feature in a given area, for instance terrain textures or elevation.
 *  - requires a paint function that only receives an area argument
 *  - has to pass arguments in the constructor
 *
 * The area it paints on is typically determined by a Placer called from createArea. 
 */

/**
 * Sets the given height on the given area.
 */
function ElevationPainter(elevation)
{
	this.elevation = elevation;
}

ElevationPainter.prototype.paint = function(area)
{
	for (let point of area.points)
		for (let [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]])
		{
			let x = point.x + dx;
			let z = point.z + dz;

			if (g_Map.inMapBounds(x, z))
				g_Map.height[x][z] = this.elevation;
		}
};

/**
 * Paints multiple layered terrain textures over a given area.
 */
function LayeredPainter(terrainArray, widths)
{
	if (!Array.isArray(terrainArray))
		throw("LayeredPainter: terrains must be an array!");

	this.terrains = terrainArray.map(terrain => createTerrain(terrain));
	this.widths = widths;
}

LayeredPainter.prototype.paint = function(area)
{
	breadthFirstSearchPaint(
		area,
		0,
		(x, z) => g_Map.inMapBounds(x, z),
		(areaID, x, z) => g_Map.area[x][z] == areaID,
		(point, distance) =>
		{
			let width = 0;
			let i = 0;

			for (; i < this.widths.length; ++i)
			{
				width += this.widths[i];
				if (width >= distance)
					break;
			}

			this.terrains[i].place(point.x, point.z);
		});
};

/**
 * Apply multiple painters over a given area.
 */
function MultiPainter(painters)
{
	this.painters = painters;
}

MultiPainter.prototype.paint = function(area)
{
	for (let painter of this.painters)
		painter.paint(area);
};

/**
 * Class for painting elevation smoothly over an area
 *
 * @param type - ELEVATION_MODIFY or ELEVATION_SET.
 * @param elevation - target height.
 * @param blendRadius - How steep the elevation change is.
 */
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
	return g_Map.inMapBounds(x, z) && g_Map.area[x][z] == areaID ||
	       g_Map.inMapBounds(x-1, z) && g_Map.area[x-1][z] == areaID ||
	       g_Map.inMapBounds(x, z-1) && g_Map.area[x][z-1] == areaID ||
	       g_Map.inMapBounds(x-1, z-1) && g_Map.area[x-1][z-1] == areaID;
};

SmoothElevationPainter.prototype.paint = function(area)
{
	let mapSize = getMapSize() + 1;
	let gotHeightPt = [];
	let newHeight = [];
	for (let i = 0; i < mapSize; ++i)
	{
		gotHeightPt[i] = new Uint8Array(mapSize);
		newHeight[i] = new Float32Array(mapSize);
	}

	// Get a list of all points
	let heightPoints = [];
	for (let point of area.points)
		for (let dx = -1; dx <= 2; ++dx)
		{
			let nx = point.x + dx;
			for (let dz = -1; dz <= 2; ++dz)
			{
				let nz = point.z + dz;

				if (g_Map.validH(nx, nz) && !gotHeightPt[nx][nz])
				{
					gotHeightPt[nx][nz] = 1;
					heightPoints.push(new PointXZ(nx, nz));
					newHeight[nx][nz] = g_Map.height[nx][nz];
				}
			}
		}

	breadthFirstSearchPaint(
		area,
		1,
		(x, z) => g_Map.validH(x, z),
		(areaID, x, z) => this.checkInArea(areaID, x, z),
		(point, distance) =>
		{
			let a = 1;
			if (distance <= this.blendRadius)
				a = (distance - 1) / this.blendRadius;

			if (this.type == ELEVATION_SET)
				newHeight[point.x][point.z] = (1 - a) * g_Map.height[point.x][point.z];

			newHeight[point.x][point.z] += a * this.elevation;
		});

	// Smooth everything out
	for (let point of heightPoints)
	{
		if (!this.checkInArea(area.getID(), point.x, point.z))
			continue;

		let sum = 8 * newHeight[point.x][point.z];
		let count = 8;

		for (let dx = -1; dx <= 1; ++dx)
		{
			let nx = point.x + dx;

			for (let dz = -1; dz <= 1; ++dz)
			{
				let nz = point.z + dz;

				if (g_Map.validH(nx, nz))
				{
					sum += newHeight[nx][nz];
					++count;
				}
			}
		}

		g_Map.height[point.x][point.z] = sum / count;
	}
};

/**
 * Paints a given terrain over a given area.
 *
 * @param terrain - Terrain texture or texture array. Can contain entities when used with TERRAIN_SEPARATOR.
 */
function TerrainPainter(terrain)
{
	this.terrain = createTerrain(terrain);
}

TerrainPainter.prototype.paint = function(area)
{
	for (let point of area.points)
		this.terrain.place(point.x, point.z);
};

/**
 * Paints a given tileclass over a given area.
 */
function TileClassPainter(tileClass)
{
	this.tileClass = tileClass;
}

TileClassPainter.prototype.paint = function(area)
{
	for (let point of area.points)
		this.tileClass.add(point.x, point.z);
};

/**
 * Removes a given tileclass from a given area.
 */
function TileClassUnPainter(tileClass)
{
	this.tileClass = tileClass;
}

TileClassUnPainter.prototype.paint = function(area)
{
	for (let point of area.points)
		this.tileClass.remove(point.x, point.z);
};

function breadthFirstSearchPaint(area, someDist, validBoundariesFunc, isValidAreaFunc, paintFunc)
{
	let mapSize = getMapSize() + someDist; // TODO: what is someDist?

	// Remember which points were visited already and the shortest distance to the area
	let saw = [];
	let dist = [];
	for (let i = 0; i < mapSize; ++i)
	{
		saw[i] = new Uint8Array(mapSize);
		dist[i] = new Uint16Array(mapSize);
	}

	let pointQueue = [];
	let areaID = area.getID();

	// Find all points of the area, mark them as seen and set zero distance
	for (let point of area.points)
		for (let dx = -1; dx <= 1 + someDist; ++dx)
		{
			let nx = point.x + dx;
			for (let dz = -1; dz <= 1 + someDist; ++dz)
			{
				let nz = point.z + dz;

				if (validBoundariesFunc(nx, nz) && !isValidAreaFunc(areaID, nx, nz) && !saw[nx][nz])
				{
					saw[nx][nz] = 1;
					dist[nx][nz] = 0;
					pointQueue.push(new PointXZ(nx, nz));
				}
			}
		}

	// Visit all direct neighbors of the area, then their neighbors recursively
	while (pointQueue.length)
	{
		let point = pointQueue.shift();
		let distance = dist[point.x][point.z];

		if (isValidAreaFunc(areaID, point.x, point.z))
			paintFunc(point, distance);

		// Enqueue neighbours
		for (let dx = -1; dx <= 1; ++dx)
		{
			let nx = point.x + dx;
			for (let dz = -1; dz <= 1; ++dz)
			{
				let nz = point.z + dz;

				if (validBoundariesFunc(nx, nz) && isValidAreaFunc(areaID, nx, nz) && !saw[nx][nz])
				{
					saw[nx][nz] = 1;
					dist[nx][nz] = distance + 1;
					pointQueue.push(new PointXZ(nx, nz));
				}
			}
		}
	}
}
