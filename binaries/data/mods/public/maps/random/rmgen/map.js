/**
 * Class for holding map data and providing basic API to change it
 *
 * @param {int} [size] - Size of the map in tiles
 * @param {float} [baseHeight] - Starting height of the map
 */
function Map(size, baseHeight)
{
	// Size must be 0 to 1024, divisible by patches
	this.size = size;

	// Create 2D arrays for textures, object, and areas
	this.texture = [];
	this.terrainObjects = [];
	this.area = [];

	for (let i = 0; i < size; ++i)
	{
		// Texture IDs
		this.texture[i] = new Uint16Array(size);
		// Entities
		this.terrainObjects[i] = [];
		// Area IDs
		this.area[i] = new Uint16Array(size);

		for (let j = 0; j < size; ++j)
			this.terrainObjects[i][j] = [];
	}

	// Create 2D array for heightmap
	let mapSize = size;
	if (!TILE_CENTERED_HEIGHT_MAP)
		++mapSize;

	this.height = [];
	for (let i = 0; i < mapSize; ++i)
	{
		this.height[i] = new Float32Array(mapSize);

		for (let j = 0; j < mapSize; ++j)
			this.height[i][j] = baseHeight;
	}

	// Create name <-> id maps for textures
	this.nameToID = {};
	this.IDToName = [];

	// Array of objects (entitys/actors)
	this.objects = [];
	// Array of integers
	this.tileClasses = [];

	this.areaID = 0;

	// Starting entity ID, arbitrary number to leave some space for player entities
	this.entityCount = 150;
}

Map.prototype.initTerrain = function(baseTerrain)
{
	for (let i = 0; i < this.size; ++i)
		for (let j = 0; j < this.size; ++j)
			baseTerrain.place(i, j);
};

Map.prototype.initHeight = function(height)
{
	for (let i = 0; i < this.size; ++i)
		for (let j = 0; j < this.size; ++j)
			this.height[i][j] = height;
};

// Return ID of texture (by name)
Map.prototype.getTextureID = function(texture)
{
	if (texture in this.nameToID)
		return this.nameToID[texture];

	// Add new texture
	let id = this.IDToName.length;
	this.nameToID[texture] = id;
	this.IDToName[id] = texture;

	return id;
};

// Return next free entity ID
Map.prototype.getEntityID = function()
{
	return this.entityCount++;
};

// Check bounds on tile map
Map.prototype.validT = function(x, z, distance = 0)
{
	distance += MAP_BORDER_WIDTH;

	if (isCircularMap())
	{
		let halfSize = Math.floor(this.size / 2);
		return Math.round(getDistance(x, z, halfSize, halfSize)) < halfSize - distance - 1;
	}
	else
		return x >= distance && z >= distance && x < this.size - distance && z < this.size - distance;
};

// Check bounds on tile map
Map.prototype.inMapBounds = function(x, z)
{
	return x >= 0 && z >= 0 && x < this.size && z < this.size;
};

// Check bounds on height map if TILE_CENTERED_HEIGHT_MAP==true then it's (size, size) otherwise (size + 1 by size + 1)
Map.prototype.validH = function(x, z)
{
	if (x < 0 || z < 0)
		return false;
	if (TILE_CENTERED_HEIGHT_MAP)
		return x < this.size && z < this.size;
	return x <= this.size && z <= this.size;
};

// Check bounds on tile class
Map.prototype.validClass = function(c)
{
	return c >= 0 && c < this.tileClasses.length;
};

Map.prototype.getTexture = function(x, z)
{
	if (!this.validT(x, z))
		throw "getTexture: invalid tile position (" + x + ", " + z + ")";

	return this.IDToName[this.texture[x][z]];
};

Map.prototype.setTexture = function(x, z, texture)
{
	if (!this.validT(x, z))
		throw "setTexture: invalid tile position (" + x + ", " + z + ")";

	this.texture[x][z] = this.getTextureID(texture);
};

Map.prototype.getHeight = function(x, z)
{
	if (!this.validH(x, z))
		throw "getHeight: invalid vertex position (" + x + ", " + z + ")";

	return this.height[x][z];
};

Map.prototype.setHeight = function(x, z, height)
{
	if (!this.validH(x, z))
		throw "setHeight: invalid vertex position (" + x + ", " + z + ")";

	this.height[x][z] = height;
};

Map.prototype.getTerrainObjects = function(x, z)
{
	if (!this.validT(x, z))
		throw "getTerrainObjects: invalid tile position (" + x + ", " + z + ")";

	return this.terrainObjects[x][z];
};

Map.prototype.setTerrainObject = function(x, z, object)
{
	if (!this.validT(x, z, 2))
		throw "setTerrainObject: invalid tile position (" + x + ", " + z + ")";

	this.terrainObjects[x][z] = object;
};

Map.prototype.placeTerrain = function(x, z, terrain)
{
	terrain.place(x, z);
};

Map.prototype.addObject = function(obj)
{
	this.objects.push(obj);
};

Map.prototype.createArea = function(placer, painter, constraint)
{
	// Check for multiple painters
	if (painter instanceof Array)
		painter = new MultiPainter(painter);

	if (constraint === undefined || constraint === null)
		constraint = new NullConstraint();
	else if (constraint instanceof Array)
		// Check for multiple constraints
		constraint = new AndConstraint(constraint);

	let points = placer.place(constraint);
	if (!points)
		return undefined;

	let newID = ++this.areaID;
	let area = new Area(points, newID);
	for (let p of points)
		this.area[p.x][p.z] = newID;

	painter.paint(area);

	return area;
};

Map.prototype.createObjectGroup = function(placer, player, constraint)
{
	if (!constraint)
		constraint = new NullConstraint();
	else if (constraint instanceof Array)
		constraint = new AndConstraint(constraint);

	return placer.place(player, constraint);
};

Map.prototype.createTileClass = function()
{
	let newID = this.tileClasses.length;
	this.tileClasses.push(new TileClass(this.size, newID));

	return newID;
};

// Get height taking into account terrain curvature
Map.prototype.getExactHeight = function(x, z)
{
	let xi = Math.min(Math.floor(x), this.size);
	let zi = Math.min(Math.floor(z), this.size);
	let xf = x - xi;
	let zf = z - zi;

	let h00 = this.height[xi][zi];
	let h01 = this.height[xi][zi + 1];
	let h10 = this.height[xi + 1][zi];
	let h11 = this.height[xi + 1][zi + 1];

	return (1 - zf) * ((1 - xf) * h00 + xf * h10) + zf * ((1 - xf) * h01 + xf * h11);
};

// Converts from the tile centered height map to the corner based height map, used when TILE_CENTERED_HEIGHT_MAP = true
Map.prototype.cornerHeight = function(x, z)
{
	let count = 0;
	let sumHeight = 0;

	for (let dir of [[-1, -1], [-1, 0], [0, -1], [0, 0]])
		if (this.validH(x + dir[0], z + dir[1]))
		{
			++count;
			sumHeight += this.height[x + dir[0]][z + dir[1]];
		}

	if (count == 0)
		return 0;

	return sumHeight / count;
};

Map.prototype.getFullEntityList = function(rotateForMapExport = false)
{
	// Change rotation from simple 2d to 3d befor giving to engine
	if (rotateForMapExport)
		for (let obj of this.objects)
			obj.rotation.y = PI / 2 - obj.rotation.y;

	// All non terrain objects
	let entities = this.objects;

	// Terrain objects e.g. trees
	let size = this.size;
	for (let x = 0; x < size; ++x)
		for (let z = 0; z < size; ++z)
			if (this.terrainObjects[x][z] !== undefined)
				entities.push(this.terrainObjects[x][z]);

	return entities;
};

Map.prototype.getMapData = function()
{
	let data = {};

	// Convert 2D heightmap array to flat array
	// Flat because it's easier to handle by the engine
	let mapSize = this.size + 1;
	let height = new Uint16Array(mapSize * mapSize);
	for (let x = 0; x < mapSize; ++x)
		for (let z = 0; z < mapSize; ++z)
		{
			let currentHeight;
			if (TILE_CENTERED_HEIGHT_MAP)
				currentHeight = this.cornerHeight(x, z);
			else
				currentHeight = this.height[x][z];

			// Correct height by SEA_LEVEL and prevent under/overflow in terrain data
			height[z * mapSize + x] = Math.max(0, Math.min(0xFFFF, Math.floor((currentHeight + SEA_LEVEL) * HEIGHT_UNITS_PER_METRE)));
		}

	data.height = height;
	data.seaLevel = SEA_LEVEL;

	// Terrain, map width in tiles
	data.size = this.size;

	// Get array of textures used in this map
	data.textureNames = this.IDToName;

	// Entities
	data.entities = this.getFullEntityList(true);
	log("Number of entities: "+ data.entities.length);

	//  Convert 2D tile data to flat array
	let tileIndex = new Uint16Array(this.size * this.size);
	let tilePriority = new Uint16Array(this.size * this.size);
	for (let x = 0; x < this.size; ++x)
		for (let z = 0; z < this.size; ++z)
		{
			// TODO: For now just use the texture's index as priority, might want to do this another way
			tileIndex[z * this.size + x] = this.texture[x][z];
			tilePriority[z * this.size + x] = this.texture[x][z];
		}

	data.tileData = { "index": tileIndex, "priority": tilePriority };

	return data;
};

/**
 * Global helpers simplifying API access.
 */

function placeObject(x, z, type, player, angle)
{
	if (g_Map.validT(x, z))
		g_Map.addObject(new Entity(type, player, x, z, angle));
}

function placeTerrain(x, z, terrain)
{
	g_Map.placeTerrain(x, z, createTerrain(terrain));
}

function modifyTilesBasedOnHeight(minHeight, maxHeight, mode, func)
{
	for (let qx = 0; qx < g_Map.size; ++qx)
		for (let qz = 0; qz < g_Map.size; ++qz)
		{
			let height = g_Map.getHeight(qx, qz);
			if (mode == 0 && height >  minHeight && height < maxHeight ||
			    mode == 1 && height >= minHeight && height < maxHeight ||
			    mode == 2 && height >  minHeight && height <= maxHeight ||
			    mode == 3 && height >= minHeight && height <= maxHeight)
			func(qx, qz);
		}
}

function paintTerrainBasedOnHeight(minHeight, maxHeight, mode, terrain)
{
	modifyTilesBasedOnHeight(minHeight, maxHeight, mode, (qx, qz) => {
		placeTerrain(qx, qz, terrain);
	});
}

function initTerrain(tileClass)
{
	g_Map.initTerrain(createTerrain(tileClass));
}

function initHeight(height)
{
	g_Map.initHeight(height);
}

function createTileClass()
{
	return g_Map.createTileClass();
}

function getTileClass(id)
{
	if (!g_Map.validClass(id))
		return undefined;

	return g_Map.tileClasses[id];
}

function createArea(placer, painter, constraint)
{
	return g_Map.createArea(placer, painter, constraint);
}

function createObjectGroup(placer, player, constraint)
{
	return g_Map.createObjectGroup(placer, player, constraint);
}

function getMapSize()
{
	return g_Map.size;
}

function getMapArea()
{
	return Math.pow(g_Map.size, 2);
}

function fractionToTiles(fraction)
{
	return g_Map.size * fraction;
}

function tilesToFraction(tiles)
{
	return tiles / g_Map.size;
}

function fractionToSize(fraction)
{
	return getMapArea() * fraction;
}

function areaToFraction(area)
{
	return area / getMapArea();
}

function scaleByMapSize(min, max, minMapSize = 128, maxMapSize = 512)
{
	return min + (max - min) * (g_Map.size - minMapSize) / (maxMapSize - minMapSize);
}

function getHeight(x, z)
{
	return g_Map.getHeight(x, z);
}

function setHeight(x, z, height)
{
	g_Map.setHeight(x, z, height);
}

function getTerrainTexture(x, y)
{
	return g_Map.getTexture(x, y);
}

/**
 * Retries the given function with those arguments as often as specified.
 */
function retryPlacing(placeFunc, placeArgs, retryFactor, amount, getResult, behaveDeprecated = false)
{
	if (behaveDeprecated && !(placeArgs.placer instanceof SimpleGroup || placeArgs.placer instanceof RandomGroup))
		warn("Deprecated version of createFoo should only be used for SimpleGroup and RandomGroup placers!");

	let maxFail = amount * retryFactor;

	let results = [];
	let good = 0;
	let bad = 0;

	while (good < amount && bad <= maxFail)
	{
		let result = placeFunc(placeArgs);

		if (result !== undefined || behaveDeprecated)
		{
			++good;
			if (getResult)
				results.push(result);
		}
		else
			++bad;
	}
	return getResult ? results : good;
}

/**
 * Helper function for randomly placing areas and groups on the map.
 */
function randomizePlacerCoordinates(placer, halfMapSize)
{
	if (isCircularMap())
	{
		// Polar coordinates
		// Uniformly distributed on the disk
		let r = halfMapSize * Math.sqrt(randFloat(0, 1));
		let theta = randFloat(0, 2 * PI);
		placer.x = Math.floor(r * Math.cos(theta)) + halfMapSize;
		placer.z = Math.floor(r * Math.sin(theta)) + halfMapSize;
	}
	else
	{
		// Rectangular coordinates
		placer.x = randIntExclusive(0, getMapSize());
		placer.z = randIntExclusive(0, getMapSize());
	}
}

/**
 * Helper function for randomly placing areas and groups in the given areas.
 */
function randomizePlacerCoordinatesFromAreas(placer, areas)
{
	let pt = pickRandom(pickRandom(areas).points);
	placer.x = pt.x;
	placer.z = pt.z;
}

// TODO this is a hack to simulate the old behaviour of those functions
// until all old maps are changed to use the correct version of these functions
function createObjectGroupsDeprecated(placer, player, constraint, amount, retryFactor = 10)
{
	return createObjectGroups(placer, player, constraint, amount, retryFactor, true);
}

function createObjectGroupsByAreasDeprecated(placer, player, constraint, amount, retryFactor, areas)
{
	return createObjectGroupsByAreas(placer, player, constraint, amount, retryFactor, areas, true);
}

/**
 * Attempts to place the given number of areas in random places of the map.
 * Returns actually placed areas.
 */
function createAreas(centeredPlacer, painter, constraint, amount, retryFactor = 10, behaveDeprecated = false)
{
	let placeFunc = function (args) {
		randomizePlacerCoordinates(args.placer, args.halfMapSize);
		return createArea(args.placer, args.painter, args.constraint);
	};

	let args = {
		"placer": centeredPlacer,
		"painter": painter,
		"constraint": constraint,
		"halfMapSize": getMapSize() / 2
	};

	return retryPlacing(placeFunc, args, retryFactor, amount, true, behaveDeprecated);
}

/**
 * Attempts to place the given number of areas in random places of the given areas.
 * Returns actually placed areas.
 */
function createAreasInAreas(centeredPlacer, painter, constraint, amount, retryFactor, areas, behaveDeprecated = false)
{
	if (!areas.length)
		return [];

	let placeFunc = function (args) {
		randomizePlacerCoordinatesFromAreas(args.placer, args.areas);
		return createArea(args.placer, args.painter, args.constraint);
	};

	let args = {
		"placer": centeredPlacer,
		"painter": painter,
		"constraint": constraint,
		"areas": areas,
		"halfMapSize": getMapSize() / 2
	};

	return retryPlacing(placeFunc, args, retryFactor, amount, true, behaveDeprecated);
}

/**
 * Attempts to place the given number of groups in random places of the map.
 * Returns the number of actually placed groups.
 */
function createObjectGroups(placer, player, constraint, amount, retryFactor = 10, behaveDeprecated = false)
{
	let placeFunc = function (args) {
		randomizePlacerCoordinates(args.placer, args.halfMapSize);
		return createObjectGroup(args.placer, args.player, args.constraint);
	};

	let args = {
		"placer": placer,
		"player": player,
		"constraint": constraint,
		"halfMapSize": getMapSize() / 2 - MAP_BORDER_WIDTH
	};

	return retryPlacing(placeFunc, args, retryFactor, amount, false, behaveDeprecated);
}

/**
 * Attempts to place the given number of groups in random places of the given areas.
 * Returns the number of actually placed groups.
 */
function createObjectGroupsByAreas(placer, player, constraint, amount, retryFactor, areas, behaveDeprecated = false)
{
	if (!areas.length)
		return 0;

	let placeFunc = function (args) {
		randomizePlacerCoordinatesFromAreas(args.placer, args.areas);
		return createObjectGroup(args.placer, args.player, args.constraint);
	};

	let args = {
		"placer": placer,
		"player": player,
		"constraint": constraint,
		"areas": areas
	};

	return retryPlacing(placeFunc, args, retryFactor, amount, false, behaveDeprecated);
}
