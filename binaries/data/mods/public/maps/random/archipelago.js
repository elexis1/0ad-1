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
const tHill = g_Terrains.hill;
const tTier4Terrain = g_Terrains.dirt;
const tRoad = g_Terrains.road;
const tRoadWild = g_Terrains.roadWild;
const tTier5Terrain = g_Terrains.tier4Terrain;
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

const shoreRadius = 4;

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

var [playerIDs, playerX, playerZ] = radialPlayerPlacement();
var islandRadius = scaleByMapSize(22, 31);

log("Creating player islands...");
for (let i = 0; i < numPlayers; ++i)
	createArea(
		new ChainPlacer(
			2,
			Math.floor(scaleByMapSize(5, 10)),
			Math.floor(scaleByMapSize(25, 60)),
			1,
			Math.floor(fractionToTiles(playerX[i])),
			Math.floor(fractionToTiles(playerZ[i])),
			0,
			[Math.floor(islandRadius)]),
		[
			new LayeredPainter([tMainTerrain , tMainTerrain, tMainTerrain], [1, shoreRadius]),
			new SmoothElevationPainter(ELEVATION_SET, 3, shoreRadius),
			paintClass(clPlayer)
		],
		null);

placeDefaultPlayerBases({
	"playerPlacement": [playerIDs, playerX, playerZ],
	// playerTileClass marked above
	"baseResourceClass": clBaseResource,
	"iberWalls": "towers",
	// cityPatch painted below
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
	"treasures": {
		"types": [
			{
				"template": "gaia/special_treasure_wood",
				"count": 14
			}
		]
	},
	"trees": {
		"template": oTree1,
		"radius": islandRadius,
		"radiusFactor": 1/10
	},
	"decoratives": {
		"template": aGrassShort
	}
});

log("Creating islands...");
createAreas(
	new ChainPlacer(floor(scaleByMapSize(4, 8)), floor(scaleByMapSize(8, 14)), floor(scaleByMapSize(25, 60)), 0.07, undefined, undefined, scaleByMapSize(30,70)),
	[
		new LayeredPainter([tMainTerrain, tMainTerrain], [2]),
		new SmoothElevationPainter(ELEVATION_SET, 3, 4),
		paintClass(clLand)
	],
	null,
	scaleByMapSize(1, 5) * randIntInclusive(5, 10));

paintTerrainBasedOnHeight(2.4, 3.4, 3, tMainTerrain);
paintTerrainBasedOnHeight(1, 3, 0, tShore);
paintTerrainBasedOnHeight(-8, 1, 2, tWater);

placeDefaultCityPatches({
	"playerIDs": playerIDs,
	"playerX": playerX,
	"playerZ": playerZ,
	"innerTerrain": tRoadWild,
	"outerTerrain": tRoad,
	"radius": islandRadius
});

createBumps([avoidClasses(clPlayer, 10), stayClasses(clLand, 5)]);

if (randBool())
	createHills([tMainTerrain, tCliff, tHill], [avoidClasses(clPlayer, 2, clHill, 15), stayClasses(clLand, 0)], clHill, scaleByMapSize(1, 4) * numPlayers);
else
	createMountains(tCliff, [avoidClasses(clPlayer, 2, clHill, 15), stayClasses(clLand, 0)], clHill, scaleByMapSize(1, 4) * numPlayers);

createForests(
 [tMainTerrain, tForestFloor1, tForestFloor2, pForest1, pForest2],
 [avoidClasses(clPlayer, 20, clForest, 17, clHill, 0), stayClasses(clLand, 4)],
 clForest,
 1,
 ...rBiomeTreeCount(1));
RMS.SetProgress(50);

log("Creating dirt patches...");
createLayeredPatches(
 [scaleByMapSize(3, 6), scaleByMapSize(5, 10), scaleByMapSize(8, 21)],
 [[tMainTerrain,tTier1Terrain],[tTier1Terrain,tTier2Terrain], [tTier2Terrain,tTier3Terrain]],
 [1,1],
 [avoidClasses(clForest, 0, clHill, 0, clDirt, 3, clPlayer, 12), stayClasses(clLand, 7)]
);

log("Creating grass patches...");
createPatches(
 [scaleByMapSize(2, 4), scaleByMapSize(3, 7), scaleByMapSize(5, 15)],
 tTier4Terrain,
 [avoidClasses(clForest, 0, clHill, 0, clDirt, 3, clPlayer, 12), stayClasses(clLand, 7)]
);
RMS.SetProgress(55);

log("Creating stone mines...");
createMines(
 [
  [new SimpleObject(oStoneSmall, 0,2, 0,4), new SimpleObject(oStoneLarge, 1,1, 0,4)],
  [new SimpleObject(oStoneSmall, 2,5, 1,3)]
 ],
 [avoidClasses(clForest, 1, clPlayer, 7, clRock, 10, clHill, 1), stayClasses(clLand, 6)]
);

log("Creating metal mines...");
createMines(
 [
  [new SimpleObject(oMetalLarge, 1,1, 0,4)]
 ],
 [avoidClasses(clForest, 1, clPlayer, 7, clMetal, 10, clRock, 5, clHill, 1), stayClasses(clLand, 6)],
 clMetal
);
RMS.SetProgress(65);

log("Creating decoration...");
var planetm = currentBiome() == "tropic" ? 8 : 1;
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
 [avoidClasses(clForest, 0, clPlayer, 0, clHill, 0), stayClasses(clLand, 5)]
);
RMS.SetProgress(70);

log("Creating animals...");
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
 [avoidClasses(clForest, 0, clPlayer, 1, clHill, 1, clFood, 20), stayClasses(clLand, 3)]
);
RMS.SetProgress(75);

log("Creating fruits...");
createFood
(
 [
  [new SimpleObject(oFruitBush, 5,7, 0,4)]
 ],
 [
  3 * numPlayers
 ],
 [avoidClasses(clForest, 0, clPlayer, 1, clHill, 1, clFood, 10), stayClasses(clLand, 3)]
);
RMS.SetProgress(80);

log("Creating fish...");
createFood
(
 [
  [new SimpleObject(oFish, 2,3, 0,2)]
 ],
 [
  25 * numPlayers
 ],
 avoidClasses(clLand, 3, clPlayer, 2, clFood, 20)
);

RMS.SetProgress(85);

log("Creating straggler trees...");
var types = [oTree1, oTree2, oTree4, oTree3];	// some variation
createStragglerTrees(types, [avoidClasses(clForest, 7, clHill, 1, clPlayer, 3, clMetal, 6, clRock, 6), stayClasses(clLand, 7)]);
setWaterWaviness(4.0);
setWaterType("ocean");

ExportMap();
