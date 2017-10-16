/**
 * A Painter modifies an arbitrary feature in a given Area, for instance terrain textures, elevation or calling other painters on that area.
 * Typically the area is determined by a Placer called from createArea or createAreas.
 */

/**
 * Marks the affected area with the given tileclass.
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
 * Removes the given tileclass from a given area.
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

/**
 * The MultiPainter applies several painters to the given area.
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
 * The TerrainPainter draws a given terrain texture over the given area.
 * When used with TERRAIN_SEPARATOR, an entity is placed on each tile.
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
 * The LayeredPainter sets different terrains within a given area.
 * It choses the terrain depending on the distance to the border of the area.
 *
 * The terrains given in the first array are painted from the border of the area towards the center (outermost first).
 * The widths array has one item less than the terrains array.
 * Each width specifies how many tiles the corresponding terrain should be wide (distance to the prior terrain border).
 * The remaining area is filled with the last terrain.
 */
function LayeredPainter(terrainArray, widths)
{
	if (!(terrainArray instanceof Array))
		throw new Error("LayeredPainter: terrains must be an array!");

	this.terrains = terrainArray.map(terrain => createTerrain(terrain));
	this.widths = widths;
}

LayeredPainter.prototype.paint = function(area)
{
	breadthFirstSearchPaint({
		"area": area,
		"brushSize": 1,
		"gridSize": getMapSize(),
		"withinArea": (areaID, x, z) => g_Map.area[x][z] == areaID,
		"paintTile": (point, distance) => {
			let width = 0;
			let i = 0;

			for (; i < this.widths.length; ++i)
			{
				width += this.widths[i];
				if (width >= distance)
					break;
			}

			this.terrains[i].place(point.x, point.z);
		}
	});
};

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
 * Absolute height change.
 */
const ELEVATION_SET = 0;

/**
 * Relative height change.
 */
const ELEVATION_MODIFY = 1;

/**
 * Paints elevation smoothly over an area.
 *
 * @param type - ELEVATION_MODIFY or ELEVATION_SET.
 * @param elevation - target height.
 * @param blendRadius - How steep the elevation change is.
 * @param roughness - maximum random elevation difference applied.
 */
function SmoothElevationPainter(type, elevation, blendRadius, roughness = 0)
{
	this.type = type;
	this.elevation = elevation;
	this.blendRadius = blendRadius;
	this.roughness = roughness;

	if (type != ELEVATION_SET && type != ELEVATION_MODIFY)
		throw new Error("SmoothElevationPainter: invalid type '" + type + "'");
}

SmoothElevationPainter.prototype.paint = function(area)
{
	// The heightmap grid has one more vertex per side than the tile grid
	let heightmapSize = g_Map.height.length;

	// Remember height inside the area before changing it
	let gotHeightPt = [];
	let newHeight = [];
	for (let i = 0; i < heightmapSize; ++i)
	{
		gotHeightPt[i] = new Uint8Array(heightmapSize);
		newHeight[i] = new Float32Array(heightmapSize);
	}

	// Get points within or adjacent to the area
	let brushSize = 2;
	let heightPoints = [];
	for (let point of area.points)
		for (let dx = -1; dx < 1 + brushSize; ++dx)
		{
			let nx = point.x + dx;
			for (let dz = -1; dz < 1 + brushSize; ++dz)
			{
				let nz = point.z + dz;

				if (g_Map.validH(nx, nz) && !gotHeightPt[nx][nz])
				{
					newHeight[nx][nz] = g_Map.height[nx][nz];
					gotHeightPt[nx][nz] = 1;
					heightPoints.push(new PointXZ(nx, nz));
				}
			}
		}

	// Every vertex of a tile is considered within the area
	let withinArea = (areaID, x, z) => {
		for (let [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]])
			if (g_Map.inMapBounds(x - dx, z - dz) && g_Map.area[x - dx][z - dz] == areaID)
				return true;

		return false;
	};

	// Change height inside the area depending on the distance to the border
	breadthFirstSearchPaint({
		"area": area,
		"brushSize": brushSize,
		"gridSize": heightmapSize,
		"withinArea": withinArea,
		"paintTile": (point, distance) => {
			let a = 1;
			if (distance <= this.blendRadius)
				a = (distance - 1) / this.blendRadius;

			if (this.type == ELEVATION_SET)
				newHeight[point.x][point.z] = (1 - a) * g_Map.height[point.x][point.z];

			newHeight[point.x][point.z] += a * this.elevation + randFloat(-1, 1) * this.roughness;
		}
	});

	// Smooth everything out
	let areaID = area.getID();
	for (let point of heightPoints)
	{
		if (!withinArea(areaID, point.x, point.z))
			continue;

		let count = 0;
		let sum = 0;

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

		g_Map.height[point.x][point.z] = (newHeight[point.x][point.z] + sum / count) / 2;
	}
};

/**
 * Calls the given paintTile function on all points within the given area,
 * providing the distance to the border of the area (1 for points on the border).
 * This function can traverse any grid, for instance the tile grid or the larger heightmap grid.
 *
 * @property area - An Area storing the set of points on the tile grid.
 * @property gridSize - The size of the grid to be traversed.
 * @property brushSize - Number of points per axis on the grid that are considered a point on the tilemap.
 * @property withinArea - Wheather a point of the grid is considered part of the area.
 * @property paintTile - Called for each point of the area (on the tile grid).
 */
function breadthFirstSearchPaint(args)
{
	// Remember which points were visited already and the shortest distance to the area
	let saw = [];
	let dist = [];
	for (let i = 0; i < args.gridSize; ++i)
	{
		saw[i] = new Uint8Array(args.gridSize);
		dist[i] = new Uint16Array(args.gridSize);
	}

	let withinGrid = (x, z) => Math.min(x, z) >= 0 && Math.max(x, z) < args.gridSize;

	// Find all points outside of the area, mark them as seen and set zero distance
	let pointQueue = [];
	let areaID = args.area.getID();
	for (let point of args.area.points)
		// The brushSize is added because the entire brushSize is by definition part of the area
		for (let dx = -1; dx < 1 + args.brushSize; ++dx)
		{
			let nx = point.x + dx;
			for (let dz = -1; dz < 1 + args.brushSize; ++dz)
			{
				let nz = point.z + dz;

				if (!withinGrid(nx, nz) || args.withinArea(areaID, nx, nz) || saw[nx][nz])
					continue;

				saw[nx][nz] = 1;
				dist[nx][nz] = 0;
				pointQueue.push(new PointXZ(nx, nz));
			}
		}

	// Visit these points, then direct neighbors of them, then their neighbors recursively
	// Call the paintTile method for each point within the area, with distance == 1 for the border.
	while (pointQueue.length)
	{
		let point = pointQueue.shift();
		let distance = dist[point.x][point.z];

		if (args.withinArea(areaID, point.x, point.z))
			args.paintTile(point, distance);

		// Enqueue neighboring points
		for (let dx = -1; dx <= 1; ++dx)
		{
			let nx = point.x + dx;
			for (let dz = -1; dz <= 1; ++dz)
			{
				let nz = point.z + dz;

				if (!withinGrid(nx, nz) || !args.withinArea(areaID, nx, nz) || saw[nx][nz])
					continue;

				saw[nx][nz] = 1;
				dist[nx][nz] = distance + 1;
				pointQueue.push(new PointXZ(nx, nz));
			}
		}
	}
}
