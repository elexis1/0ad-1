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
const tHill = g_Terrains.mainTerrain;
const tRoad = g_Terrains.road;
const tRoadWild = g_Terrains.roadWild;
const tTier4Terrain = g_Terrains.tier4Terrain;
const tWater = g_Terrains.water;

const oTree1 = g_Gaia.tree1;
const oTree2 = g_Gaia.tree2;
const oTree3 = g_Gaia.tree3;
const oTree4 = g_Gaia.tree4;
const oTree5 = g_Gaia.tree5;
const oFruitBush = g_Gaia.fruitBush;
const oMainHuntableAnimal = g_Gaia.mainHuntableAnimal;
const oSecondaryHuntableAnimal = g_Gaia.secondaryHuntableAnimal;
const oStoneLarge = g_Gaia.stoneLarge;
const oStoneSmall = g_Gaia.stoneSmall;
const oMetalLarge = g_Gaia.metalLarge;

const aGrass = g_Decoratives.grass;
const aGrassShort = g_Decoratives.grassShort;
const aRockLarge = g_Decoratives.rockLarge;
const aRockMedium = g_Decoratives.rockMedium;
const aBushMedium = g_Decoratives.bushMedium;
const aBushSmall = g_Decoratives.bushSmall;

const pForest1 = [tForestFloor2 + TERRAIN_SEPARATOR + oTree1, tForestFloor2 + TERRAIN_SEPARATOR + oTree2, tForestFloor2];
const pForest2 = [tForestFloor1 + TERRAIN_SEPARATOR + oTree4, tForestFloor1 + TERRAIN_SEPARATOR + oTree5, tForestFloor1];

InitMap();

const numPlayers = getNumPlayers();
const mapSize = getMapSize();

var clPlayer = createTileClass();
var clHill = createTileClass();
var clForest = createTileClass();
var clDirt = createTileClass();
var clRock = createTileClass();
var clMetal = createTileClass();
var clFood = createTileClass();
var clBaseResource = createTileClass();
var clLand = createTileClass();

const playerIslandRadius = scaleByMapSize(15, 30);
const islandHeight = 20;

const islandBetweenPlayerAndCenterDist = 0.16;
const islandBetweenPlayerAndCenterRadius = 0.81;
const centralIslandRadius = 0.36;

var [playerIDs, playerX, playerZ, unusedIslandAngle, startAngle] = placePlayersRadial();

var numIslands = 0;
var isConnected = [];
var IslandX = [];
var IslandZ = [];

function initIsConnected()
{
	for (let m = 0; m < numIslands; ++m)
	{
		isConnected[m] = [];
		for (let n = 0; n < numIslands; ++n)
			isConnected[m][n] = 0;
	}
}

function createIsland(islandID, size, tileClass)
{
	let hillSize = Math.PI * Math.pow(playerIslandRadius, 2) * size;
	createArea(
		new ClumpPlacer(hillSize, 0.95, 0.6, 10, IslandX[islandID], IslandZ[islandID]),
		[
			new LayeredPainter([tCliff, tHill], [2]),
			new SmoothElevationPainter(ELEVATION_SET, islandHeight, 2),
			paintClass(tileClass)
		],
		null);
	return hillSize;
}

function createIslandAtRadialLocation(playerID, islandID, playerIDOffset, distFromCenter, islandRadius)
{
	let angle = startAngle + (playerID * 2 + playerIDOffset) * Math.PI / numPlayers;
	IslandX[islandID] = Math.round(fractionToTiles(0.5 + distFromCenter * Math.cos(angle)));
	IslandZ[islandID] = Math.round(fractionToTiles(0.5 + distFromCenter * Math.sin(angle)));
	createIsland(islandID, islandRadius, clLand);
}

function createSnowflakeSearockWithCenter(sizeID)
{
	let [tertiaryIslandDist, tertiaryIslandRadius, islandBetweenPlayersDist, islandBetweenPlayersRadius] = islandSizes[sizeID];

	let islandID_center = 4 * numPlayers;
	numIslands = islandID_center + 1;
	initIsConnected();

	log("Creating central island...");
	IslandX[islandID_center] = fractionToTiles(0.5);
	IslandZ[islandID_center] = fractionToTiles(0.5);
	createIsland(islandID_center, centralIslandRadius, clLand);

	for (let playerID = 0; playerID < numPlayers; ++playerID)
	{
		let playerID_neighbor = playerID + 1 < numPlayers ? playerID + 1 : 0;

		let islandID_player = playerID;
		let islandID_playerNeighbor = playerID_neighbor;
		let islandID_betweenPlayers = playerID + numPlayers;
		let islandID_betweenPlayerAndCenter = playerID + 2 * numPlayers;
		let islandID_betweenPlayerAndCenterNeighbor = playerID_neighbor + 2 * numPlayers;
		let islandID_tertiary = playerID + 3 * numPlayers;

		log("Creating island between the player and their neighbor...");
		isConnected[islandID_betweenPlayers][islandID_player] = 1;
		isConnected[islandID_betweenPlayers][islandID_playerNeighbor] = 1;
		createIslandAtRadialLocation(playerID, islandID_betweenPlayers, 1, islandBetweenPlayersDist, islandBetweenPlayersRadius);

		log("Creating an island between the player and the center...");
		isConnected[islandID_betweenPlayerAndCenter][islandID_player] = 1;
		isConnected[islandID_betweenPlayerAndCenter][islandID_center] = 1;
		isConnected[islandID_betweenPlayerAndCenter][islandID_betweenPlayerAndCenterNeighbor] = 1;
		createIslandAtRadialLocation(playerID, islandID_betweenPlayerAndCenter, 0, islandBetweenPlayerAndCenterDist, islandBetweenPlayerAndCenterRadius);

		log("Creating tertiary island, at the map border...");
		isConnected[islandID_tertiary][islandID_betweenPlayers] = 1;
		createIslandAtRadialLocation(playerID, islandID_tertiary, 1, tertiaryIslandDist, tertiaryIslandRadius);
	}
}

/**
 * Creates one island in front of every player and connects it with the neighbors.
 */
function createSnowflakeSearockWithoutCenter()
{
	numIslands = 2 * numPlayers;
	initIsConnected();

	for (let playerID = 0; playerID < numPlayers; ++playerID)
	{
		let playerID_neighbor = playerID + 1 < numPlayers ? playerID + 1 : 0;

		let islandID_player = playerID;
		let islandID_playerNeighbor = playerID_neighbor;
		let islandID_inFrontOfPlayer = playerID + numPlayers;
		let islandID_inFrontOfPlayerNeighbor = playerID_neighbor + numPlayers;

		isConnected[islandID_player][islandID_playerNeighbor] = 1;
		isConnected[islandID_player][islandID_inFrontOfPlayer] = 1;
		isConnected[islandID_inFrontOfPlayer][islandID_inFrontOfPlayerNeighbor] = 1;

		createIslandAtRadialLocation(playerID, islandID_inFrontOfPlayer, 0, islandBetweenPlayerAndCenterDist, islandBetweenPlayerAndCenterRadius);
	}
}

function createSnowflakeSearockTiny()
{
	numIslands = numPlayers + 1;
	initIsConnected();

	let islandID_center = numPlayers;

	log("Creating central island...");
	IslandX[islandID_center] = fractionToTiles(0.5);
	IslandZ[islandID_center] = fractionToTiles(0.5);
	createIsland(numPlayers, 1, clLand);

	for (let playerID = 0; playerID < numPlayers; ++playerID)
	{
		let islandID_player = playerID;
		isConnected[islandID_player][islandID_center] = 1;
	}
}

initTerrain(tWater);

const islandSizes = {
	"medium":  [0.41, 0.49, 0.26, 1],
	"large1":  [0.41, 0.49, 0.24, 1],
	"large2":  [0.41, 0.36, 0.28, 0.81]
};

if (mapSize <= 128)
{
	createSnowflakeSearockTiny();
}
else if (mapSize <= 192)
{
	createSnowflakeSearockWithoutCenter();
}
else if (mapSize <= 256)
{
	if (numPlayers < 6)
		createSnowflakeSearockWithCenter("medium");
	else
		createSnowflakeSearockWithoutCenter();
}
else if (mapSize <= 320)
{
	if (numPlayers < 8)
		createSnowflakeSearockWithCenter("medium");
	else
		createSnowflakeSearockWithoutCenter();
}
else
	createSnowflakeSearockWithCenter(numPlayers < 6 ? "large1" : "large2");

log("Creating player islands...");
for (let i = 0; i < numPlayers; ++i)
{
	IslandX[i] = Math.round(fractionToTiles(playerX[i]));
	IslandZ[i] = Math.round(fractionToTiles(playerZ[i]));

	createIsland(i, 1, clPlayer);
}

placeDefaultPlayerBases({
	"playerPlacement": [playerIDs, playerX, playerZ],
	// playerTileClass already marked above
	"baseResourceClass": clBaseResource,
	"baseResourceConstraint": stayClasses(clPlayer, 4),
	"iberWalls": "towers",
	"cityPatch": {
		"innerTerrain": tRoadWild,
		"outerTerrain": tRoad
	},
	"chicken": {
	},
	"berries": {
		"template": oFruitBush
	},
	"mines": {
		"types": [
			{ "template": oMetalLarge },
			{ "template": oStoneLarge }
		]
	},
	"trees": {
		"template": oTree1,
		"radiusFactor": 1/10,
		"minDistGroup": 1,
		"maxDistGroup": 3
	},
	"decoratives": {
		"template": aGrassShort
	}
});
RMS.SetProgress(30);

// Create connectors
for (var ix = 0; ix < mapSize; ix++)
	for (var iz = 0; iz < mapSize; iz++)
		for (var m = 0; m < numIslands; m++)
			for (var n = 0; n < numIslands; n++)
				if (isConnected[m][n] == 1)
				{
					var a = IslandZ[m]-IslandZ[n];
					var b = IslandX[n]-IslandX[m];
					var c = (IslandZ[m]*(IslandX[m]-IslandX[n]))-(IslandX[m]*(IslandZ[m]-IslandZ[n]));
					var dis = abs(a*ix + b*iz + c)/sqrt(a*a + b*b);
					var k = (a*ix + b*iz + c)/(a*a + b*b);
					var y = iz-(b*k);

					if (dis < 5 && y <= Math.max(IslandZ[m], IslandZ[n]) && y >= Math.min(IslandZ[m], IslandZ[n]))
					{
						let height;
						let tileClass;

						let f = 3 - dis;
						if (f > 0)
						{
							height = islandHeight;
							tileClass = dis < 2 ? tHill : tCliff;
						}
						else
						{
							height = islandHeight + 10 * f;
							tileClass = tCliff;
						}

						addToClass(ix, iz, clLand);

						if (getHeight(ix, iz) < height)
						{
							placeTerrain(ix, iz, tileClass);
							setHeight(ix, iz, height);
						}
					}
				}

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

var size = numForest / scaleByMapSize(2, 8) * numPlayers * (currentBiome() == "savanna" ? 2 : 1);
var num = floor(size / types.length);
for (let type of types)
	createAreas(
		new ClumpPlacer(numForest / num, 0.1, 0.1, 1),
		[
			new LayeredPainter(type, [2]),
			paintClass(clForest)
		],
		[avoidClasses(clPlayer, 6, clForest, 10, clHill, 0), stayClasses(clLand, 4)],
		num);
RMS.SetProgress(55);

log("Creating stone mines...");
var group = new SimpleGroup([new SimpleObject(oStoneSmall, 0,2, 0,4), new SimpleObject(oStoneLarge, 1,1, 0,4)], true, clRock);
createObjectGroupsDeprecated(group, 0,
	[avoidClasses(clForest, 1, clPlayer, 10, clRock, 10, clHill, 1), stayClasses(clLand, 5)],
	5*scaleByMapSize(4,16), 100
);

log("Creating small stone quarries...");
group = new SimpleGroup([new SimpleObject(oStoneSmall, 2,5, 1,3)], true, clRock);
createObjectGroupsDeprecated(group, 0,
	[avoidClasses(clForest, 1, clPlayer, 10, clRock, 10, clHill, 1), stayClasses(clLand, 5)],
	5*scaleByMapSize(4,16), 100
);

log("Creating metal mines...");
group = new SimpleGroup([new SimpleObject(oMetalLarge, 1,1, 0,4)], true, clMetal);
createObjectGroupsDeprecated(group, 0,
	[avoidClasses(clForest, 1, clPlayer, 10, clMetal, 10, clRock, 5, clHill, 1), stayClasses(clLand, 5)],
	5*scaleByMapSize(4,16), 100
);

RMS.SetProgress(65);
log("Creating dirt patches...");
for (let size of [scaleByMapSize(3, 48), scaleByMapSize(5, 84), scaleByMapSize(8, 128)])
	createAreas(
		new ClumpPlacer(size, 0.3, 0.06, 0.5),
		[
			new LayeredPainter([[tMainTerrain, tTier1Terrain],[tTier1Terrain, tTier2Terrain], [tTier2Terrain, tTier3Terrain]], [1, 1]),
			paintClass(clDirt)
		],
		[avoidClasses(clForest, 0, clHill, 0, clDirt, 5, clPlayer, 12), stayClasses(clLand, 5)],
		scaleByMapSize(15, 45));

log("Creating grass patches...");
for (let size of [scaleByMapSize(2, 32), scaleByMapSize(3, 48), scaleByMapSize(5, 80)])
	createAreas(
		new ClumpPlacer(size, 0.3, 0.06, 0.5),
		new TerrainPainter(tTier4Terrain),
		[avoidClasses(clForest, 0, clHill, 0, clDirt, 5, clPlayer, 12), stayClasses(clLand, 5)],
		scaleByMapSize(15, 45));

log("Creating small decorative rocks...");
group = new SimpleGroup(
	[new SimpleObject(aRockMedium, 1,3, 0,1)],
	true
);
createObjectGroupsDeprecated(
	group, 0,
	[avoidClasses(clForest, 0, clPlayer, 0, clHill, 0), stayClasses(clLand, 4)],
	scaleByMapSize(16, 262), 50
);

log("Creating large decorative rocks...");
group = new SimpleGroup(
	[new SimpleObject(aRockLarge, 1,2, 0,1), new SimpleObject(aRockMedium, 1,3, 0,2)],
	true
);
createObjectGroupsDeprecated(
	group, 0,
	[avoidClasses(clForest, 0, clPlayer, 0, clHill, 0), stayClasses(clLand, 4)],
	scaleByMapSize(8, 131), 50
);

RMS.SetProgress(70);

log("Creating deer...");
group = new SimpleGroup(
	[new SimpleObject(oMainHuntableAnimal, 5,7, 0,4)],
	true, clFood
);
createObjectGroupsDeprecated(group, 0,
	[avoidClasses(clForest, 0, clPlayer, 10, clHill, 1, clFood, 20), stayClasses(clLand, 4)],
	3 * numPlayers, 50
);

RMS.SetProgress(75);

log("Creating sheep...");
group = new SimpleGroup(
	[new SimpleObject(oSecondaryHuntableAnimal, 2,3, 0,2)],
	true, clFood
);
createObjectGroupsDeprecated(group, 0,
	[avoidClasses(clForest, 0, clPlayer, 10, clHill, 1, clFood, 20), stayClasses(clLand, 4)],
	3 * numPlayers, 50
);

log("Creating fruits...");
group = new SimpleGroup(
	[new SimpleObject(oFruitBush, 5,7, 0,4)],
	true, clFood
);
createObjectGroupsDeprecated(group, 0,
	[avoidClasses(clForest, 0, clPlayer, 10, clHill, 1, clFood, 20), stayClasses(clLand, 4)],
	3 * numPlayers, 50
);
RMS.SetProgress(85);

log("Creating straggler trees...");
var types = [oTree1, oTree2, oTree4, oTree3];
var num = floor(numStragglers / types.length);
for (let type of types)
	createObjectGroupsDeprecated(
		new SimpleGroup([new SimpleObject(type, 1, 1, 0, 3)], true, clForest),
		0,
		[avoidClasses(clForest, 1, clHill, 1, clPlayer, 9, clMetal, 6, clRock, 6), stayClasses(clLand, 4)],
		num);

var planetm = 1;
if (currentBiome() == "tropic")
	planetm = 8;

log("Creating small grass tufts...");
group = new SimpleGroup(
	[new SimpleObject(aGrassShort, 1,2, 0,1, -PI/8,PI/8)]
);
createObjectGroupsDeprecated(group, 0,
	[avoidClasses(clHill, 2, clPlayer, 2, clDirt, 0), stayClasses(clLand, 4)],
	planetm * scaleByMapSize(13, 200)
);

RMS.SetProgress(90);

log("Creating large grass tufts...");
group = new SimpleGroup(
	[new SimpleObject(aGrass, 2,4, 0,1.8, -PI/8,PI/8), new SimpleObject(aGrassShort, 3,6, 1.2,2.5, -PI/8,PI/8)]
);
createObjectGroupsDeprecated(group, 0,
	[avoidClasses(clHill, 2, clPlayer, 2, clDirt, 1, clForest, 0), stayClasses(clLand, 4)],
	planetm * scaleByMapSize(13, 200)
);
RMS.SetProgress(95);

log("Creating bushes...");
group = new SimpleGroup(
	[new SimpleObject(aBushMedium, 1,2, 0,2), new SimpleObject(aBushSmall, 2,4, 0,2)]
);
createObjectGroupsDeprecated(group, 0,
	[avoidClasses(clHill, 1, clPlayer, 1, clDirt, 1), stayClasses(clLand, 4)],
	planetm * scaleByMapSize(13, 200), 50
);

setSkySet(pickRandom(["cirrus", "cumulus", "sunny"]));
setSunRotation(randFloat(0, TWO_PI));
setSunElevation(randFloat(PI/ 5, PI / 3));

ExportMap();
