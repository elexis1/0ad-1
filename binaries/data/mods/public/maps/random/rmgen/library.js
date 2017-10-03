//TODO: delete these proxies and use the prototype
const PI = Math.PI;
const TWO_PI = 2 * Math.PI;
const sin = Math.sin;
const cos = Math.cos;
const sqrt = Math.sqrt;
const min = Math.min;
const max = Math.max;
const floor = Math.floor;
const ceil = Math.ceil;
const round = Math.round;
const abs = Math.abs;

const TERRAIN_SEPARATOR = "|";
const SEA_LEVEL = 20.0;
const CELL_SIZE = 4;
const HEIGHT_UNITS_PER_METRE = 92;
const MIN_MAP_SIZE = 128;
const MAX_MAP_SIZE = 512;

// TODO: Shouldn't have to keep in sync with CCmpRangeManager::LosIsOffWorld, CCmpPathfinder::UpdateGrid,TerrainUpdateHelper
const MAP_BORDER_WIDTH = 3;

const FALLBACK_CIV = "athen";
/**
 * Constants needed for heightmap_manipulation.js
 */
const MAX_HEIGHT_RANGE = 0xFFFF / HEIGHT_UNITS_PER_METRE; // Engine limit, Roughly 700 meters
const MIN_HEIGHT = - SEA_LEVEL;
const MAX_HEIGHT = MAX_HEIGHT_RANGE - SEA_LEVEL;
// Default angle for buildings
const BUILDING_ORIENTATION = - PI / 4;

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

function isCircularMap()
{
	return !!g_MapSettings.CircularMap;
}

function getMapBaseHeight()
{
	return g_MapSettings.BaseHeight;
}

function getNumPlayers()
{
	return g_MapSettings.PlayerData.length - 1;
}

function getCivCode(player)
{
	if (g_MapSettings.PlayerData[player+1].Civ)
		return g_MapSettings.PlayerData[player+1].Civ;

	warn("undefined civ specified for player " + (player + 1) + ", falling back to '" + FALLBACK_CIV + "'");
	return FALLBACK_CIV;
}

function areAllies(player1, player2)
{
	if (g_MapSettings.PlayerData[player1+1].Team === undefined ||
		g_MapSettings.PlayerData[player2+1].Team === undefined ||
		g_MapSettings.PlayerData[player2+1].Team == -1 ||
		g_MapSettings.PlayerData[player1+1].Team == -1)
		return false;

	return g_MapSettings.PlayerData[player1+1].Team === g_MapSettings.PlayerData[player2+1].Team;
}

function getPlayerTeam(player)
{
	if (g_MapSettings.PlayerData[player+1].Team === undefined)
		return -1;

	return g_MapSettings.PlayerData[player+1].Team;
}

/**
 * Sorts an array of player IDs by team index. Players without teams come first.
 * Randomize order for players of the same team.
 */
function sortPlayers(playerIndices)
{
	return shuffleArray(playerIndices).sort((p1, p2) => getPlayerTeam(p1 - 1) - getPlayerTeam(p2 - 1));
}

/**
 * Mix player indices but sort by team.
 *
 * @returns {Array} - every item is an array of player indices
 */
function sortAllPlayers()
{
	let playerIDs = [];
	for (let i = 0; i < getNumPlayers(); ++i)
		playerIDs.push(i+1);

	return sortPlayers(playerIDs);
}

function primeSortPlayers(playerIndices)
{
	if (!playerIndices.length)
		return [];

	let prime = [];
	for (let i = 0; i < Math.ceil(playerIndices.length / 2); ++i)
	{
		prime.push(playerIndices[i]);
		prime.push(playerIndices[playerIndices.length - 1 - i]);
	}

	return prime;
}

function primeSortAllPlayers()
{
	return primeSortPlayers(sortAllPlayers());
}

function radialPlayerPlacement(percentRadius = 0.35)
{
	let playerIDs = sortAllPlayers();

	let playerX = [];
	let playerZ = [];
	let playerAngle = [];

	let startAngle = randFloat(0, TWO_PI);

	for (let i = 0; i < getNumPlayers(); ++i)
	{
		playerAngle[i] = startAngle + i * TWO_PI / getNumPlayers();
		playerX[i] = 0.5 + percentRadius * Math.cos(playerAngle[i]);
		playerZ[i] = 0.5 + percentRadius * Math.sin(playerAngle[i]);
	}

	return [playerIDs, playerX, playerZ, playerAngle, startAngle];
}

/**
 * Returns an array of percent numbers indicating the player location on river maps.
 * For example [0.2, 0.2, 0.4, 0.4, 0.6, 0.6, 0.8, 0.8] for a 4v4 or
 * [0.25, 0.33, 0.5, 0.67, 0.75] for a 2v3.
 */
function placePlayersRiver()
{
	let playerPos = [];
	let numPlayers = getNumPlayers();
	let numPlayersEven = numPlayers % 2 == 0;

	for (let i = 0; i < numPlayers; ++i)
	{
		let currentPlayerEven = i % 2 == 0;

		let offsetDivident = numPlayersEven || currentPlayerEven ? (i + 1) % 2 : 0;
		let offsetDivisor = numPlayersEven ? 0 : currentPlayerEven ? +1 : -1;

		playerPos[i] = ((i - 1 + offsetDivident) / 2 + 1) / ((numPlayers + offsetDivisor) / 2 + 1);
	}

	return playerPos;
}

function getStartingEntities(player)
{
	let civ = getCivCode(player);

	if (!g_CivData[civ] || !g_CivData[civ].StartEntities || !g_CivData[civ].StartEntities.length)
	{
		warn("Invalid or unimplemented civ '"+civ+"' specified, falling back to '" + FALLBACK_CIV + "'");
		civ = FALLBACK_CIV;
	}

	return g_CivData[civ].StartEntities;
}

/**
 * Returns the distance between 2 points
 */
function getDistance(x1, z1, x2, z2)
{
	return Math.pow(Math.pow(x1 - x2, 2) + Math.pow(z1 - z2, 2), 1/2);
}

/**
 * Returns the angle of the vector between point 1 and point 2.
 * The angle is counterclockwise from the positive x axis.
 */
function getAngle(x1, z1, x2, z2)
{
	return Math.atan2(z2 - z1, x2 - x1);
}

/**
 * Returns the gradient of the line between point 1 and 2 in the form dz/dx
 */
function getGradient(x1, z1, x2, z2)
{
	if (x1 == x2 && z1 == z2)
		return 0;

	return (z1-z2)/(x1-x2);
}

function addCivicCenterAreaToClass(ix, iz, tileClass)
{
	addToClass(ix, iz, tileClass);

	addToClass(ix, iz + 5, tileClass);
	addToClass(ix, iz - 5, tileClass);

	addToClass(ix + 5, iz, tileClass);
	addToClass(ix - 5, iz, tileClass);
}

/**
 * Returns the order to go through the points for the shortest closed path (array of indices)
 * @param {array} [points] - Points to be sorted of the form { "x": x_value, "y": y_value }
 */
function getOrderOfPointsForShortestClosePath(points)
{
	let order = [];
	let distances = [];
	if (points.length <= 3)
	{
		for (let i = 0; i < points.length; ++i)
			order.push(i);

		return order;
	}

	// Just add the first 3 points
	let pointsToAdd = clone(points);
	for (let i = 0; i < 3; ++i)
	{
		order.push(i);
		pointsToAdd.shift(i);
		if (i)
			distances.push(getDistance(points[order[i]].x, points[order[i]].y, points[order[i - 1]].x, points[order[i - 1]].y));
	}

	distances.push(getDistance(
		points[order[0]].x,
		points[order[0]].y,
		points[order[order.length - 1]].x,
		points[order[order.length - 1]].y));

	// Add remaining points so the path lengthens the least
	let numPointsToAdd = pointsToAdd.length;
	for (let i = 0; i < numPointsToAdd; ++i)
	{
		let indexToAddTo;
		let minEnlengthen = Infinity;
		let minDist1 = 0;
		let minDist2 = 0;
		for (let k = 0; k < order.length; ++k)
		{
			let dist1 = getDistance(pointsToAdd[0].x, pointsToAdd[0].y, points[order[k]].x, points[order[k]].y);
			let dist2 = getDistance(pointsToAdd[0].x, pointsToAdd[0].y, points[order[(k + 1) % order.length]].x, points[order[(k + 1) % order.length]].y);
			let enlengthen = dist1 + dist2 - distances[k];
			if (enlengthen < minEnlengthen)
			{
				indexToAddTo = k;
				minEnlengthen = enlengthen;
				minDist1 = dist1;
				minDist2 = dist2;
			}
		}
		order.splice(indexToAddTo + 1, 0, i + 3);
		distances.splice(indexToAddTo, 1, minDist1, minDist2);
		pointsToAdd.shift();
	}

	return order;
}
