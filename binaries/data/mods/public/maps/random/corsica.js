RMS.LoadLibrary("rmgen");
RMS.LoadLibrary("common");

var tGrass = ["medit_grass_field", "medit_grass_field_b", "temp_grass_c"];
var tLushGrass = ["medit_grass_field","medit_grass_field_a"];

var tSteepCliffs = ["temp_cliff_b", "temp_cliff_a"];
var tCliffs = ["temp_cliff_b", "medit_cliff_italia", "medit_cliff_italia_grass"];
var tHill = ["medit_cliff_italia_grass","medit_cliff_italia_grass", "medit_grass_field", "medit_grass_field", "temp_grass"];
var tMountain = ["medit_cliff_italia_grass","medit_cliff_italia"];

var tRoad = ["medit_city_tile","medit_rocks_grass","medit_grass_field_b"];
var tRoadWild = ["medit_rocks_grass","medit_grass_field_b"];

var tShoreBlend = ["medit_sand_wet","medit_rocks_wet"];
var tShore = ["medit_rocks","medit_sand","medit_sand"];
var tSandTransition = ["medit_sand","medit_rocks_grass","medit_rocks_grass","medit_rocks_grass"];
var tVeryDeepWater = ["medit_sea_depths","medit_sea_coral_deep"];
var tDeepWater = ["medit_sea_coral_deep","tropic_ocean_coral"];
var tCreekWater = "medit_sea_coral_plants";

var ePine = "gaia/flora_tree_aleppo_pine";
var ePalmTall = "gaia/flora_tree_cretan_date_palm_tall";
var eFanPalm = "gaia/flora_tree_medit_fan_palm";
var eApple = "gaia/flora_tree_apple";
var eBush = "gaia/flora_bush_berry";
var eFish = "gaia/fauna_fish";
var ePig = "gaia/fauna_pig";
var eStoneMine = "gaia/geology_stonemine_medit_quarry";
var eMetalMine = "gaia/geology_metal_mediterranean_slabs";

var aRock = "actor|geology/stone_granite_med.xml";
var aLargeRock = "actor|geology/stone_granite_large.xml";
var aBushA = "actor|props/flora/bush_medit_sm_lush.xml";
var aBushB = "actor|props/flora/bush_medit_me_lush.xml";
var aPlantA = "actor|props/flora/plant_medit_artichoke.xml";
var aPlantB = "actor|props/flora/grass_tufts_a.xml";
var aPlantC = "actor|props/flora/grass_soft_tuft_a.xml";

var aStandingStone = "actor|props/special/eyecandy/standing_stones.xml";

InitMap();

var numPlayers = getNumPlayers();
var mapSize = getMapSize();

var clIsland = createTileClass();
var clCreek = createTileClass();
var clWater = createTileClass();
var clCliffs = createTileClass();
var clForest = createTileClass();
var clShore = createTileClass();
var clPlayer = createTileClass();
var clBaseResource = createTileClass();
var clPassage = createTileClass();
var clWater = createTileClass();
var clSettlement = createTileClass();

initTerrain(tVeryDeepWater);

var nbCreeks = scaleByMapSize(6, 15);
var nbSubIsland = 5;
var nbBeaches = scaleByMapSize(2, 5);
var nbPassagesIsland = scaleByMapSize(1, 4);

var beachSmallRadius = fractionToTiles(0.45);
var beachBigRadius = fractionToTiles(0.57);

var heightMain = 5;
var heightCreeks = -5;
var heightBeaches = -1;
var heightOffsetMainRelief = 30;
var heightOffsetLevel1 = 9;
var heightOffsetLevel2 = 8;
var heightOffsetBumps = 2;
var heightOffsetAntiBumps = -5;

log("Creating Corsica and Sardinia...");
var islandX = [0.01, 0.99];
var islandZ = [0.1, 0.9];

var swapAngle = randBool() ? Math.PI / 2 : 0;
if (swapAngle)
	islandX.reverse();

for (let island = 0; island < 2; ++island)
{
	let fx = fractionToTiles(islandX[island]);
	let fz = fractionToTiles(islandZ[island]);

	log("Creating island area...");
	createArea(
		new ClumpPlacer(fractionToArea(0.3) * 1.8, 1, 0.5, 10, Math.round(fx), Math.round(fz)),
		[
			new LayeredPainter([tCliffs, tGrass], [2]),
			new SmoothElevationPainter(ELEVATION_SET, heightMain, 0),
			paintClass(clIsland)
		],
		null);

	log("Creating subislands...");
	for (let i = 0; i < nbSubIsland + 1; ++i)
	{
		let angle = Math.PI * (island - i / (nbSubIsland * 2));
		if (!swapAngle)
			angle *= -1;

		createArea(
			new ClumpPlacer(
				fractionToArea(0.05) / 2,
				0.6,
				0.03,
				10,
				Math.round(fx + Math.sqrt(fractionToArea(0.3) * 0.55) * Math.sin(angle)),
				Math.round(fz + Math.sqrt(fractionToArea(0.3) * 0.55) * Math.cos(angle))),
			[
				new LayeredPainter([tCliffs, tGrass], [2]),
				new SmoothElevationPainter(ELEVATION_SET, heightMain, 1),
				paintClass(clIsland)
			],
			null);
	}

	log("Creating creeks...");
	for (let i = 0; i < nbCreeks + 1; ++i)
	{
		let radius = fractionToTiles(randFloat(0.49, 0.55));
		let angle = Math.PI * (island + i * (1 / (nbCreeks * 2))) + swapAngle;

		createArea(
			new ClumpPlacer(
				randBool() ? randFloat(10, 50) : scaleByMapSize(75, 100) + randFloat(0, 20),
				0.4,
				0.01,
				10,
				Math.round(fx + radius * Math.cos(angle)),
				Math.round(fz + radius * Math.sin(angle))),
			[
				new TerrainPainter(tSteepCliffs),
				new SmoothElevationPainter(ELEVATION_SET, heightCreeks, 0),
				paintClass(clCreek)
			],
			null);
	}

	log("Creating beaches...");
	for (let i = 0; i < nbBeaches + 1; ++i)
	{
		let angle = Math.PI * (island + (i / (nbBeaches * 2.5)) + 1 / (nbBeaches * 6) + randFloat(-1, 1) / (nbBeaches * 7)) + swapAngle;
		let startX = Math.round(fx + beachSmallRadius * Math.cos(angle));
		let startZ = Math.round(fz + beachSmallRadius * Math.sin(angle));

		let endX = Math.round(fx + beachBigRadius * Math.cos(angle));
		let endZ = Math.round(fz + beachBigRadius * Math.sin(angle));

		createArea(
			new ClumpPlacer(130, 0.7, 0.8, 10, Math.round((startX + endX * 3) / 4), Math.round((startZ + endZ * 3) / 4)),
			[new SmoothElevationPainter(ELEVATION_SET, heightBeaches, 5)],
			null);

		createPassage({
			"startX": Math.max(0, Math.min(startX, mapSize)),
			"startZ": Math.max(0, Math.min(startZ, mapSize)),
			"endX": Math.max(0, Math.min(endX, mapSize)),
			"endZ": Math.max(0, Math.min(endZ, mapSize)),
			"startWidth": 25,
			"endWidth": 18,
			"smooth": 4,
			"tileclass": clPassage
		});
	}

	let x = Math.round((fx * 5 + fractionToTiles(0.5)) / 6);
	let z = Math.round(fz);

	log("Creating main relief...");
	createArea(
		new ClumpPlacer(fractionToArea(0.54), 1, 0.2, 4, x, z),
		new SmoothElevationPainter(ELEVATION_MODIFY, heightOffsetMainRelief, fractionToTiles(0.45)),
		null);

	log("Creating first level plateau...");
	createArea(
		new ClumpPlacer(fractionToArea(0.324), 0.95, 0.02, 4, x, z),
		new SmoothElevationPainter(ELEVATION_MODIFY, heightOffsetLevel1, 1),
		null);

	log("Creating first level passages...");
	for (let i = 0; i <= 3; ++i)
	{
		let radius = Math.sqrt(fractionToArea(0.324) / Math.PI) + 2;
		let angle = Math.PI * (i / 7 + 1 / 9 + island) + swapAngle;
		createPassage({
			"startX": Math.round(x + (radius + 7) * Math.cos(angle)),
			"startZ": Math.round(z + (radius + 7) * Math.sin(angle)),
			"endX": Math.round(x + (radius - 5) * Math.cos(angle)),
			"endZ": Math.round(z + (radius - 5) * Math.sin(angle)),
			"startWidth": 4,
			"endWidth": 10,
			"smooth": 3,
			"tileclass": clPassage,
			"terrain": tGrass
		});
	}

	if (mapSize > 150)
	{
		log("Creating second level plateau...");
		createArea(
			new ClumpPlacer(fractionToArea(0.1), 0.98, 0.04, 4, x, z),
			[
				new LayeredPainter([tCliffs, tGrass], [2]),
				new SmoothElevationPainter(ELEVATION_MODIFY, heightOffsetLevel2, 1)
			],
			null);

		log("Creating second level passages...");
		for (let i = 0; i < nbPassagesIsland; ++i)
		{
			let radius = Math.sqrt(fractionToArea(0.1) / Math.PI) + 2;
			let angle = Math.PI * (i / (2 * nbPassagesIsland) + 1 / (4 * nbPassagesIsland) + island) + swapAngle;

			createPassage({
				"startX": Math.round(x + (radius + 5) * Math.cos(angle)),
				"startZ": Math.round(z + (radius + 5) * Math.sin(angle)),
				"endX": Math.round(x + (radius - 4) * Math.cos(angle)),
				"endZ": Math.round(z + (radius - 4) * Math.sin(angle)),
				"startWidth": 1,
				"endWidth": 6,
				"smooth": 2,
				"tileclass": clPassage,
				"terrain": tGrass
			});
		}
	}
}
RMS.SetProgress(30);

log("Determining players per island...");
var island = 0;
var formerTeam = getPlayerTeam(0);
var onIsland = [[], []];

for (let o = 0; o < numPlayers; ++o)
{
	if (getPlayerTeam(o) === formerTeam && formerTeam !== -1)
	{
		// same island
		if (island === 0)
			onIsland[1].push(o);
		else
			onIsland[0].push(o);
	}
	else if (getPlayerTeam(o) !== -1)
	{
		if (island === 0)
		{
			island = 1;
			onIsland[0].push(o);
		}
		else
		{
			island = 0;
			onIsland[1].push(o);
		}
	}
	else
	{
		// Now the less crowded:
		if (onIsland[1].length > onIsland[0].length)
			onIsland[0].push(o);
		else
			onIsland[1].push(o);
	}
	formerTeam = getPlayerTeam(o);
}

log("Determining player locations...");
var playerIDs = sortAllPlayers();
var playerX = [];
var playerZ = [];
var playerAngle = [];
for (let island = 0; island < 2; ++island)
{
	let pi = onIsland[island];

	for (let i = 0; i < pi.length; ++i)
	{
		let angle = Math.PI * (i / (2 * pi.length) + 1 / (4 * pi.length) + island) + swapAngle;
		let p = pi[i];
		playerAngle[p] = angle;
		playerX[p] = islandX[island] + 0.36 * Math.cos(angle);
		playerZ[p] = island + 0.36 * Math.sin(angle);
	}
}

placeDefaultPlayerBases({
	"playerPlacement": [sortAllPlayers(), playerX, playerZ],
	"playerTileClass": clPlayer,
	"baseResourceClass": clBaseResource,
	"cityPatch": {
		"innerTerrain": tRoadWild,
		"outerTerrain": tRoad,
		"coherence": 0.8,
		"painters": [
			paintClass(clSettlement)
		]
	},
	"iberWalls": false,
	"chicken": {
	},
	"berries": {
		"template": eBush
	},
	"mines": {
		"types": [
			{ "template": eMetalMine },
			{ "template": eStoneMine }
		]
	},
	// Sufficient starting trees around, no decoratives
});
RMS.SetProgress(40);

log("Creating bumps");
createAreas(
	new ClumpPlacer(70, 0.6, 0.1, 4),
	[new SmoothElevationPainter(ELEVATION_MODIFY, heightOffsetBumps, 3)],
	[
		stayClasses(clIsland, 2),
		avoidClasses(clPlayer, 6, clPassage, 2)
	],
	scaleByMapSize(20, 100),
	5);

log("Creating anti bumps");
createAreas(
	new ClumpPlacer(120, 0.3, 0.1, 4),
	[new SmoothElevationPainter(ELEVATION_MODIFY, heightOffsetAntiBumps, 6)],
	avoidClasses(clPlayer, 6, clPassage, 2, clIsland, 2),
	scaleByMapSize(20, 100),
	5);

log("Painting water...");
for (let mapX = 0; mapX < mapSize; ++mapX)
	for (let mapZ = 0; mapZ < mapSize; ++mapZ)
		if (getHeight(mapX, mapZ) < 0)
			addToClass(mapX, mapZ, clWater);

log("Painting land...");
for (let mapX = 0; mapX < mapSize; ++mapX)
	for (let mapZ = 0; mapZ < mapSize; ++mapZ)
	{
		let terrain = getCosricaSardiniaTerrain(mapX, mapZ);
		if (!terrain)
			continue;

		createTerrain(terrain).place(mapX, mapZ);

		if (terrain == tCliffs || terrain == tSteepCliffs)
			addToClass(mapX, mapZ, clCliffs);
	}

function getCosricaSardiniaTerrain(mapX, mapZ)
{
	let isWater = getTileClass(clWater).countMembersInRadius(mapX, mapZ, 3);
	let isShore = getTileClass(clShore).countMembersInRadius(mapX, mapZ, 2);
	let isPassage = getTileClass(clPassage).countMembersInRadius(mapX, mapZ, 2);
	let isSettlement = getTileClass(clSettlement).countMembersInRadius(mapX, mapZ, 2);

	if (isSettlement)
		return undefined;

	let height = getHeight(mapX, mapZ);
	let heightDiff = getHeightDifference(mapX, mapZ);

	if (height >= 0.5 && height < 1.5 && isShore)
		return tSandTransition;

	// Paint land cliffs and grass
	if (height >= 1 && !isWater)
	{
		if (isPassage)
			return tGrass;

		if (heightDiff >= 10)
			return height > 25 ? tSteepCliffs : tCliffs;

		if (height < 17)
			return tGrass;

		if (heightDiff < 5)
			return tHill;

		return tMountain;
	}

	if (heightDiff >= 9)
		return tCliffs;

	if (height >= 1.5)
		return undefined;

	if (height >= -0.75)
		return tShore;

	if (height >= -3)
		return tShoreBlend;

	if (height >= -6)
		return tCreekWater;

	if (height > -10 && heightDiff < 6)
		return tDeepWater;

	return undefined;
}

RMS.SetProgress(65);

log("Creating mines...");
for (let mine of [eMetalMine, eStoneMine])
	createObjectGroupsDeprecated(
		new SimpleGroup(
			[
				new SimpleObject(mine, 1,1, 0,0),
				new SimpleObject(aBushB, 1,1, 2,2),
				new SimpleObject(aBushA, 0,2, 1,3)
			],
			true,
			clBaseResource),
		0,
		[
			stayClasses(clIsland, 1),
			avoidClasses(
				clWater, 3,
				clPlayer, 6,
				clBaseResource, 4,
				clCliffs, 1)
		],
		scaleByMapSize(6, 25),
		1000);

log("Creating grass patches...");
createAreas(
	new ClumpPlacer(20, 0.3, 0.06, 0.5),
	[
		new TerrainPainter(tLushGrass),
		paintClass(clForest)
	],
	avoidClasses(
		clWater, 1,
		clPlayer, 6,
		clBaseResource, 3,
		clCliffs, 1),
	scaleByMapSize(10, 40));

log("Creating forests...");
createObjectGroupsDeprecated(
	new SimpleGroup(
		[
			new SimpleObject(ePine, 3, 6, 1, 3),
			new SimpleObject(ePalmTall, 1, 3, 1, 3),
			new SimpleObject(eFanPalm, 0, 2, 0, 2),
			new SimpleObject(eApple, 0, 1, 1, 2)
		],
		true,
		clForest),
	0,
	[
		stayClasses(clIsland, 3),
		avoidClasses(
			clWater, 1,
			clForest, 0,
			clPlayer, 6,
			clBaseResource, 4,
			clCliffs, 2)
	],
	scaleByMapSize(350, 2500),
	100);

RMS.SetProgress(75);

log("Creating small decorative rocks...");
createObjectGroupsDeprecated(
	new SimpleGroup(
		[
			new SimpleObject(aRock, 1, 3, 0, 1),
			new SimpleObject(aStandingStone, 0, 2, 0, 3)
		],
		true),
	0,
	avoidClasses(
		clWater, 0,
		clForest, 0,
		clPlayer, 6,
		clBaseResource, 4,
		clPassage, 2),
	scaleByMapSize(16, 262),
	50);

log("Creating large decorative rocks...");
var rocksGroup = new SimpleGroup(
	[
		new SimpleObject(aLargeRock, 1, 2, 0, 1),
		new SimpleObject(aRock, 1, 3, 0, 2)
	],
	true);

createObjectGroupsDeprecated(
	rocksGroup,
	0,
	avoidClasses(
		clWater, 0,
		clForest, 0,
		clPlayer, 6,
		clBaseResource, 4,
		clPassage, 2),
	scaleByMapSize(8, 131),
	50);

createObjectGroupsDeprecated(
	rocksGroup,
	0,
	borderClasses(clWater, 5, 10),
	scaleByMapSize(100, 800),
	500);

log("Creating decorative plants...");
var plantGroups = [
	new SimpleGroup(
		[
			new SimpleObject(aPlantA, 3, 7, 0, 3),
			new SimpleObject(aPlantB, 3,6, 0, 3),
			new SimpleObject(aPlantC, 1,4, 0, 4)
		],
		true),
	new SimpleGroup(
		[
			new SimpleObject(aPlantB, 5, 20, 0, 5),
			new SimpleObject(aPlantC, 4,10, 0,4)
		],
		true)
];
for (let group of plantGroups)
	createObjectGroupsDeprecated(
		group,
		0,
		avoidClasses(
			clWater, 0,
			clBaseResource, 4,
			clShore, 3),
		scaleByMapSize(100, 600),
		50);

RMS.SetProgress(80);

log("Creating animals...");
createObjectGroupsDeprecated(
	new SimpleGroup([new SimpleObject(ePig, 2,4, 0,3)]),
	0,
	avoidClasses(
		clWater, 3,
		clBaseResource, 4,
		clPlayer, 6),
	scaleByMapSize(20, 100),
	50);

log("Creating fish...");
createObjectGroupsDeprecated(
	new SimpleGroup([new SimpleObject(eFish, 1,2, 0,3)]),
	0,
	[
		stayClasses(clWater, 3),
		avoidClasses(clCreek, 3, clShore, 3)
	],
	scaleByMapSize(50, 150),
	100);

RMS.SetProgress(95);

setSkySet(pickRandom(["cumulus", "sunny"]));

setSunColor(0.8, 0.66, 0.48);
setSunElevation(0.828932);
setSunRotation((swapAngle ? 0.288 : 0.788) * Math.PI);

setTerrainAmbientColor(0.564706,0.543726,0.419608);
setUnitsAmbientColor(0.53,0.55,0.45);
setWaterColor(0.2,0.294,0.49);
setWaterTint(0.208, 0.659, 0.925);
setWaterMurkiness(0.72);
setWaterWaviness(2.0);
setWaterType("ocean");
ExportMap();

function getHeightDifference(x1, z1)
{
	if (!g_Map.inMapBounds(x1, z1))
		return 0;

	let height = getHeight(Math.round(x1), Math.round(z1));
	let diff = 0;

	for (let x of [-1, 0, 1])
		for (let z of [-1, 0, 1])
			if (x && z && g_Map.inMapBounds(x1 +x, z1 + z))
				diff += Math.abs(getHeight(Math.round(x1 + x),Math.round(z1 + z)) - height);

	return diff;
}
