RMS.LoadLibrary("rmgen");
RMS.LoadLibrary("common");

const tGrass = ["temp_grass", "temp_grass", "temp_grass_d"];
const tGrassPForest = "temp_plants_bog";
const tGrassDForest = "temp_plants_bog";
const tGrassA = "temp_grass_plants";
const tGrassB = "temp_plants_bog";
const tGrassC = "temp_mud_a";
const tRoad = "temp_road";
const tRoadWild = "temp_road_overgrown";
const tGrassPatchBlend = "temp_grass_long_b";
const tGrassPatch = ["temp_grass_d", "temp_grass_clovers"];
const tShore = "temp_plants_bog";
const tWater = "temp_mud_a";

const oBeech = "gaia/flora_tree_euro_beech";
const oOak = "gaia/flora_tree_oak";
const oBerryBush = "gaia/flora_bush_berry";
const oDeer = "gaia/fauna_deer";
const oRabbit = "gaia/fauna_rabbit";
const oStoneLarge = "gaia/geology_stonemine_temperate_quarry";
const oStoneSmall = "gaia/geology_stone_temperate";
const oMetalLarge = "gaia/geology_metal_temperate_slabs";

const aGrass = "actor|props/flora/grass_soft_small_tall.xml";
const aGrassShort = "actor|props/flora/grass_soft_large.xml";
const aRockLarge = "actor|geology/stone_granite_med.xml";
const aRockMedium = "actor|geology/stone_granite_med.xml";
const aReeds = "actor|props/flora/reeds_pond_lush_a.xml";
const aLillies = "actor|props/flora/water_lillies.xml";
const aBushMedium = "actor|props/flora/bush_medit_me.xml";
const aBushSmall = "actor|props/flora/bush_medit_sm.xml";

const pForestB = [tGrassDForest + TERRAIN_SEPARATOR + oBeech, tGrassDForest];
const pForestO = [tGrassPForest + TERRAIN_SEPARATOR + oOak, tGrassPForest];
const pForestR = [tGrassDForest + TERRAIN_SEPARATOR + oBeech, tGrassDForest, tGrassDForest + TERRAIN_SEPARATOR + oOak, tGrassDForest, tGrassDForest, tGrassDForest];

InitMap();

const numPlayers = getNumPlayers();

var clPlayer = createTileClass();
var clHill = createTileClass();
var clForest = createTileClass();
// Only used for tributary rivers!
var clWater = createTileClass();
var clDirt = createTileClass();
var clRock = createTileClass();
var clMetal = createTileClass();
var clFood = createTileClass();
var clBaseResource = createTileClass();
var clShallow = createTileClass();

var waterHeight = -4;

placeDefaultPlayerBases({
	"playerPlacement": placePlayersRiver(true, 0.5, 0),
	// playerTileClass marked below
	"baseResourceClass": clBaseResource,
	"iberWalls": "towers",
	"cityPatch": {
		"innerTerrain": tRoadWild,
		"outerTerrain": tRoad,
		"painters": [
			paintClass(clPlayer)
		]
	},
	"chicken": {
	},
	"berries": {
		"template": oBerryBush
	},
	"mines": {
		"types": [
			{ "template": oMetalLarge },
			{ "template": oStoneLarge }
		]
	},
	"trees": {
		"template": oOak,
		"radiusFactor": 1/10,
		"maxDistGroup": 5
	},
	"decoratives": {
		"template": aGrassShort
	}
});

log("Creating the main river...");
var river1 = [1, fractionToTiles(0.5)];
var river2 = [fractionToTiles(0.99), fractionToTiles(0.5)];
createArea(
	new PathPlacer(...river1, ...river2, scaleByMapSize(10, 20), 0.5, 3 * scaleByMapSize(1, 4), 0.1, 0.01),
	new SmoothElevationPainter(ELEVATION_SET, waterHeight, 4),
	avoidClasses(clPlayer, 4));

log("Creating small puddles at the map border to ensure players being separated...");
for (let [fx, fz] of [river1, river2])
	createArea(
		new ClumpPlacer(Math.floor(diskArea(scaleByMapSize(5, 10))), 0.95, 0.6, 10, fx, fz),
		new SmoothElevationPainter(ELEVATION_SET, waterHeight, 2),
		avoidClasses(clPlayer, 8));

log("Creating the shallows of the main river...");
for (let i = 0; i <= randIntInclusive(3, scaleByMapSize(4, 6)); ++i)
{
	let cLocation = Math.floor(fractionToTiles(randFloat(0.15, 0.85)));
	passageMaker(
		cLocation,
		Math.floor(fractionToTiles(0.35)),
		cLocation,
		Math.floor(fractionToTiles(0.65)),
		scaleByMapSize(4, 8),
		-2,
		-2,
		2,
		clShallow,
		undefined,
		waterHeight);
}

createTributaries(
	true,
	randIntInclusive(9, scaleByMapSize(13, 21)),
	scaleByMapSize(10, 20),
	waterHeight,
	[-6, -1.5],
	0.2 * Math.PI,
	clWater,
	clShallow,
	avoidClasses(clPlayer, 3, clBaseResource, 4));

paintTerrainBasedOnHeight(-5, 1, 1, tWater);
paintTerrainBasedOnHeight(1, 2, 1, pForestR);
paintTileClassBasedOnHeight(-6, 0.5, 1, clWater);

RMS.SetProgress(50);

log("Creating bumps...");
createAreas(
	new ClumpPlacer(scaleByMapSize(20, 50), 0.3, 0.06, 1),
	new SmoothElevationPainter(ELEVATION_MODIFY, 2, 2),
	avoidClasses(clWater, 2, clPlayer, 15),
	scaleByMapSize(100, 200)
);
RMS.SetProgress(55);

// calculate desired number of trees for map (based on size)
const MIN_TREES = 500;
const MAX_TREES = 2500;
const P_FOREST = 0.7;

var totalTrees = scaleByMapSize(MIN_TREES, MAX_TREES);
var numForest = totalTrees * P_FOREST;
var numStragglers = totalTrees * (1.0 - P_FOREST);

log("Creating forests...");
var types = [
	[[tGrassDForest, tGrass, pForestB], [tGrassDForest, pForestB]],
	[[tGrassPForest, tGrass, pForestO], [tGrassPForest, pForestO]]
];
var size = numForest / (scaleByMapSize(3, 6) * numPlayers);
var num = Math.floor(size / types.length);
for (let type of types)
	createAreas(
		new ChainPlacer(1, Math.floor(scaleByMapSize(3, 5)), numForest / num, 0.5),
		[
			new LayeredPainter(type, [2]),
			paintClass(clForest)
		],
		avoidClasses(
			clPlayer, 15,
			clWater, 3,
			clForest, 16,
			clHill, 1),
		num);
RMS.SetProgress(70);

log("Creating dirt patches...");
for (let size of [scaleByMapSize(3, 6), scaleByMapSize(5, 10), scaleByMapSize(8, 21)])
	createAreas(
		new ChainPlacer(1, Math.floor(scaleByMapSize(3, 5)), size, 0.5),
		[
			new LayeredPainter([[tGrass,tGrassA], tGrassB, [tGrassB,tGrassC]], [1, 1]),
			paintClass(clDirt)
		],
		avoidClasses(clWater, 1, clForest, 0, clHill, 0, clDirt, 5, clPlayer, 6),
		scaleByMapSize(15, 45)
	);

log("Creating grass patches...");
for (let size of [scaleByMapSize(2, 4), scaleByMapSize(3, 7), scaleByMapSize(5, 15)])
	createAreas(
		new ChainPlacer(1, Math.floor(scaleByMapSize(3, 5)), size, 0.5),
		new LayeredPainter([tGrassPatchBlend, tGrassPatch], [1]),
		avoidClasses(clWater, 1, clForest, 0, clHill, 0, clDirt, 5, clPlayer, 6),
		scaleByMapSize(15, 45)
	);
RMS.SetProgress(80);

log("Creating stone mines...");
var group = new SimpleGroup([new SimpleObject(oStoneSmall, 0, 2, 0, 4), new SimpleObject(oStoneLarge, 1, 1, 0, 4)], true, clRock);
createObjectGroupsDeprecated(group, 0,
	[avoidClasses(clWater, 0, clForest, 1, clPlayer, 15, clRock, 10, clHill, 1)],
	scaleByMapSize(4,16), 100
);

log("Creating small stone quarries...");
group = new SimpleGroup([new SimpleObject(oStoneSmall, 2,5, 1,3)], true, clRock);
createObjectGroupsDeprecated(group, 0,
	[avoidClasses(clWater, 0, clForest, 1, clPlayer, 15, clRock, 10, clHill, 1)],
	scaleByMapSize(4,16), 100
);

log("Creating metal mines...");
group = new SimpleGroup([new SimpleObject(oMetalLarge, 1,1, 0,4)], true, clMetal);
createObjectGroupsDeprecated(group, 0,
	[avoidClasses(clWater, 0, clForest, 1, clPlayer, 15, clMetal, 10, clRock, 5, clHill, 1)],
	scaleByMapSize(4,16), 100
);

RMS.SetProgress(86);

log("Creating small decorative rocks...");
group = new SimpleGroup(
	[new SimpleObject(aRockMedium, 1,3, 0,1)],
	true
);
createObjectGroupsDeprecated(
	group, 0,
	avoidClasses(clWater, 0, clForest, 0, clPlayer, 0, clHill, 0),
	scaleByMapSize(16, 262), 50
);

log("Creating large decorative rocks...");
group = new SimpleGroup(
	[new SimpleObject(aRockLarge, 1,2, 0,1), new SimpleObject(aRockMedium, 1,3, 0,2)],
	true
);
createObjectGroupsDeprecated(
	group, 0,
	avoidClasses(clWater, 0, clForest, 0, clPlayer, 0, clHill, 0),
	scaleByMapSize(8, 131), 50
);

log("Creating deer...");
group = new SimpleGroup(
	[new SimpleObject(oDeer, 5,7, 0,4)],
	true, clFood
);
createObjectGroupsDeprecated(group, 0,
	avoidClasses(clWater, 0, clForest, 0, clPlayer, 15, clHill, 1, clFood, 20),
	3 * numPlayers, 50
);

log("Creating rabbits...");
group = new SimpleGroup(
	[new SimpleObject(oRabbit, 2,3, 0,2)],
	true, clFood
);
createObjectGroupsDeprecated(group, 0,
	avoidClasses(clWater, 0, clForest, 0, clPlayer, 15, clHill, 1, clFood, 20),
	3 * numPlayers, 50
);

log("Creating berry bush...");
group = new SimpleGroup(
	[new SimpleObject(oBerryBush, 5,7, 0,4)],
	true, clFood
);
createObjectGroupsDeprecated(group, 0,
	avoidClasses(clWater, 3, clForest, 0, clPlayer, 15, clHill, 1, clFood, 10),
	randIntInclusive(1, 4) * numPlayers + 2, 50
);

log("Creating straggler trees...");
var types = [oOak, oBeech];
var num = floor(numStragglers / types.length);
for (let type of types)
	createObjectGroupsDeprecated(
		new SimpleGroup([new SimpleObject(type, 1, 1, 0, 3)], true, clForest),
		0,
		avoidClasses(clWater, 1, clForest, 7, clHill, 1, clPlayer, 5, clMetal, 6, clRock, 6),
		num);

log("Creating small grass tufts...");
group = new SimpleGroup(
	[new SimpleObject(aGrassShort, 1,2, 0,1, -PI/8,PI/8)]
);
createObjectGroupsDeprecated(group, 0,
	avoidClasses(clWater, 2, clHill, 2, clPlayer, 2, clDirt, 0),
	scaleByMapSize(13, 200)
);

log("Creating large grass tufts...");
group = new SimpleGroup(
	[new SimpleObject(aGrass, 2,4, 0,1.8, -PI/8,PI/8), new SimpleObject(aGrassShort, 3,6, 1.2,2.5, -PI/8,PI/8)]
);
createObjectGroupsDeprecated(group, 0,
	avoidClasses(clWater, 3, clHill, 2, clPlayer, 2, clDirt, 1, clForest, 0),
	scaleByMapSize(13, 200)
);

log("Creating bushes...");
group = new SimpleGroup(
	[new SimpleObject(aBushMedium, 1,2, 0,2), new SimpleObject(aBushSmall, 2,4, 0,2)]
);
createObjectGroupsDeprecated(group, 0,
	avoidClasses(clWater, 1, clHill, 1, clPlayer, 1, clDirt, 1),
	scaleByMapSize(13, 200), 50
);

log("Creating shallow flora...");
group = new SimpleGroup(
	[new SimpleObject(aLillies, 1,2, 0,2), new SimpleObject(aReeds, 2,4, 0,2)]
);
createObjectGroupsDeprecated(group, 0,
	stayClasses(clShallow, 1),
	60 * scaleByMapSize(13, 200), 80
);

setSkySet("cirrus");
setWaterColor(0.1,0.212,0.422);
setWaterTint(0.3,0.1,0.949);
setWaterWaviness(3.0);
setWaterType("lake");
setWaterMurkiness(0.80);

ExportMap();
