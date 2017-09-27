RMS.LoadLibrary("rmgen");
RMS.LoadLibrary("rmbiome");

TILE_CENTERED_HEIGHT_MAP = true;

setSelectedBiome();

const tMainTerrain = g_Terrains.mainTerrain;
const tForestFloor1 = g_Terrains.forestFloor1;
const tForestFloor2 = g_Terrains.forestFloor2;
const tCliff = g_Terrains.cliff;
const tTier1Terrain = g_Terrains.tier1Terrain;
const tTier2Terrain = g_Terrains.tier2Terrain;
const tTier3Terrain = g_Terrains.tier3Terrain;
const tHill = g_Terrains.mainTerrain;
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

log(mapSize);

var clPlayer = createTileClass();
var clHill = createTileClass();
var clForest = createTileClass();
var clWater = createTileClass();
var clDirt = createTileClass();
var clRock = createTileClass();
var clMetal = createTileClass();
var clFood = createTileClass();
var clBaseResource = createTileClass();
var clSettlement = createTileClass();
var clLand = createTileClass();

initTerrain(tMainTerrain);

var ix = round(fractionToTiles(0.5));
var iz = round(fractionToTiles(0.5));

createArea(
	new ClumpPlacer(mapArea * 0.23, 1, 1, 10, ix, iz),
	[
		new LayeredPainter([tShore, tWater, tWater, tWater], [1, 4, 2]),
		new SmoothElevationPainter(ELEVATION_SET, -3, 4),
		paintClass(clWater)
	],
	null);

var [playerIDs, playerX, playerZ, playerAngle, startAngle] = radialPlayerPlacement();

placeDefaultPlayerBases({
	"playerPlacement": [playerIDs, playerX, playerZ],
	"playerTileClass": clPlayer,
	"baseResourceClass": clBaseResource,
	"iberWalls": "towers",
	// cityPatch drawn below
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
		"template": oTree1,
		"radiusFactor": 1/15
	},
	"decoratives": {
		"template": aGrassShort
	}
});
RMS.SetProgress(20);

var split = 1;
if (mapSize == 128 && numPlayers <= 2)
	split = 2;
else if (mapSize == 192 && numPlayers <= 3)
	split = 2;
else if (mapSize == 256)
{
	if (numPlayers <= 3)
		split = 3;
	else if (numPlayers == 4)
		split = 2;
}
else if (mapSize == 320)
{
	if (numPlayers <= 3)
		split = 3;
	else if (numPlayers == 4)
		split = 2;
}
else if (mapSize == 384)
{
	if (numPlayers <= 3)
		split = 4;
	else if (numPlayers == 4)
		split = 3;
	else if (numPlayers == 5)
		split = 2;
}
else if (mapSize == 448)
{
	if (numPlayers <= 2)
		split = 5;
	else if (numPlayers <= 4)
		split = 4;
	else if (numPlayers == 5)
		split = 3;
	else if (numPlayers == 6)
		split = 2;
}

log ("Creating rivers...");
for (let m = 0; m < numPlayers * split; ++m)
{
	let tang = startAngle + (m + 0.5) * 2 * Math.PI / (numPlayers * split);

	createArea(
		new PathPlacer(
			fractionToTiles(0.5 + 0.15 * Math.cos(tang)),
			fractionToTiles(0.5 + 0.15 * Math.sin(tang)),
			fractionToTiles(0.5 + 0.49 * Math.cos(tang)),
			fractionToTiles(0.5 + 0.49 * Math.sin(tang)),
			scaleByMapSize(14, 40),
			0,
			3 * scaleByMapSize(1, 3),
			0.2,
			0.05),
		[
		    new LayeredPainter([tShore, tWater, tWater], [1, 3]),
		    new SmoothElevationPainter(ELEVATION_SET, -4, 4),
		    paintClass(clWater)
	    ],
	    avoidClasses(clPlayer, 5));

	createArea(
		new ClumpPlacer(
			Math.floor(Math.PI * Math.pow(scaleByMapSize(7, 20), 2)),
			1,
			0,
			10,
			fractionToTiles(0.5 + 0.49 * Math.cos(tang)),
			fractionToTiles(0.5 + 0.49 * Math.sin(tang))),
		[
			new LayeredPainter([tWater, tWater], [1]),
			new SmoothElevationPainter(ELEVATION_SET, -4, 4),
			paintClass(clWater)
		],
		avoidClasses(clPlayer, 5));

	let tang = startAngle + m * 2 * Math.PI / (numPlayers * split);
	createArea(
		new PathPlacer(
			fractionToTiles(0.5 + 0.05 * Math.cos(tang)),
			fractionToTiles(0.5 + 0.05 * Math.sin(tang)),
			fractionToTiles(0.5 + 0.49 * Math.cos(tang)),
			fractionToTiles(0.5 + 0.49 * Math.sin(tang)),
			scaleByMapSize(10, 40),
			0,
			3 * scaleByMapSize(1, 3),
			0.2,
			0.05),
		[
			new LayeredPainter([tWater, tShore, tMainTerrain], [1, 3]),
			new SmoothElevationPainter(ELEVATION_SET, 3, 4)
		],
		null);
}

createArea(
	new ClumpPlacer(mapArea * 0.15, 1, 1, 10, ix, iz),
	[
		new LayeredPainter([tShore, tWater, tWater, tWater], [1, 4, 2]),
		new SmoothElevationPainter(ELEVATION_SET, 4, 4),
		unPaintClass(clWater)
	],
	null);

createArea(
	new ClumpPlacer(mapArea * 0.09, 1, 1, 10, ix, iz),
	[
		new LayeredPainter([tShore, tWater, tWater], [1, 3]),
		new SmoothElevationPainter(ELEVATION_SET, -2, 3),
		paintClass(clWater)
	],
	null);

createArea(
	new ClumpPlacer(Math.pow(mapSize - 50, 2) * 0.09, 1, 1, 10, ix, iz),
	[
		new LayeredPainter([tShore, tWater, tWater, tWater], [1, 4, 2]),
		new SmoothElevationPainter(ELEVATION_SET, 4, 3),
		unPaintClass(clWater)
	],
	null);

createArea(
	new ClumpPlacer(Math.pow(scaleByMapSize(6, 18), 2) * 22, 1, 1, 10, ix, iz),
	[
		new LayeredPainter([tMainTerrain, tMainTerrain], [1]),
		new SmoothElevationPainter(ELEVATION_SET, 20, 8)
	], null);

paintTerrainBasedOnHeight(-6, 1, 1, tWater);
paintTerrainBasedOnHeight(1, 2, 1, tShore);
paintTerrainBasedOnHeight(2, 5, 1, tMainTerrain);

paintTileClassBasedOnHeight(-6, 0.5, 1, clWater);
unPaintTileClassBasedOnHeight(0.5, 10, 1, clWater);

placeDefaultCityPatches({
	"playerX": playerX,
	"playerZ": playerZ,
	"innerTerrain": tRoadWild,
	"outerTerrain": tRoad
});

if (randBool())
	createHills([tMainTerrain, tCliff, tHill], avoidClasses(clPlayer, 20, clHill, 15, clWater, 2), clHill, scaleByMapSize(1, 4) * numPlayers);
else
	createMountains(tCliff, avoidClasses(clPlayer, 20, clHill, 15, clWater, 2), clHill, scaleByMapSize(1, 4) * numPlayers);

createForests(
 [tMainTerrain, tForestFloor1, tForestFloor2, pForest1, pForest2],
 avoidClasses(clPlayer, 20, clForest, 17, clHill, 0, clWater, 2),
 clForest,
 1,
 ...rBiomeTreeCount(1));

RMS.SetProgress(50);

log("Creating dirt patches...");
createLayeredPatches(
 [scaleByMapSize(3, 6), scaleByMapSize(5, 10), scaleByMapSize(8, 21)],
 [[tMainTerrain,tTier1Terrain],[tTier1Terrain,tTier2Terrain], [tTier2Terrain,tTier3Terrain]],
 [1,1],
 avoidClasses(clWater, 3, clForest, 0, clHill, 0, clDirt, 5, clPlayer, 12)
);

log("Creating grass patches...");
createPatches(
 [scaleByMapSize(2, 4), scaleByMapSize(3, 7), scaleByMapSize(5, 15)],
 tTier4Terrain,
 avoidClasses(clWater, 3, clForest, 0, clHill, 0, clDirt, 5, clPlayer, 12)
);

RMS.SetProgress(55);

log("Creating stone mines...");
createMines(
 [
  [new SimpleObject(oStoneSmall, 0,2, 0,4), new SimpleObject(oStoneLarge, 1,1, 0,4)],
  [new SimpleObject(oStoneSmall, 2,5, 1,3)]
 ],
 avoidClasses(clWater, 3, clForest, 1, clPlayer, 20, clRock, 10, clHill, 1)
);

log("Creating metal mines...");
createMines(
 [
  [new SimpleObject(oMetalLarge, 1,1, 0,4)]
 ],
 avoidClasses(clWater, 3, clForest, 1, clPlayer, 20, clMetal, 10, clRock, 5, clHill, 1),
 clMetal
);

log("Creating fish...");
createObjectGroupsDeprecated(
	new SimpleGroup([new SimpleObject(oFish, 1,1, 0,3)], true, clFood),
	0,
	[stayClasses(clWater, 8), avoidClasses(clFood, 14)],
	scaleByMapSize(400, 2000),
	100);

RMS.SetProgress(65);

var planetm = 1;

if (currentBiome() == "tropic")
	planetm = 8;

createDecoration
(
 [[new SimpleObject(aRockMedium, 1,3, 0,1)],
  [new SimpleObject(aRockLarge, 1,2, 0,1), new SimpleObject(aRockMedium, 1,3, 0,2)],
  [new SimpleObject(aGrassShort, 1,2, 0,1, -PI/8,PI/8)],
  [new SimpleObject(aGrass, 2,4, 0,1.8, -PI/8,PI/8), new SimpleObject(aGrassShort, 3,6, 1.2,2.5, -PI/8,PI/8)],
  [new SimpleObject(aBushMedium, 1,2, 0,2), new SimpleObject(aBushSmall, 2,4, 0,2)]
 ],
 [
  scaleByMapSize(16, 262),
  scaleByMapSize(8, 131),
  planetm * scaleByMapSize(13, 200),
  planetm * scaleByMapSize(13, 200),
  planetm * scaleByMapSize(13, 200)
 ],
 avoidClasses(clWater, 0, clForest, 0, clPlayer, 5, clHill, 0, clBaseResource, 4)
);

RMS.SetProgress(70);

createFood
(
 [
  [new SimpleObject(oMainHuntableAnimal, 5,7, 0,4)],
  [new SimpleObject(oSecondaryHuntableAnimal, 2,3, 0,2)]
 ],
 [
  3 * numPlayers,
  3 * numPlayers
 ],
 avoidClasses(clWater, 3, clForest, 0, clPlayer, 20, clHill, 1, clFood, 20)
);

createFood
(
 [
  [new SimpleObject(oFruitBush, 5,7, 0,4)]
 ],
 [
  3 * numPlayers
 ],
 avoidClasses(clWater, 3, clForest, 0, clPlayer, 20, clHill, 1, clFood, 10)
);

createStragglerTrees(
	[oTree1, oTree2, oTree4, oTree3],
	avoidClasses(clWater, 5, clForest, 7, clHill, 1, clPlayer, 12, clMetal, 6, clRock, 6));

ExportMap();
