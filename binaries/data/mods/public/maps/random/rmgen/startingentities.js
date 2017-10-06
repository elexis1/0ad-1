var g_NomadTreasureTemplates = {
	"food": "gaia/special_treasure_food_jars",
	"wood": "gaia/special_treasure_wood",
	"stone": "gaia/special_treasure_stone",
	"metal": "gaia/special_treasure_metal"
};

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
function placeCivDefaultStartingEntities(fx, fz, playerID, iberWalls, dist = 6, orientation = BUILDING_ORIENTATION)
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

function placeCivDefaultStartingEntitiesNomad(playerIDs, playerX, playerZ, treasure)
{
	for (let i = 0; i < getNumPlayers(); ++i)
	{
		log("Creating units for player " + playerIDs[i] + "...");

		let civEntities = getStartingUnits(playerIDs[i] - 1);
		let angle = randFloat(0, 2 * Math.PI);

		for (let j = 0; j < civEntities.length; ++j)
		{
			let count = civEntities[j].Count || 1;
			let jx = fractionToTiles(playerX[i]) + Math.cos(angle);
			let jz = fractionToTiles(playerZ[i]) + Math.sin(angle);
			let kAngle = randFloat(0, 2 * Math.PI);

			for (let k = 0; k < count; ++k)
			{
				let ang = kAngle + k / count * 2 * Math.PI;
				placeObject(jx + Math.cos(ang), jz + Math.sin(ang), civEntities[j].Template, playerIDs[i], randFloat(0, 2 * Math.PI));
			}
			angle += 2/3 * Math.PI;
		}

		if (!treasure)
			continue;

		log("Ensure resources for a civic center...")
		let ccCost = RMS.GetTemplate("structures/" + getCivCode(playerIDs[i] - 1) + "_civil_centre").Cost.Resources;
		let treasures = [];
		for (let resourceType in ccCost)
		{
			let treasureTemplate = g_NomadTreasureTemplates[resourceType];
			treasures.push({
				"template": treasureTemplate,
				"count": Math.max(0, Math.ceil((ccCost[resourceType] - (g_MapSettings.StartingResources || 0)) / RMS.GetTemplate(treasureTemplate).ResourceSupply.Amount)),
				"minDist": 3,
				"maxDist": 5
			});
		}
	    createDefaultTreasure({
	        "playerID": playerIDs[i],
	        "playerX": playerX[i],
	        "playerZ": playerZ[i],
	        "baseResourceClass": clBaseResource,
	        "types": treasures
	    });
	}
}

function placeDefaultPlayerBases(args)
{
	let [playerIDs, playerX, playerZ] = args.playerPlacement;

	for (let i = 0; i < getNumPlayers(); ++i)
	{
		args.playerID = playerIDs[i];
		args.playerX = playerX[i];
		args.playerZ = playerZ[i];
		placeDefaultPlayerBase(args);
	}
}

function placeDefaultPlayerBase(args)
{
	log("Creating base for player " + args.playerID + "...");

	let fx = fractionToTiles(args.playerX);
	let fz = fractionToTiles(args.playerZ);

	placeCivDefaultStartingEntities(fx, fz, args.playerID, args.iberWalls !== undefined ? args.iberWalls : "walls");

	if (args.playerTileClass !== undefined)
		addCivicCenterAreaToClass(Math.round(fx), Math.round(fz), args.playerTileClass);

	let defaultBaseFunctions = {
		// Possibly mark player class first here
		"cityPatch": placeDefaultCityPatch,
		// Create the largest and most important objects first
		"trees": placeDefaultTrees,
		"mines": createDefaultMines,
		"treasures": createDefaultTreasure,
		"berries": placeDefaultBerries,
		"chicken": placeDefaultChicken,
		"decoratives": placeDefaultDecoratives
	};

	for (let baseFuncID in defaultBaseFunctions)
	{
		if (!args[baseFuncID])
			continue;

		let args2 = args[baseFuncID];

		// Copy some global arguments to the arguments for each function
		for(let prop of ["playerID", "playerX", "playerZ", "baseResourceClass", "baseResourceConstraint"])
			args2[prop] = args[prop];

		defaultBaseFunctions[baseFuncID](args2);
	}
}

function getDefaultPlayerTerritoryRadius()
{
	return scaleByMapSize(15, 25);
}

function getDefaultPlayerTerritoryArea()
{
	return Math.PI * Math.pow(getDefaultPlayerTerritoryRadius(), 2);
}

function addCivicCenterAreaToClass(ix, iz, tileClass)
{
	addToClass(ix, iz, tileClass);

	addToClass(ix, iz + 5, tileClass);
	addToClass(ix, iz - 5, tileClass);

	addToClass(ix + 5, iz, tileClass);
	addToClass(ix - 5, iz, tileClass);
}

function getDefaultBaseArgs(args)
{
	let baseResourceConstraint = args.baseResourceClass && avoidClasses(args.baseResourceClass, 4);

	if (args.baseResourceConstraint)
		baseResourceConstraint = new AndConstraint([baseResourceConstraint, args.baseResourceConstraint]);

	return [
		(property, defaultVal) => args[property] === undefined ? defaultVal : args[property],
		fractionToTiles(args.playerX),
		fractionToTiles(args.playerZ),
		baseResourceConstraint
	];
}

/**
 * Execute the given base function for each player at the player location.
 */
function defaultBaseFunctionForEachPlayer(func, args, uncloneableProperties = [])
{
	for (let i = 0; i < getNumPlayers(); ++i)
	{
		let args2 = {};

		for (let prop in args)
			args2[prop] = uncloneableProperties.indexOf(prop) != -1 ? args[prop] : clone(args[prop]);

		if (args.playerIDs)
			args2.playerID = args.playerIDs[i];

		args2.playerX = args.playerX[i];
		args2.playerZ = args.playerZ[i];

		func(args2);
	}
}

function placeDefaultCityPatches(args)
{
	defaultBaseFunctionForEachPlayer(placeDefaultCityPatch, args, ["painters"]);
}

/**
 * @property tileClass - optionally mark the entire city patch with a tile class
 */
function placeDefaultCityPatch(args)
{
	let [get, fx, fz, baseResourceConstraint] = getDefaultBaseArgs(args);

	let painters = [];

	if (args.innerTerrain && args.outerTerrain)
		painters.push(new LayeredPainter([args.innerTerrain, args.outerTerrain], [get("width", 1)]));

	if (args.painters)
		painters = painters.concat(args.painters);

	createArea(
		new ClumpPlacer(
			Math.floor(Math.PI * Math.pow(get("radiusFactor", 1/3) * get("radius", getDefaultPlayerTerritoryRadius()), 2)),
			get("coherence", 0.6),
			get("smoothness", 0.3),
			get("failFraction", 10),
			Math.round(fx),
			Math.round(fz)),
		painters,
		null);
}

function placeDefaultChicken(args)
{
	let [get, fx, fz, baseResourceConstraint] = getDefaultBaseArgs(args);

	for (let j = 0; j < get("count", 2); ++j)
		for (let tries = 0; tries < get("maxTries", 30); ++tries)
		{
			let angle = randFloat(0, 2 * Math.PI);
			if (createObjectGroup(
				new SimpleGroup(
					[new SimpleObject(get("template", "gaia/fauna_chicken"), 5, 5, 0, get("count", 2))],
					true,
					args.baseResourceClass,
					Math.round(fx + get("dist", 9) * Math.cos(angle)),
					Math.round(fz + get("dist", 9) * Math.sin(angle))),
				0,
				baseResourceConstraint))
				return;
		}
	error("Could not place chicken for player " + args.playerID);
}

function placeDefaultBerries(args)
{
	let [get, fx, fz, baseResourceConstraint] = getDefaultBaseArgs(args);
	for (let tries = 0; tries < get("maxTries", 30); ++tries)
	{
		let angle = randFloat(0, 2 * Math.PI);
		if (createObjectGroup(
			new SimpleGroup(
				[new SimpleObject(
					get("template", "gaia/flora_bush_berry"),
					get("minCount", 5),
					get("maxCount", 5),
					get("maxDist", 1),
					get("maxDist", 3))
				],
				true,
				args.baseResourceClass,
				Math.round(fx + get("dist", 12) * Math.cos(angle)),
				Math.round(fz + get("dist", 12) * Math.sin(angle))),
			0,
			baseResourceConstraint))
			return;
	}
	error("Could not place berries for player " + args.playerID);
}

function createDefaultMines(args)
{
	let [get, fx, fz, baseResourceConstraint] = getDefaultBaseArgs(args);

	let angleBetweenMines = randFloat(get("minAngle", Math.PI / 6), get("minAngle", Math.PI / 3));
	let mineCount = args.types.length;

	let groupElements = [];
	if (args.groupElements)
		groupElements = groupElements.concat(args.groupElements);

	for (let tries = 0; tries < get("maxTries", 30); ++tries)
	{
		// First find a place where all mines can be placed
		let ix = [];
		let iz = [];
		let success = true;
		let chosenAngle = randFloat(0, 2 * Math.PI);
		for (let i = 0; i < mineCount; ++i)
		{
			let angle = chosenAngle + angleBetweenMines * (i + (mineCount - 1) / 2);

			ix[i] = Math.round(fx + get("dist", 12) * Math.cos(angle));
			iz[i] = Math.round(fz + get("dist", 12) * Math.sin(angle));

			if (!g_Map.validT(ix[i], iz[i]) || !baseResourceConstraint.allows(ix[i], iz[i]))
			{
				success = false;
				break;
			}
		}

		if (!success)
			continue;

		// Place the mines
		for (let i = 0; i < mineCount; ++i)
		{
			if (args.types[i].type && args.types[i].type == "stone_formation")
			{
				createStoneMineFormation(ix[i], iz[i], args.types[i].template, args.types[i].terrain);
				addToClass(ix[i], iz[i], args.baseResourceClass);
				continue;
			}

			createObjectGroup(
				new SimpleGroup(
					[new SimpleObject(args.types[i].template, 1, 1, 0, 0)].concat(groupElements),
					true,
					args.baseResourceClass,
					ix[i],
					iz[i]),
				0);
		}
		return;
	}
	error("Could not place mines for player " + args.playerID);
}

function placeDefaultTrees(args)
{
	let [get, fx, fz, baseResourceConstraint] = getDefaultBaseArgs(args);
	let num = Math.floor(Math.PI * Math.pow(get("radiusFactor", 1 / 7.5) * get("radius", getDefaultPlayerTerritoryRadius()), 2));

	for (let x = 0; x < get("maxTries", 30); ++x)
	{
		let angle = randFloat(0, 2 * Math.PI);
		let dist = randFloat(get("minDist", 11), get("maxDist", 13));

		if (createObjectGroup(
			new SimpleGroup(
				[new SimpleObject(args.template, num, num, get("minDistGroup", 1), get("maxDistGroup", 4))],
				false,
				args.baseResourceClass,
				Math.round(fx + dist * Math.cos(angle)),
				Math.round(fz + dist * Math.sin(angle))),
			0,
			baseResourceConstraint))
			return;
	}
	error("Could not place starting trees for player " + args.playerID);
}

function createDefaultTreasure(args)
{
	let [get, fx, fz, baseResourceConstraint] = getDefaultBaseArgs(args);

	for (let resourceTypeArgs of args.types)
	{
		get = (property, defaultVal) => args[property] === undefined ? defaultVal : args[property];

		for (let tries = 0; tries < get("maxTries", 30); ++tries)
		{
			let angle = randFloat(0, 2 * Math.PI);
			let dist = randFloat(get("minDist", 11), get("maxDist", 13));

			if (createObjectGroup(
				new SimpleGroup(
					[new SimpleObject(resourceTypeArgs.template, get("count", 14), get("count", 14), get("minDistGroup", 1), get("maxDistGroup", 3))],
					false,
					args.baseResourceClass,
					Math.round(fx + dist * Math.cos(angle)),
					Math.round(fz + dist * Math.sin(angle))),
				0,
				baseResourceConstraint))
				return;
		}
	}

	error("Could not place treasure " + args.template + " for player " + args.playerID);
}

/**
 * Typically used for placing grass tufts around the civic centers.
 */
function placeDefaultDecoratives(args)
{
	let [get, fx, fz, baseResourceConstraint] = getDefaultBaseArgs(args);

	for (let i = 0; i < Math.PI * Math.pow(get("radiusFactor", 1 / 15) * getDefaultPlayerTerritoryRadius(), 2); ++i)
		for (let x = 0; x < get("maxTries", 30); ++x)
		{
			let angle = randFloat(0, 2 * PI);
			let dist = randIntInclusive(get("minDist", 6), get("maxDist", 11));

			if (createObjectGroup(
				new SimpleGroup(
					[new SimpleObject(
						args.template,
						get("minCount", 2),
						get("maxCount", 5),
						0,
						1)
					],
					false,
					args.baseResourceClass,
					Math.round(fx + dist * Math.cos(angle)),
					Math.round(fz + dist * Math.sin(angle))
				),
				0,
				baseResourceConstraint))
				return;
		}

	error("Could not place decoratives for player " + args.playerID);
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

function placePlayersRadial(percentRadius = 0.35)
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

/***
 * Places players in a row of 2 players width.
 */
function placePlayersLine(horizontal, center, width)
{
	let playerX = [];
	let playerZ = [];
	let numPlayers = getNumPlayers();

	for (let i = 0; i < numPlayers; ++i)
	{
		playerX[i] = (i + 1) / (numPlayers + 1);
		playerZ[i] = center + width * (i % 2 - 1/2);

		if (!horizontal)
			[playerX[i], playerZ[i]] = [playerZ[i], playerX[i]];
	}

	return [sortAllPlayers(), playerX, playerZ];
}

/**
 * Returns an array of percent numbers indicating the player location on river maps.
 * For example [0.2, 0.2, 0.4, 0.4, 0.6, 0.6, 0.8, 0.8] for a 4v4 or
 * [0.25, 0.33, 0.5, 0.67, 0.75] for a 2v3.
 */
function placePlayersRiver(horizontal, width, angle)
{
	let playerX = [];
	let playerZ = [];

	let numPlayers = getNumPlayers();
	let numPlayersEven = numPlayers % 2 == 0;

	for (let i = 0; i < numPlayers; ++i)
	{
		let currentPlayerEven = i % 2 == 0;

		let offsetDivident = numPlayersEven || currentPlayerEven ? (i + 1) % 2 : 0;
		let offsetDivisor = numPlayersEven ? 0 : currentPlayerEven ? +1 : -1;

		let pos = [
			width * (i % 2) + (1 - width) / 2,
			((i - 1 + offsetDivident) / 2 + 1) / ((numPlayers + offsetDivisor) / 2 + 1)
		];

		[playerX[i], playerZ[i]] = horizontal ? pos.reverse() : pos;
	}

	[playerX, playerZ] = rotatePlayerCoordinates(playerX, playerZ, angle);

	return [primeSortAllPlayers(), playerX, playerZ];
}

/**
 * Determines random starting positions for nomad units, ensuring a minimum distance
 * between players and that isValid is true for the starting positions.
 */
function placePlayersNomad(isValid)
{
	let minDist = Math.pow(scaleByMapSize(60, 240), 2);

	let playerX = [];
	let playerZ = [];
	let numPlayers = getNumPlayers();

	log("Finding nomad spawn points that are far enough away from other players...");
	for (let i = 0; i < numPlayers; ++i)
	{
		let placableArea = [];

		// Try shorter distance between players if needed
		for (let distFactor of [1, 1/4, 0])
		{
			for (let ix = 0; ix < mapSize; ++ix)
				for (let iz = 0; iz < mapSize; ++iz)
				{
					if (!g_Map.validT(ix, iz, 3) || !isValid(ix, iz))
						continue;

					let placable = true;
					for (let otherPlayer = 0; otherPlayer < i; ++otherPlayer)
						if (Math.pow(playerX[otherPlayer] - ix, 2) + Math.pow(playerZ[otherPlayer] - iz, 2) < minDist * distFactor)
							placable = false;

					if (placable)
						placableArea.push([ix, iz]);
				}

			if (placableArea.length)
				break;
		}

		[playerX[i], playerZ[i]] = pickRandom(placableArea);
	}

	return [sortAllPlayers(), playerX.map(t => tilesToFraction(t)), playerZ.map(t => tilesToFraction(t))];
}

function rotatePlayerCoordinates(playerX, playerZ, angle, centerX = 0.5, centerZ = 0.5)
{
	for (let i = 0; i < getNumPlayers(); ++i)
		[playerX[i], playerZ[i]] = rotateCoordinates(playerX[i], playerZ[i], angle, centerX, centerZ);

	return [playerX, playerZ];
}
