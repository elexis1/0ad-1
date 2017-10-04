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

function cos(x)
{
	return Math.cos(x);
}

function sin(x)
{
	return Math.sin(x);
}

function abs(x) {
	return Math.abs(x);
}

function round(x)
{
	return Math.round(x);
}

function sqrt(x)
{
	return Math.sqrt(x);
}

function ceil(x)
{
	return Math.ceil(x);
}

function floor(x)
{
	return Math.floor(x);
}

function max(a, b)
{
	return a > b ? a : b;
}

function min(a, b)
{
	return a < b ? a : b;
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
