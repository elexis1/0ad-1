RMS.LoadLibrary("rmgen");

const tGrass1 = "cliff volcanic light";
const tGrass2 = "ocean_rock_a";
const tGrass3 = "temp_grass_plants";
const tCliff = ["cliff volcanic coarse", "cave_walls"];
const tRoad = "road1";
const tRoadWild = "road1";
const tForestFloor1 = "temp_forestfloor_a";
const tForestFloor2 = "temp_grass";
const tGrassPatchBlend = "temp_grass_long_b";
const tGrassPatch = ["temp_grass_d", "temp_grass_clovers"];
const tLava1 = "cliff volcanic light";
const tLava2 = "cliff volcanic light";
const tLava3 = "cliff volcanic light";
const tShoreBlend = "cliff volcanic light";
const tShore = "ocean_rock_a";
const tWater = "ocean_rock_b";

// gaia entities
const oTree = "gaia/flora_tree_dead";
const oTree2 = "gaia/flora_tree_euro_beech";
const oTree3 = "gaia/flora_tree_oak";
const oTree4 = "gaia/flora_tree_oak_dead";
const oBush = "gaia/flora_bush_temperate";
const oFruitBush = "gaia/flora_bush_berry";
const oRabbit = "gaia/fauna_rabbit";
const oDeer = "gaia/fauna_deer";
const oBear = "gaia/fauna_bear";
const oStoneLarge = "gaia/geology_stonemine_temperate_quarry";
const oStoneSmall = "gaia/geology_stone_temperate";
const oMetalLarge = "gaia/geology_metal_temperate_slabs";

// decorative props
const aRockLarge = "actor|geology/stone_granite_med.xml";
const aRockMedium = "actor|geology/stone_granite_med.xml";
const aBushMedium = "actor|props/flora/bush_tempe_me.xml";
const aBushSmall = "actor|props/flora/bush_tempe_sm.xml";
const aGrass = "actor|props/flora/grass_soft_large_tall.xml";
const aGrassShort = "actor|props/flora/grass_soft_large.xml";

const pForestD = [
	tForestFloor1 + TERRAIN_SEPARATOR + oTree,
	tForestFloor2 + TERRAIN_SEPARATOR + oTree2,
	tForestFloor1];

const pForestP = [
	tForestFloor1 + TERRAIN_SEPARATOR + oTree3,
	tForestFloor2 + TERRAIN_SEPARATOR + oTree4,
	tForestFloor1];

const pForestM = [
	tForestFloor1 + TERRAIN_SEPARATOR + oTree,
	tForestFloor2 + TERRAIN_SEPARATOR + oTree2,
	tForestFloor2 + TERRAIN_SEPARATOR + oTree3,
	tForestFloor1 + TERRAIN_SEPARATOR + oTree4,
	tForestFloor1];

log("Initializing map...");
InitMap();

var numPlayers = getNumPlayers();
var mapSize = getMapSize();
var mapArea = mapSize * mapSize;

// create tile classes
var clPlayer = createTileClass();
var clHill = createTileClass();
var clFood = createTileClass();
var clForest = createTileClass();
var clWater = createTileClass();
var clDirt = createTileClass();
var clRock = createTileClass();
var clMetal = createTileClass();
var clBaseResource = createTileClass();

// randomize player order
var playerIDs = [];
for (var i = 0; i < numPlayers; i++)
	playerIDs.push(i+1);
playerIDs = sortPlayers(playerIDs);

// place players
var playerX = new Array(numPlayers);
var playerZ = new Array(numPlayers);
var playerAngle = new Array(numPlayers);

var startAngle = randFloat(0, TWO_PI);
for (var i = 0; i < numPlayers; i++)
{
	playerAngle[i] = startAngle + i*TWO_PI/numPlayers;
	playerX[i] = 0.5 + 0.35*cos(playerAngle[i]);
	playerZ[i] = 0.5 + 0.35*sin(playerAngle[i]);
}

var ccMountainHeight = 25;

for (var i = 0; i < numPlayers; i++)
{
	var id = playerIDs[i];
	log("Creating base for player " + id + "...");

	var radius = scaleByMapSize(15,25);

	// get the x and z in tiles
	var fx = fractionToTiles(playerX[i]);
	var fz = fractionToTiles(playerZ[i]);
	var ix = round(fx);
	var iz = round(fz);

	// This one consists of many bumps, creating an omnidirectional ramp
	createMountain(
		ccMountainHeight,
		Math.floor(scaleByMapSize(15, 15)),
		Math.floor(scaleByMapSize(15, 15)),
		Math.floor(scaleByMapSize(4, 10)),
		avoidClasses(),
		ix,
		iz,
		tGrass1,
		clPlayer,
		14
	);

	// Flatten the initial CC area
	var hillSize = PI * radius * radius;
	createArea(
		new ClumpPlacer(hillSize, 0.95, 0.6, 10, ix, iz),
		[
			new LayeredPainter([tCliff, tGrass2], [radius]),
			new SmoothElevationPainter(ELEVATION_SET, ccMountainHeight, radius),
			paintClass(clPlayer)
		],
		null);

	// create the city patch
	var cityRadius = radius/3;
	var placer = new ClumpPlacer(PI*cityRadius*cityRadius, 0.6, 0.3, 10, ix, iz);
	var painter = new LayeredPainter([tRoadWild, tRoad], [1]);
	createArea(placer, painter, null);

	placeCivDefaultEntities(fx, fz, id, { 'iberWall': 'towers' });

	// create metal mine
	var bbAngle = randFloat(0, TWO_PI);
	var bbDist = 12;
	var mAngle = bbAngle;
	while(abs(mAngle - bbAngle) < PI/3)
		mAngle = randFloat(0, TWO_PI);

	var mDist = 12;
	var mX = round(fx + mDist * cos(mAngle));
	var mZ = round(fz + mDist * sin(mAngle));
	var group = new SimpleGroup(
		[new SimpleObject(oMetalLarge, 1,1, 0,0)],
		true, clBaseResource, mX, mZ
	);
	createObjectGroup(group, 0);

	// create stone mines
	mAngle += randFloat(PI/4, PI/3);
	mX = round(fx + mDist * cos(mAngle));
	mZ = round(fz + mDist * sin(mAngle));
	group = new SimpleGroup(
		[new SimpleObject(oStoneLarge, 1,1, 0,2)],
		true, clBaseResource, mX, mZ
	);
	createObjectGroup(group, 0);

	placeDefaultChicken(fx, fz, clBaseResource);

	// create berry bushes
	var bbAngle = randFloat(0, TWO_PI);
	var bbDist = 12;
	var bbX = round(fx + bbDist * cos(bbAngle));
	var bbZ = round(fz + bbDist * sin(bbAngle));
	group = new SimpleGroup(
		[new SimpleObject(oFruitBush, 2,2, 0,3)],
		true, clBaseResource, bbX, bbZ
	);
	createObjectGroup(group, 0);

	// create starting trees
	var num = floor(hillSize / 60);
	var tries = 10;
	for (var x = 0; x < tries; ++x)
	{
		var tAngle = randFloat(-PI/3, 4*PI/3);
		var tDist = randFloat(12, 13);
		var tX = round(fx + tDist * cos(tAngle));
		var tZ = round(fz + tDist * sin(tAngle));
		group = new SimpleGroup(
			[new SimpleObject(oTree2, num, num, 0, 3)],
			false, clBaseResource, tX, tZ
		);
		if (createObjectGroup(group, 0, avoidClasses(clBaseResource, 2)))
			break;
	}

	placeDefaultDecoratives(fx, fz, aGrassShort, clBaseResource, radius);
}
RMS.SetProgress(15);

createVolcano();

RMS.SetProgress(45);

log("Creating lakes...");
createAreas(
	new ChainPlacer(1, Math.floor(scaleByMapSize(5, 7)), Math.floor(scaleByMapSize(15, 20)), 0.1),
	[
		new LayeredPainter([tShoreBlend, tShore, tWater], [1,1]),
		new SmoothElevationPainter(ELEVATION_SET, -4, 3),
		paintClass(clWater)
	],
	avoidClasses(clPlayer, 0, clHill, 2, clWater, 12),
	Math.round(scaleByMapSize(4, 12))
);

createBumps(avoidClasses(clPlayer, 0, clHill, 0), 150, 1, 10, 3, 0, 10, 500);

log("Creating hills...");
createAreas(
	new ClumpPlacer(scaleByMapSize(20, 150), 0.2, 0.1, 1),
	[
		new LayeredPainter([tGrass1, tGrass2], [2]),
		new SmoothElevationPainter(ELEVATION_SET, 18, 2),
		paintClass(clHill)
	],
	avoidClasses(clPlayer, 0, clHill, 15, clWater, 2, clBaseResource, 2),
	scaleByMapSize(2, 8) * numPlayers
);

// calculate desired number of trees for map (based on size)

var MIN_TREES = 300;
var MAX_TREES = 1000;
var P_FOREST = 0.6;

var totalTrees = scaleByMapSize(MIN_TREES, MAX_TREES);
var numForest = totalTrees * P_FOREST;
var numStragglers = totalTrees * (1.0 - P_FOREST);
/*
log("Creating forests...");
var types = [
	[[tGrass2, tGrass1, pForestD], [tGrass2, pForestD]],
	[[tGrass2, tGrass1, pForestM], [tGrass2, pForestM]],
	[[tGrass2, tGrass1, pForestP], [tGrass2, pForestP]]
];
var size = numForest / (scaleByMapSize(2, 8) * numPlayers);
var num = Math.floor(size / types.length);
for (let type of types)
	createAreas(
		new ClumpPlacer(numForest / num, 0.1, 0.1, 1),
		[
			new LayeredPainter(type, [2]),
			paintClass(clForest)
		],
		avoidClasses(clPlayer, 0, clForest, 10, clHill, 0, clWater, 2),
		num
	);
RMS.SetProgress(70);
*/
createForests(
	pForestM,
	avoidClasses(clPlayer, 0, clForest, 15, clHill, 2, clWater, 2),
	clForest,
	1.0
);

log("Creating dirt patches...");
for (let size of [scaleByMapSize(3, 48), scaleByMapSize(5, 84), scaleByMapSize(8, 128)])
	createAreas(
		new ClumpPlacer(size, 0.3, 0.06, 0.5),
		[
			new LayeredPainter([tGrass1,tGrass2], [1]),
			paintClass(clDirt)
		],
		avoidClasses(clWater, 3, clForest, 0, clHill, 0, clPlayer, 0),
		scaleByMapSize(20, 80)
	);

for (let size of [scaleByMapSize(3, 48), scaleByMapSize(5, 84), scaleByMapSize(8, 128)])
	createAreas(
		new ClumpPlacer(size, 0.3, 0.06, 0.5),
		[
			new LayeredPainter([tGrass2,tGrass2], [1]),
			paintClass(clDirt)
		],
		avoidClasses(clWater, 3, clForest, 0, clHill, 0, clPlayer, 0),
		scaleByMapSize(20, 80)
	);

for (let size of [scaleByMapSize(3, 48), scaleByMapSize(5, 84), scaleByMapSize(8, 128)])
	createAreas(
		new ClumpPlacer(size, 0.3, 0.06, 0.5),
		[
			new LayeredPainter([tGrass3, tGrass3], [1]),
			paintClass(clDirt)
		],
		avoidClasses(clWater, 3, clForest, 0, clHill, 0, clPlayer, 0),
		scaleByMapSize(20, 80)
	);

log("Creating grass patches...");
createLayeredPatches(
	[scaleByMapSize(2, 4), scaleByMapSize(3, 7), scaleByMapSize(5, 15)],
	[tGrassPatchBlend, tGrassPatch],
	[1],
	avoidClasses(clWater, 1, clForest, 0, clHill, 0, clDirt, 5, clPlayer, 0)
);

log("Creating stone mines...");
group = new SimpleGroup([new SimpleObject(oStoneSmall, 0,2, 0,4), new SimpleObject(oStoneLarge, 1,1, 0,4)], true, clRock);
createObjectGroups(group, 0,
	avoidClasses(clWater, 3, clForest, 1, clPlayer, 0, clRock, 10, clHill, 4),
	scaleByMapSize(4,16), 100
);

log("Creating small stone quarries...");
createObjectGroups(
	new SimpleGroup([new SimpleObject(oStoneSmall, 2,5, 1,3)], true, clRock),
	0,
	avoidClasses(clWater, 3, clForest, 1, clPlayer, 0, clRock, 10, clHill, 4),
	scaleByMapSize(4,16), 100
);

log("Creating metal mines...");
group = new SimpleGroup([new SimpleObject(oMetalLarge, 1,1, 0,4)], true, clMetal);
createObjectGroups(group, 0,
	avoidClasses(clWater, 3, clForest, 1, clPlayer, 0, clMetal, 10, clRock, 5, clHill, 4),
	scaleByMapSize(4,16), 100
);
RMS.SetProgress(90);

createDecoration(
	[
		[new SimpleObject(aRockMedium, 1,3, 0,1)],
		[new SimpleObject(aRockLarge, 1,2, 0,1), new SimpleObject(aRockMedium, 1,3, 0,2)],
		[new SimpleObject(aGrassShort, 1,2, 0,1, -PI/8,PI/8)],
		[new SimpleObject(aGrass, 2,4, 0,1.8, -PI/8,PI/8), new SimpleObject(aGrassShort, 3,6, 1.2,2.5, -PI/8,PI/8)],
		[new SimpleObject(aBushMedium, 1,2, 0,2), new SimpleObject(aBushSmall, 2,4, 0,2)]
	],
	[
		scaleByMapSize(16, 262),
		scaleByMapSize(8, 131),
		scaleByMapSize(13, 200),
		scaleByMapSize(13, 200),
		scaleByMapSize(13, 200)
	],
	avoidClasses(clWater, 0, clForest, 0, clPlayer, 0, clHill, 0)
);

createFood(
	[
		[new SimpleObject(oRabbit, 5,7, 0,4)],
		[new SimpleObject(oDeer, 2,3, 0,2)]
	],
	[
		3 * numPlayers,
		3 * numPlayers
	],
	[avoidClasses(clWater, 1, clForest, 0, clPlayer, 0, clHill, 1, clFood, 20)]
);

createFood(
	[
		[new SimpleObject(oBear, 1,1, 0,2)],
	],
	[
		3 * numPlayers
	],
	[avoidClasses(clWater, 1, clForest, 0, clPlayer, 0, clHill, 1, clFood, 20), stayClasses(clForest, 2)]
);

createFood(
	[
		[new SimpleObject(oFruitBush, 1,2, 0,4)]
	],
	[
		3 * numPlayers
	],
	avoidClasses(clWater, 1, clForest, 0, clPlayer, 0, clHill, 1, clFood, 10)
);
RMS.SetProgress(95);

log("Creating straggler trees and bushes...");
var types = [oTree, oTree2, oTree3, oTree4, oBush];
var num = floor(numStragglers / types.length);
for (let type of types)
	createObjectGroups(
		new SimpleGroup(
			[new SimpleObject(type, 1,1, 0,3)],
			true, clForest
		),
		0,
		avoidClasses(clWater, 5, clForest, 1, clHill, 1, clPlayer, 0, clMetal, 1, clRock, 1),
		num
	);

log("Creating straggler bushes...");
var types = [oBush];
var num = floor(numStragglers / types.length);
for (let type of types)
	createObjectGroups(
		new SimpleGroup(
			[new SimpleObject(type, 1,3, 0,3)],
			true, clForest
		),
		0,
		[avoidClasses(clWater, 1, clForest, 1, clPlayer, 0, clMetal, 1, clRock, 1), stayClasses(clHill, 3)],
		num
	);

ExportMap();
