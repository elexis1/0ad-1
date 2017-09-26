RMS.LoadLibrary("rmgen");
RMS.LoadLibrary("rmbiome");

setSelectedBiome();

const tMainTerrain = g_Terrains.mainTerrain;
const tForestFloor1 = g_Terrains.forestFloor1;
const tForestFloor2 = g_Terrains.forestFloor2;
const tCliff = g_Terrains.cliff;
const tTier1Terrain = g_Terrains.tier1Terrain;
const tTier2Terrain = g_Terrains.tier2Terrain;
const tTier3Terrain = g_Terrains.tier3Terrain;
const tHill = g_Terrains.hill;
const tDirt = g_Terrains.dirt;
const tRoad = g_Terrains.road;
const tRoadWild = g_Terrains.roadWild;
const tTier4Terrain = g_Terrains.tier4Terrain;
const tShoreBlend = g_Terrains.shoreBlend;
const tShore = g_Terrains.shore;
const tWater = g_Terrains.water;

const oTree1 = g_Gaia.tree1;
const oTree2 = g_Gaia.tree2;
const oTree3 = g_Gaia.tree3;
const oTree4 = g_Gaia.tree4;
const oTree5 = g_Gaia.tree5;
const oFruitBush = g_Gaia.fruitBush;
const oMainHuntableAnimal = g_Gaia.mainHuntableAnimal;
const oFish = g_Gaia.fish;
const oSecondaryHuntableAnimal = g_Gaia.secondaryHuntableAnimal;
const oStoneLarge = g_Gaia.stoneLarge;
const oStoneSmall = g_Gaia.stoneSmall;
const oMetalLarge = g_Gaia.metalLarge;
const oWood = "gaia/special_treasure_wood";

const aGrass = g_Decoratives.grass;
const aGrassShort = g_Decoratives.grassShort;
const aReeds = g_Decoratives.reeds;
const aLillies = g_Decoratives.lillies;
const aRockLarge = g_Decoratives.rockLarge;
const aRockMedium = g_Decoratives.rockMedium;
const aBushMedium = g_Decoratives.bushMedium;
const aBushSmall = g_Decoratives.bushSmall;

const pForest1 = [tForestFloor2 + TERRAIN_SEPARATOR + oTree1, tForestFloor2 + TERRAIN_SEPARATOR + oTree2, tForestFloor2];
const pForest2 = [tForestFloor1 + TERRAIN_SEPARATOR + oTree4, tForestFloor1 + TERRAIN_SEPARATOR + oTree5, tForestFloor1];

InitMap();

const numPlayers = getNumPlayers();
const mapSize = getMapSize();
const mapArea = mapSize*mapSize;

var clPlayer = createTileClass();
var clHill = createTileClass();
var clForest = createTileClass();
var clDirt = createTileClass();
var clRock = createTileClass();
var clMetal = createTileClass();
var clFood = createTileClass();
var clBaseResource = createTileClass();
var clSettlement = createTileClass();
var clLand = createTileClass();

var playerIDs = sortAllPlayers();

var playerX = [];
var playerZ = [];
var playerAngle = [];

var startAngle = 4/7 * Math.PI;
for (let i = 0; i < numPlayers; ++i)
{
	playerAngle[i] = startAngle - (i+1)*(PI+ PI/7)/(numPlayers+1);
	playerX[i] = 0.5 + 0.35*cos(playerAngle[i]);
	playerZ[i] = 0.5 + 0.35*sin(playerAngle[i]);
}

placeDefaultPlayerBases({
	"playerPlacement": [playerIDs, playerX, playerZ],
	"playerTileClass": clPlayer,
	"baseResourceClass": clBaseResource,
	"iberWalls": false,
	// No city patch
	"chicken": {
	},
	"berries": {
		"template": oFruitBush
	},
	"metal": {
		"template": oMetalLarge
	},
	"stone": {
		"template": oStoneLarge
	},
	"trees": {
		"template": oTree1
	},
	"decoratives": {
		"template": aGrassShort
	}
});

var shoreRadius = 4;
var elevation = 3; // TODO: same in all files

for (lt i = 0; i < numPlayers; ++i)
{
	let fx = fractionToTiles(playerX[i]);
	let fz = fractionToTiles(playerZ[i]);
	let ix = round(fx);
	let iz = round(fz);

	createArea(
		new ClumpPlacer(getDefaultPlayerTerritoryArea(), 0.8, 0.1, 10, ix, iz),
		[
			new LayeredPainter([tWater , tShore, tMainTerrain], [1, shoreRadius]),
			new SmoothElevationPainter(ELEVATION_SET, elevation, shoreRadius),
			paintClass(clPlayer)
		],
		null);

	// TODD:
	// create woods treasure
	var bbAngle = randFloat(0, TWO_PI);
	var bbDist = 13;
	var bbX = round(fx + bbDist * cos(bbAngle));
	var bbZ = round(fz + bbDist * sin(bbAngle));
	var group = new SimpleGroup(
		[new SimpleObject(oWood, 14,14, 0,3)],
		true, clBaseResource, bbX, bbZ
	);
	createObjectGroup(group, 0);

	let dockLocation = getTIPIADBON([ix, iz], [mapSize / 2, mapSize / 2], [-3 , 2.6], 0.5, 3);
	if (dockLocation === undefined)
	{
		warn("Could not place dock for player " + playerIDs[i])
		continue;
	}

	placeObject(
		dockLocation[0],
		dockLocation[1],
		"structures/" + getCivCode(playerIDs[i] - 1) + "_dock",
		playerIDs[i] - 1,
		playerAngle[i] + Math.PI);
}
RMS.SetProgress(15);

log("Create the continent body...");
createArea(
	new ClumpPlacer(mapArea * 0.50, 0.8, 0.08, 10,  Math.round(fractionToTiles(0.12)), Math.round(fractionToTiles(0.5))),
	[
		new LayeredPainter([tWater, tShore, tMainTerrain], [4, 2]),
		new SmoothElevationPainter(ELEVATION_SET, elevation, shoreRadius),
		paintClass(clLand)
	],
	avoidClasses(clPlayer, 8));
RMS.SetProgress(20);

log("Creating shore jaggedness...");
createAreas(
	new ClumpPlacer(scaleByMapSize(15, 80), 0.2, 0.1, 1),
	[
		new LayeredPainter([tMainTerrain, tMainTerrain], [2]),
		new SmoothElevationPainter(ELEVATION_SET, 3, 4),
		paintClass(clLand)
	],
	[borderClasses(clLand, 6, 3), avoidClasses(clPlayer, 8)],
	scaleByMapSize(20, 150) * 2,
	150);

paintTerrainBasedOnHeight(1, 3, 0, tShore);
paintTerrainBasedOnHeight(-8, 1, 2, tWater);
RMS.SetProgress(25);

log("Creating bumps...");
createAreas(
	new ClumpPlacer(scaleByMapSize(20, 50), 0.3, 0.06, 1),
	new SmoothElevationPainter(ELEVATION_MODIFY, 2, 2),
	[avoidClasses(clPlayer, 10), stayClasses(clLand, 3)],
	scaleByMapSize(100, 200)
);
RMS.SetProgress(30);

log("Creating hills...");
createAreas(
	new ClumpPlacer(scaleByMapSize(20, 150), 0.2, 0.1, 1),
	[
		new LayeredPainter([tCliff, tHill], [2]),
		new SmoothElevationPainter(ELEVATION_SET, 18, 2),
		paintClass(clHill)
	],
	[avoidClasses(clPlayer, 10, clHill, 15), stayClasses(clLand, 7)],
	scaleByMapSize(1, 4) * numPlayers
);
RMS.SetProgress(34);

// calculate desired number of trees for map (based on size)
if (currentBiome() == "savanna")
{
	var MIN_TREES = 200;
	var MAX_TREES = 1250;
	var P_FOREST = 0.02;
}
else if (currentBiome() == "tropic")
{
	var MIN_TREES = 1000;
	var MAX_TREES = 6000;
	var P_FOREST = 0.6;
}
else
{
	var MIN_TREES = 500;
	var MAX_TREES = 3000;
	var P_FOREST = 0.7;
}

var totalTrees = scaleByMapSize(MIN_TREES, MAX_TREES);
var numForest = totalTrees * P_FOREST;
var numStragglers = totalTrees * (1.0 - P_FOREST);

log("Creating forests...");
var types = [
	[[tForestFloor2, tMainTerrain, pForest1], [tForestFloor2, pForest1]],
	[[tForestFloor1, tMainTerrain, pForest2], [tForestFloor1, pForest2]]
];

var size = numForest / (scaleByMapSize(2,8) * numPlayers) *
	(currentBiome() == "savanna" ? 2 : 1);

var num = floor(size / types.length);
for (let type of types)
	createAreas(
		new ClumpPlacer(numForest / num, 0.1, 0.1, 1),
		[
			new LayeredPainter(type, [2]),
			paintClass(clForest)
		],
		[avoidClasses(clPlayer, 6, clForest, 10, clHill, 0), stayClasses(clLand, 7)],
		num);
RMS.SetProgress(38);

log("Creating dirt patches...");
for (let size of [scaleByMapSize(3, 48), scaleByMapSize(5, 84), scaleByMapSize(8, 128)])
	createAreas(
		new ClumpPlacer(size, 0.3, 0.06, 0.5),
		[
			new LayeredPainter(
				[[tMainTerrain, tTier1Terrain], [tTier1Terrain, tTier2Terrain], [tTier2Terrain, tTier3Terrain]],
				[1, 1]),
			paintClass(clDirt)
		],
		[
			avoidClasses(
				clForest, 0,
				clHill, 0,
				clDirt, 5,
				clPlayer, 0),
			stayClasses(clLand, 7)
		],
		scaleByMapSize(15, 45));

RMS.SetProgress(42);

log("Creating grass patches...");
for (let size of [scaleByMapSize(2, 32), scaleByMapSize(3, 48), scaleByMapSize(5, 80)])
	createAreas(
		new ClumpPlacer(size, 0.3, 0.06, 0.5),
		new TerrainPainter(tTier4Terrain),
		[avoidClasses(clForest, 0, clHill, 0, clDirt, 5, clPlayer, 0), stayClasses(clLand, 7)],
		scaleByMapSize(15, 45));
RMS.SetProgress(46);

log("Creating stone mines...");
var group = new SimpleGroup([new SimpleObject(oStoneSmall, 0,2, 0,4), new SimpleObject(oStoneLarge, 1,1, 0,4)], true, clRock);
createObjectGroupsDeprecated(group, 0,
	[avoidClasses(clForest, 1, clPlayer, 10, clRock, 10, clHill, 1), stayClasses(clLand, 7)],
	scaleByMapSize(4,16), 100
);
RMS.SetProgress(50);

log("Creating small stone quarries...");
group = new SimpleGroup([new SimpleObject(oStoneSmall, 2,5, 1,3)], true, clRock);
createObjectGroupsDeprecated(group, 0,
	[avoidClasses(clForest, 1, clPlayer, 10, clRock, 10, clHill, 1), stayClasses(clLand, 7)],
	scaleByMapSize(4,16), 100
);
RMS.SetProgress(54);

log("Creating metal mines...");
group = new SimpleGroup([new SimpleObject(oMetalLarge, 1,1, 0,4)], true, clMetal);
createObjectGroupsDeprecated(group, 0,
	[avoidClasses(clForest, 1, clPlayer, 10, clMetal, 10, clRock, 5, clHill, 1), stayClasses(clLand, 7)],
	scaleByMapSize(4,16), 100
);
RMS.SetProgress(58);

log("Creating small decorative rocks...");
group = new SimpleGroup(
	[new SimpleObject(aRockMedium, 1,3, 0,1)],
	true
);
createObjectGroupsDeprecated(
	group, 0,
	[avoidClasses(clForest, 0, clPlayer, 0, clHill, 0), stayClasses(clLand, 6)],
	scaleByMapSize(16, 262), 50
);
RMS.SetProgress(62);

log("Creating large decorative rocks...");
group = new SimpleGroup(
	[new SimpleObject(aRockLarge, 1,2, 0,1), new SimpleObject(aRockMedium, 1,3, 0,2)],
	true
);
createObjectGroupsDeprecated(
	group, 0,
	[avoidClasses(clForest, 0, clPlayer, 0, clHill, 0), stayClasses(clLand, 6)],
	scaleByMapSize(8, 131), 50
);
RMS.SetProgress(66);

log("Creating deer...");
group = new SimpleGroup(
	[new SimpleObject(oMainHuntableAnimal, 5,7, 0,4)],
	true, clFood
);
createObjectGroupsDeprecated(group, 0,
	[avoidClasses(clForest, 0, clPlayer, 10, clHill, 1, clFood, 20), stayClasses(clLand, 7)],
	3 * numPlayers, 50
);
RMS.SetProgress(70);

log("Creating sheep...");
group = new SimpleGroup(
	[new SimpleObject(oSecondaryHuntableAnimal, 2,3, 0,2)],
	true, clFood
);
createObjectGroupsDeprecated(group, 0,
	[avoidClasses(clForest, 0, clPlayer, 10, clHill, 1, clFood, 20), stayClasses(clLand, 7)],
	3 * numPlayers, 50
);
RMS.SetProgress(74);

log("Creating fruit bush...");
group = new SimpleGroup(
	[new SimpleObject(oFruitBush, 5,7, 0,4)],
	true, clFood
);
createObjectGroupsDeprecated(group, 0,
	[avoidClasses(clForest, 0, clPlayer, 8, clHill, 1, clFood, 20), stayClasses(clLand, 7)],
	randIntInclusive(1, 4) * numPlayers + 2, 50
);
RMS.SetProgress(78);

log("Creating fish...");
createObjectGroupsDeprecated(
	new SimpleGroup([new SimpleObject(oFish, 2,3, 0,2)], true, clFood),
	0,
	avoidClasses(clLand, 2, clPlayer, 2, clHill, 0, clFood, 20),
	25 * numPlayers, 60
);
RMS.SetProgress(82);

log("Creating straggler trees...");
var types = [oTree1, oTree2, oTree4, oTree3];
var num = floor(numStragglers / types.length);
for (var i = 0; i < types.length; ++i)
{
	group = new SimpleGroup(
		[new SimpleObject(types[i], 1,1, 0,3)],
		true, clForest
	);
	createObjectGroupsDeprecated(group, 0,
		[avoidClasses(clForest, 1, clHill, 1, clPlayer, 9, clMetal, 6, clRock, 6), stayClasses(clLand, 9)],
		num
	);
}
RMS.SetProgress(86);

var planetm = currentBiome() == "tropic" ? 8 : 1;

log("Creating small grass tufts...");
group = new SimpleGroup(
	[new SimpleObject(aGrassShort, 1,2, 0,1, -PI/8,PI/8)]
);
createObjectGroupsDeprecated(group, 0,
	[avoidClasses(clHill, 2, clPlayer, 2, clDirt, 0), stayClasses(clLand, 6)],
	planetm * scaleByMapSize(13, 200)
);
RMS.SetProgress(90);

log("Creating large grass tufts...");
group = new SimpleGroup(
	[new SimpleObject(aGrass, 2,4, 0,1.8, -PI/8,PI/8), new SimpleObject(aGrassShort, 3,6, 1.2,2.5, -PI/8,PI/8)]
);
createObjectGroupsDeprecated(group, 0,
	[avoidClasses(clHill, 2, clPlayer, 2, clDirt, 1, clForest, 0), stayClasses(clLand, 6)],
	planetm * scaleByMapSize(13, 200)
);
RMS.SetProgress(94);

log("Creating bushes...");
group = new SimpleGroup(
	[new SimpleObject(aBushMedium, 1,2, 0,2), new SimpleObject(aBushSmall, 2,4, 0,2)]
);
createObjectGroupsDeprecated(group, 0,
	[avoidClasses(clHill, 1, clPlayer, 1, clDirt, 1), stayClasses(clLand, 6)],
	planetm * scaleByMapSize(13, 200), 50
);
RMS.SetProgress(98);

setSkySet(pickRandom(["cirrus", "cumulus", "sunny"]));
setSunRotation(randFloat(0, TWO_PI));
setSunElevation(randFloat(PI/ 5, PI / 3));
setWaterWaviness(2);

ExportMap();
