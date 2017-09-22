RMS.LoadLibrary("rmgen");

const tSnowA = ["polar_snow_b"];
const tSnowB = "polar_ice_snow";
const tSnowC = "polar_ice";
const tSnowD = "polar_snow_a";
const tForestFloor = "polar_tundra_snow";
const tCliff = "polar_snow_rocks";
const tSnowE = ["polar_snow_glacial"];
const tRoad = "new_alpine_citytile";
const tRoadWild = "new_alpine_citytile";
const tShoreBlend = "alpine_shore_rocks_icy";
const tShore = "alpine_shore_rocks";
const tWater = "alpine_shore_rocks";

const oPine = "gaia/flora_tree_pine_w";
const oStoneLarge = "gaia/geology_stonemine_alpine_quarry";
const oStoneSmall = "gaia/geology_stone_alpine_a";
const oMetalLarge = "gaia/geology_metal_alpine_slabs";
const oFish = "gaia/fauna_fish";
const oWalrus = "gaia/fauna_walrus";
const oWolf = "gaia/fauna_wolf_snow";

const aIceberg = "actor|props/special/eyecandy/iceberg.xml";

const pForestD = [tForestFloor + TERRAIN_SEPARATOR + oPine, tForestFloor, tForestFloor];
const pForestS = [tForestFloor + TERRAIN_SEPARATOR + oPine, tForestFloor, tForestFloor, tForestFloor];

InitMap();

const numPlayers = getNumPlayers();
const mapSize = getMapSize();

var clPlayer = createTileClass();
var clHill = createTileClass();
var clForest = createTileClass();
var clWater = createTileClass();
var clDirt = createTileClass();
var clRock = createTileClass();
var clMetal = createTileClass();
var clFood = createTileClass();
var clBaseResource = createTileClass();

var playerIDs = sortAllPlayers();
var playerX = [];
var playerZ = [];

for (let i = 0; i < numPlayers; ++i)
{
	playerX[i] = (i + 1) / (numPlayers + 1);
	playerZ[i] = 0.35 + 0.2 * (i % 2);
}

placeDefaultPlayerBases({
	"playerPlacement": [playerIDs, playerX, playerZ],
	"playerTileClass": clPlayer,
	"baseResourceClass": clBaseResource,
	"cityPatch": {
		"innerTerrain": tRoadWild,
		"outerTerrain": tRoad
	},
	// No chicken, nor berries
	"metal": {
		"template": oMetalLarge
	},
	"stone": {
		"template": oStoneLarge
	},
	"trees": {
		"template": oPine
	}
	// No decoratives
});
RMS.SetProgress(15);

paintRiver({
	"horizontal": true,
	"parallel": true,
	"position": 1,
	"width": 0.62,
	"fadeDist": 8 / mapSize,
	"deviation": 0,
	"waterHeight": -5,
	"landHeight": 3,
	"meanderShort": 0,
	"meanderLong": 0,
	"waterFunc": (ix, iz, height) => {
		addToClass(ix, iz, clWater);
	},
	"landFunc": (ix, iz, shoreDist1, shoreDist2) => {
		if (getHeight(ix, iz) < 0.5)
			addToClass(ix, iz, clWater);
	}
});

log("Creating shores...");
for (var i = 0; i < scaleByMapSize(20,120); i++)
	createArea(
		new ChainPlacer(
			1,
			Math.floor(scaleByMapSize(4, 6)),
			Math.floor(scaleByMapSize(16, 30)),
			1,
			randIntExclusive(0.1 * mapSize, 0.9 * mapSize),
			randIntExclusive(0.67 * mapSize, 0.74 * mapSize)),
		[
			new LayeredPainter([tSnowA, tSnowA], [2]),
			new SmoothElevationPainter(ELEVATION_SET, 3, 3), unPaintClass(clWater)
		],
		null);

log("Creating islands...");
createAreas(
	new ChainPlacer(1, floor(scaleByMapSize(4, 6)), floor(scaleByMapSize(16, 40)), 0.1),
	[
		new LayeredPainter([tSnowA, tSnowA], [3]),
		new SmoothElevationPainter(ELEVATION_SET, 3, 3),
		unPaintClass(clWater)
	],
	stayClasses(clWater, 7),
	scaleByMapSize(10, 80)
);

paintTerrainBasedOnHeight(-6, 1, 1, tWater);

log("Creating lakes...");
createAreas(
	new ChainPlacer(1, Math.floor(scaleByMapSize(5, 7)), Math.floor(scaleByMapSize(20, 50)), 0.1),
	[
		new LayeredPainter([tShoreBlend, tShore, tWater], [1,1]),
		new SmoothElevationPainter(ELEVATION_SET, -4, 3),
		paintClass(clWater)
	],
	avoidClasses(clPlayer, 20, clWater, 20),
	round(scaleByMapSize(1,4) * numPlayers));

paintTerrainBasedOnHeight(1, 2.8, 1, tShoreBlend);
paintTileClassBasedOnHeight(-6, 0.5, 1, clWater);

RMS.SetProgress(45);

log("Creating hills...");
createAreas(
	new ChainPlacer(1, Math.floor(scaleByMapSize(4, 6)), Math.floor(scaleByMapSize(16, 40)), 0.1),
	[
		new LayeredPainter([tCliff, tSnowA], [3]),
		new SmoothElevationPainter(ELEVATION_SET, 25, 3),
		paintClass(clHill)
	],
	avoidClasses(clPlayer, 20, clHill, 15, clWater, 2, clBaseResource, 2),
	scaleByMapSize(1, 4) * numPlayers
);

// calculate desired number of trees for map (based on size)
var MIN_TREES = 100;
var MAX_TREES = 625;
var P_FOREST = 0.7;

var totalTrees = scaleByMapSize(MIN_TREES, MAX_TREES);
var numForest = totalTrees * P_FOREST;
var numStragglers = totalTrees * (1.0 - P_FOREST);

log("Creating forests...");
var types = [
	[[tSnowA, tSnowA, tSnowA, tSnowA, pForestD], [tSnowA, tSnowA, tSnowA, pForestD]],
	[[tSnowA, tSnowA, tSnowA, tSnowA, pForestS], [tSnowA, tSnowA, tSnowA, pForestS]]
];	// some variation

var size = numForest / (scaleByMapSize(3,6) * numPlayers);

var num = floor(size / types.length);
for (let type of types)
	createAreas(
		new ChainPlacer(1, floor(scaleByMapSize(3, 5)), numForest / (num * floor(scaleByMapSize(2,4))), 1),
		[
			new LayeredPainter(type, [2]),
			paintClass(clForest)
		],
		avoidClasses(clPlayer, 20, clForest, 20, clHill, 0, clWater, 8),
		num);

log("Creating iceberg...");
createObjectGroupsDeprecated(
	new SimpleGroup([new SimpleObject(aIceberg, 0,2, 0,4)], true, clRock),
	0,
	[avoidClasses(clRock, 6), stayClasses(clWater, 4)],
	scaleByMapSize(4,16),
	100);
RMS.SetProgress(70);

log("Creating dirt patches...");
for (let size of [scaleByMapSize(3, 6), scaleByMapSize(5, 10), scaleByMapSize(8, 21)])
	createAreas(
		new ChainPlacer(1, floor(scaleByMapSize(3, 5)), size, 0.5),
		[
			new LayeredPainter([tSnowD, tSnowB, tSnowC], [2, 1]),
			paintClass(clDirt)
		],
		avoidClasses(
			clWater, 8,
			clForest, 0,
			clHill, 0,
			clPlayer, 20,
			clDirt, 16),
		scaleByMapSize(20, 80));

for (let size of [scaleByMapSize(2, 4), scaleByMapSize(3, 7), scaleByMapSize(5, 15)])
	createAreas(
		new ChainPlacer(1, floor(scaleByMapSize(3, 5)), size, 0.5),
		[
			new LayeredPainter([tSnowE, tSnowE], [1]),
			paintClass(clDirt)
		],
		avoidClasses(
			clWater, 8,
			clForest, 0,
			clHill, 0,
			clPlayer, 20,
			clDirt, 16),
		scaleByMapSize(20, 80));

log("Creating stone mines...");
var group = new SimpleGroup([new SimpleObject(oStoneSmall, 0,2, 0,4), new SimpleObject(oStoneLarge, 1,1, 0,4)], true, clRock);
createObjectGroupsDeprecated(group, 0,
	avoidClasses(clWater, 3, clForest, 1, clPlayer, 20, clRock, 10, clHill, 1),
	scaleByMapSize(8,32), 100
);

log("Creating small stone quarries...");
group = new SimpleGroup([new SimpleObject(oStoneSmall, 2,5, 1,3)], true, clRock);
createObjectGroupsDeprecated(group, 0,
	avoidClasses(clWater, 3, clForest, 1, clPlayer, 20, clRock, 10, clHill, 1),
	scaleByMapSize(8,32), 100
);

log("Creating metal mines...");
group = new SimpleGroup([new SimpleObject(oMetalLarge, 1,1, 0,4)], true, clMetal);
createObjectGroupsDeprecated(group, 0,
	avoidClasses(clWater, 3, clForest, 1, clPlayer, 20, clMetal, 10, clRock, 5, clHill, 1),
	scaleByMapSize(8,32), 100
);
RMS.SetProgress(95);

log("Creating straggler trees...");
var types = [oPine];	// some variation
var num = floor(numStragglers / types.length);
for (var i = 0; i < types.length; ++i)
{
	group = new SimpleGroup(
		[new SimpleObject(types[i], 1,1, 0,3)],
		true, clForest
	);
	createObjectGroupsDeprecated(group, 0,
		avoidClasses(clWater, 5, clForest, 1, clHill, 1, clPlayer, 12, clMetal, 6, clRock, 6),
		num
	);
}

log("Creating deer...");
group = new SimpleGroup(
	[new SimpleObject(oWalrus, 5,7, 0,4)],
	true, clFood
);
createObjectGroupsDeprecated(group, 0,
	avoidClasses(clWater, 3, clForest, 0, clPlayer, 20, clHill, 1, clFood, 20),
	3 * numPlayers, 50
);

RMS.SetProgress(75);

log("Creating sheep...");
group = new SimpleGroup(
	[new SimpleObject(oWolf, 2,3, 0,2)],
	true, clFood
);
createObjectGroupsDeprecated(group, 0,
	avoidClasses(clWater, 3, clForest, 0, clPlayer, 20, clHill, 1, clFood, 20),
	3 * numPlayers, 50
);

log("Creating fish...");
group = new SimpleGroup(
	[new SimpleObject(oFish, 2,3, 0,2)],
	true, clFood
);
createObjectGroupsDeprecated(group, 0,
	[avoidClasses(clFood, 20), stayClasses(clWater, 6)],
	25 * numPlayers, 60
);

setSunColor(0.6, 0.6, 0.6);
setSunElevation(PI/ 6);

setWaterColor(0.02, 0.17, 0.52);
setWaterTint(0.494, 0.682, 0.808);
setWaterMurkiness(0.82);
setWaterWaviness(0.5);
setWaterType("ocean");

setFogFactor(0.95);
setFogThickness(0.09);
setPPSaturation(0.28);
setPPEffect("hdr");

setSkySet("fog");
ExportMap();
