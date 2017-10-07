//TODO: delete these proxies and use the prototype
const PI = Math.PI;
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
