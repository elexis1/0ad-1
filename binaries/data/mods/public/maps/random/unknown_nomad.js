RMS.LoadLibrary("rmgen");
RMS.LoadLibrary("rmbiome");
RMS.LoadLibrary("unknown");

var treasureTemplates = {
	"food": "gaia/special_treasure_food_jars",
	"wood": "gaia/special_treasure_wood",
	"stone": "gaia/special_treasure_stone",
	"metal": "gaia/special_treasure_metal"
};

createUnknownMap(false, true);

var playerIDs = sortAllPlayers();
var playerX = [];
var playerZ = [];

var distmin = Math.pow(scaleByMapSize(60, 240), 2);

for (var i = 0; i < numPlayers; i++)
{
	var placableArea = [];
	for (var mx = 0; mx < mapSize; mx++)
		for (var mz = 0; mz < mapSize; mz++)
		{
			if (!g_Map.validT(mx, mz, 3))
				continue;

			var placable = true;
			for (var c = 0; c < i; c++)
				if ((playerX[c] - mx)*(playerX[c] - mx) + (playerZ[c] - mz)*(playerZ[c] - mz) < distmin)
					placable = false;
			if (!placable)
				continue;

			if (g_Map.getHeight(mx, mz) >= 3 && g_Map.getHeight(mx, mz) <= 3.12)
				placableArea.push([mx, mz]);
		}

	if (!placableArea.length)
		for (var mx = 0; mx < mapSize; ++mx)
			for (var mz = 0; mz < mapSize; mz++)
			{
				if (!g_Map.validT(mx, mz, 3))
					continue;

				var placable = true;
				for (var c = 0; c < i; c++)
					if ((playerX[c] - mx)*(playerX[c] - mx) + (playerZ[c] - mz)*(playerZ[c] - mz) < distmin/4)
						placable = false;
				if (!placable)
					continue;

				if (g_Map.getHeight(mx, mz) >= 3 && g_Map.getHeight(mx, mz) <= 3.12)
					placableArea.push([mx, mz]);
			}

	if (!placableArea.length)
		for (var mx = 0; mx < mapSize; ++mx)
			for (var mz = 0; mz < mapSize; ++mz)
				if (g_Map.getHeight(mx, mz) >= 3 && g_Map.getHeight(mx, mz) <= 3.12)
					placableArea.push([mx, mz]);

	[playerX[i], playerZ[i]] = pickRandom(placableArea);
}

for (let i = 0; i < numPlayers; ++i)
{
	let id = playerIDs[i];
	log("Creating units for player " + id + "...");

	var ix = playerX[i];
	var iz = playerZ[i];
	var civEntities = getStartingEntities(id-1);
	var angle = randFloat(0, TWO_PI);
	for (var j = 0; j < civEntities.length; ++j)
	{
		// TODO: Make an rmlib function to get only non-structure starting entities and loop over those
		if (!civEntities[j].Template.startsWith("units/"))
			continue;

		var count = civEntities[j].Count || 1;
		var jx = ix + 2 * cos(angle);
		var jz = iz + 2 * sin(angle);
		var kAngle = randFloat(0, TWO_PI);
		for (var k = 0; k < count; ++k)
			placeObject(jx + cos(kAngle + k*TWO_PI/count), jz + sin(kAngle + k*TWO_PI/count), civEntities[j].Template, id, randFloat(0, TWO_PI));
		angle += TWO_PI / 3;
	}

	log("Ensure resources for a civic center...")
	let ccCost = RMS.GetTemplate("structures/" + getCivCode(id - 1) + "_civil_centre").Cost.Resources;
	let treasures = [];
	for (let resourceType in ccCost)
	{
		let treasureTemplate = treasureTemplates[resourceType];
		treasures.push({
			"template": treasureTemplate,
			"count": Math.max(0, Math.ceil((ccCost[resourceType] - (g_MapSettings.StartingResources || 0)) / RMS.GetTemplate(treasureTemplate).ResourceSupply.Amount)),
			"minDist": 3,
			"maxDist": 5
		});
	}

	createDefaultTreasure({
		"playerID": playerIDs[i],
		"playerX": tilesToFraction(playerX[i]),
		"playerZ": tilesToFraction(playerZ[i]),
		"baseResourceClass": clBaseResource,
		"types": treasures
	});
}

// Mark the spawn area as clPlayer
placeDefaultCityPatches({
	"playerIDs": playerIDs,
	// Don't paint terrain
	"playerX": playerX,
	"playerZ": playerZ,
	"radius": scaleByMapSize(18, 32),
	"painters": [
		paintClass(clPlayer)
	]
});

createUnknownObjects();

ExportMap();
