/**
 * Gets the default starting entities for the civ of the given player, as defined by the civ JSON file.
 */
function getStartingEntities(playerID)
{
	let civ = getCivCode(playerID);

	if (!g_CivData[civ] || !g_CivData[civ].StartEntities || !g_CivData[civ].StartEntities.length)
	{
		warn("Invalid or unimplemented civ '" + civ + "' specified, falling back to '" + FALLBACK_CIV + "'");
		civ = FALLBACK_CIV;
	}

	return g_CivData[civ].StartEntities;
}

function getStartingUnits(playerID)
{
	return getStartingEntities(playerID).filter(ent => ent.Template.startsWith("units/"));
}

/**
 * Places the given civEntities at the given location (typically a civic center and starting units).
 * civEntities must be a subset of the civ JSON file.
 */
function placeStartingEntities(fx, fz, playerID, civEntities, dist = 6, orientation = BUILDING_ORIENTATION)
{
	let i = 0;
	let firstTemplate = civEntities[i].Template;
	if (firstTemplate.startsWith("structures/"))
	{
		log("Place the civic center...");
		placeObject(fx, fz, firstTemplate, playerID, orientation);
		++i;
	}

	log("Place the units around the civic center...");
	let space = 2;
	for (let j = i; j < civEntities.length; ++j)
	{
		let angle = orientation - Math.PI * (2 - j) / 2;
		let count = civEntities[j].Count || 1;

		for (let num = 0; num < count; ++num)
			placeObject(
				fx + dist * Math.cos(angle) + space * (-num + 0.75 * Math.floor(count / 2)) * Math.sin(angle),
				fz + dist * Math.sin(angle) + space * (num - 0.75 * Math.floor(count / 2)) * Math.cos(angle),
				civEntities[j].Template,
				playerID,
				angle);
	}
}

/**
 * Places the default starting entities as defined by the civ json file, and walls for Iberians.
 *
 * @param iberWalls - Either "walls", "towers" or false.
 */
function placeCivDefaultEntities(fx, fz, playerID, iberWalls, dist = 6, orientation = BUILDING_ORIENTATION)
{
	placeStartingEntities(fx, fz, playerID, getStartingEntities(playerID - 1), dist, orientation);

	let civ = getCivCode(playerID - 1);
	if (civ == 'iber' && iberWalls && getMapSize() > 128)
	{
		if (iberWalls == 'towers')
			placePolygonalWall(fx, fz, 15, ['entry'], 'tower', civ, playerID, orientation, 7);
		else
			placeGenericFortress(fx, fz, 20, playerID);
	}
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
	let playerX = [];
	let playerZ = [];
	let playerAngle = [];

	let startAngle = randFloat(0, 2 * Math.PI);

	for (let i = 0; i < getNumPlayers(); ++i)
	{
		playerAngle[i] = startAngle + i * 2 * Math.PI / getNumPlayers();
		playerX[i] = 0.5 + percentRadius * Math.cos(playerAngle[i]);
		playerZ[i] = 0.5 + percentRadius * Math.sin(playerAngle[i]);
	}

	return [sortAllPlayers(), playerX, playerZ, playerAngle, startAngle];
}
