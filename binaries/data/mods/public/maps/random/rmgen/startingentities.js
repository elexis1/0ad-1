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

function radialPlayerPlacement(radius = 0.35, startingAngle = undefined, centerX = 0.5, centerZ = 0.5)
{
	let startAngle = startingAngle !== undefined ? startingAngle : randFloat(0, 2 * Math.PI);
	return [sortAllPlayers(), ...distributePointsOnCircle(getNumPlayers(), startAngle, radius, centerX, centerZ), startAngle];
}

/**
 * Sorts the playerIDs so that team members are as close as possible.
 */
function sortPlayersByLocation(startLocations)
{
	// Sort start locations to form a "ring"
	let startLocationOrder = sortPointsShortestCycle(startLocations);

	let newStartLocations = [];
	for (let i = 0; i < startLocations.length; ++i)
		newStartLocations.push(startLocations[startLocationOrder[i]]);

	startLocations = newStartLocations;

	// Sort players by team
	let playerIDs = [];
	let teams = [];
	for (let i = 0; i < g_MapSettings.PlayerData.length - 1; ++i)
	{
		playerIDs.push(i+1);
		let t = g_MapSettings.PlayerData[i + 1].Team;
		if (teams.indexOf(t) == -1 && t !== undefined)
			teams.push(t);
	}

	playerIDs = sortPlayers(playerIDs);

	if (!teams.length)
		return [playerIDs, startLocations];

	// Minimize maximum distance between players within a team
	let minDistance = Infinity;
	let bestShift;
	for (let s = 0; s < playerIDs.length; ++s)
	{
		let maxTeamDist = 0;
		for (let pi = 0; pi < playerIDs.length - 1; ++pi)
		{
			let p1 = playerIDs[(pi + s) % playerIDs.length] - 1;
			let t1 = getPlayerTeam(p1);

			if (teams.indexOf(t1) === -1)
				continue;

			for (let pj = pi + 1; pj < playerIDs.length; ++pj)
			{
				let p2 = playerIDs[(pj + s) % playerIDs.length] - 1;
				if (t1 != getPlayerTeam(p2))
					continue;

				maxTeamDist = Math.max(
					maxTeamDist,
					getDistance(
						startLocations[pi].x,
						startLocations[pi].y,
						startLocations[pj].x,
						startLocations[pj].y));
			}
		}

		if (maxTeamDist < minDistance)
		{
			minDistance = maxTeamDist;
			bestShift = s;
		}
	}

	if (bestShift)
	{
		let newPlayerIDs = [];
		for (let i = 0; i < playerIDs.length; ++i)
			newPlayerIDs.push(playerIDs[(i + bestShift) % playerIDs.length]);
		playerIDs = newPlayerIDs;
	}

	return [playerIDs, startLocations];
}
