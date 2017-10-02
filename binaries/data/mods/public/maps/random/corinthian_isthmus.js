// delete weird useless loop that were wrong if it werent useless

RMS.LoadLibrary("rmgen");

TILE_CENTERED_HEIGHT_MAP = true;

const tCity = "medit_city_pavement";
const tCityPlaza = "medit_city_pavement";
const tHill = ["medit_grass_shrubs", "medit_rocks_grass_shrubs", "medit_rocks_shrubs", "medit_rocks_grass", "medit_shrubs"];
const tMainDirt = "medit_dirt";
const tCliff = "medit_cliff_aegean";
const tForestFloor = "medit_grass_shrubs";
const tGrass = ["medit_grass_field", "medit_grass_field_a"];
const tGrassSand50 = "medit_grass_field_a";
const tGrassSand25 = "medit_grass_field_b";
const tDirt = "medit_dirt_b";
const tDirt2 = "medit_rocks_grass";
const tDirt3 = "medit_rocks_shrubs";
const tDirtCracks = "medit_dirt_c";
const tShore = "medit_sand";
const tWater = "medit_sand_wet";

const oBerryBush = "gaia/flora_bush_berry";
const oDeer = "gaia/fauna_deer";
const oFish = "gaia/fauna_fish";
const oSheep = "gaia/fauna_sheep";
const oGoat = "gaia/fauna_goat";
const oStoneLarge = "gaia/geology_stonemine_medit_quarry";
const oStoneSmall = "gaia/geology_stone_mediterranean";
const oMetalLarge = "gaia/geology_metal_mediterranean_slabs";
const oDatePalm = "gaia/flora_tree_cretan_date_palm_short";
const oSDatePalm = "gaia/flora_tree_cretan_date_palm_tall";
const oCarob = "gaia/flora_tree_carob";
const oFanPalm = "gaia/flora_tree_medit_fan_palm";
const oPoplar = "gaia/flora_tree_poplar_lombardy";
const oCypress = "gaia/flora_tree_cypress";

const aBush1 = "actor|props/flora/bush_medit_sm.xml";
const aBush2 = "actor|props/flora/bush_medit_me.xml";
const aBush3 = "actor|props/flora/bush_medit_la.xml";
const aBush4 = "actor|props/flora/bush_medit_me.xml";
const aDecorativeRock = "actor|geology/stone_granite_med.xml";

const pForest = [tForestFloor, tForestFloor + TERRAIN_SEPARATOR + oCarob, tForestFloor + TERRAIN_SEPARATOR + oDatePalm, tForestFloor + TERRAIN_SEPARATOR + oSDatePalm, tForestFloor];

InitMap();

const numPlayers = getNumPlayers();
const mapSize = getMapSize();

var clPlayer = createTileClass();
var clForest = createTileClass();
var clWater = createTileClass();
var clDirt = createTileClass();
var clRock = createTileClass();
var clMetal = createTileClass();
var clFood = createTileClass();
var clBaseResource = createTileClass();
var clGrass = createTileClass();
var clHill = createTileClass();

var landHeight = 3;
var waterHeight = -4;

var riverAngle = randFloat(0, 2 * Math.PI);
var riverSize = Math.floor(Math.PI * Math.pow(scaleByMapSize(15, 70) / 2, 2));

var riv1 = [0, 0.5];
var riv2 = [1, 0.5];

log("Creating the main river");
var [riverX1, riverZ1] = rotateCoordinates(...riv1, riverAngle).map(f => fractionToTiles(f));
var [riverX2, riverZ2] = rotateCoordinates(...riv2, riverAngle).map(f => fractionToTiles(f));
createArea(
	new PathPlacer(riverX1, riverZ1, riverX2, riverZ2, scaleByMapSize(15, 70), 0.2, 15 * scaleByMapSize(1, 3), 0.04, 0.01),
	new SmoothElevationPainter(ELEVATION_SET, waterHeight, 4),
	null);

log("Creating small puddles at the map border to ensure players being separated...");
for (let [x, z] of [[riverX1, riverZ1], [riverX2, riverZ2]])
	createArea(
		new ClumpPlacer(riverSize, 0.95, 0.6, 10, x, z),
		new SmoothElevationPainter(ELEVATION_SET, waterHeight, 4),
		null);

log("Creating passage connecting the two riversides...");
createArea(
	new PathPlacer(
		...rotateCoordinates(...riv1, riverAngle + Math.PI/2).map(f => fractionToTiles(f)),
		...rotateCoordinates(...riv2, riverAngle + Math.PI/2).map(f => fractionToTiles(f)),
		scaleByMapSize(10, 30),
		0.5,
		3 * scaleByMapSize(1, 4),
		0.1,
		0.01),
	new SmoothElevationPainter(ELEVATION_SET, landHeight, 4),
	null);

paintTerrainBasedOnHeight(-6, 1, 1, tWater);
paintTerrainBasedOnHeight(1, 2, 1, tShore);
paintTerrainBasedOnHeight(2, 5, 1, tGrass);

paintTileClassBasedOnHeight(-6, 0.5, 1, clWater);

placeDefaultPlayerBases({
	"playerPlacement": placePlayersRiver(true, 0.6, riverAngle),
	"playerTileClass": clPlayer,
	"baseResourceClass": clBaseResource,
	"iberWalls": "towers",
	"cityPatch": {
		"innerTerrain": tCityPlaza,
		"outerTerrain": tCity
	},
	"chicken": {
	},
	"berries": {
		"template": oBerryBush
	},
	"metal": {
		"template": oMetalLarge
	},
	"stone": {
		"template": oStoneLarge
	},
	"trees": {
		"template": oCarob,
		"radiusFactor": 1/30
	},
	"decoratives": {
		"template": aBush1
	}
});
RMS.SetProgress(40);

createBumps(avoidClasses(clWater, 2, clPlayer, 15));

createForests(
 [tForestFloor, tForestFloor, tForestFloor, pForest, pForest],
 avoidClasses(clPlayer, 15, clForest, 17, clWater, 2, clBaseResource, 3),
 clForest
);

RMS.SetProgress(50);

if (randBool())
	createHills([tGrass, tCliff, tHill], avoidClasses(clPlayer, 15, clForest, 1, clHill, 15, clWater, 3), clHill, scaleByMapSize(3, 15));
else
	createMountains(tCliff, avoidClasses(clPlayer, 15, clForest, 1, clHill, 15, clWater, 3), clHill, scaleByMapSize(3, 15));

log("Creating grass patches...");
createLayeredPatches(
 [scaleByMapSize(3, 6), scaleByMapSize(5, 10), scaleByMapSize(8, 21)],
 [[tGrass,tGrassSand50],[tGrassSand50,tGrassSand25], [tGrassSand25,tGrass]],
 [1,1],
 avoidClasses(clForest, 0, clGrass, 2, clPlayer, 5, clWater, 2, clDirt, 2, clHill, 1)
);

RMS.SetProgress(55);

log("Creating dirt patches...");
createLayeredPatches(
 [scaleByMapSize(3, 6), scaleByMapSize(5, 10), scaleByMapSize(8, 21)],
 [tDirt3, tDirt2,[tDirt,tMainDirt], [tDirtCracks,tMainDirt]],
 [1,1,1],
 avoidClasses(clForest, 0, clDirt, 2, clPlayer, 5, clWater, 2, clGrass, 2, clHill, 1)
);

RMS.SetProgress(60);

log("Creating stone mines...");
createMines(
 [
  [new SimpleObject(oStoneSmall, 0,2, 0,4), new SimpleObject(oStoneLarge, 1,1, 0,4)],
  [new SimpleObject(oStoneSmall, 2,5, 1,3)]
 ],
 avoidClasses(clForest, 1, clPlayer, 15, clRock, 10, clWater, 1, clHill, 1)
);

log("Creating metal mines...");
createMines(
 [
  [new SimpleObject(oMetalLarge, 1,1, 0,4)]
 ],
 avoidClasses(clForest, 1, clPlayer, 15, clMetal, 10, clRock, 5, clWater, 1, clHill, 1),
 clMetal
);

RMS.SetProgress(65);

createDecoration
(
 [[new SimpleObject(aDecorativeRock, 1,3, 0,1)],
  [new SimpleObject(aBush2, 1,2, 0,1), new SimpleObject(aBush1, 1,3, 0,2), new SimpleObject(aBush4, 1,2, 0,1), new SimpleObject(aBush3, 1,3, 0,2)]
 ],
 [
  scaleByMapSize(16, 262),
  scaleByMapSize(40, 360)
 ],
 avoidClasses(clWater, 2, clForest, 0, clPlayer, 5, clBaseResource, 6, clHill, 1)
);

RMS.SetProgress(70);

createFood
(
 [
  [new SimpleObject(oFish, 2,3, 0,2)]
 ],
 [
  3*scaleByMapSize(5,20)
 ],
 [avoidClasses(clFood, 10), stayClasses(clWater, 5)]
);

createFood
(
 [
  [new SimpleObject(oSheep, 5,7, 0,4)],
  [new SimpleObject(oGoat, 2,4, 0,3)],
  [new SimpleObject(oDeer, 2,4, 0,2)]
 ],
 [
  scaleByMapSize(5,20),
  scaleByMapSize(5,20),
  scaleByMapSize(5,20)
 ],
 avoidClasses(clForest, 0, clPlayer, 10, clBaseResource, 6, clWater, 1, clFood, 10, clHill, 1)
);

createFood
(
 [
  [new SimpleObject(oBerryBush, 5,7, 0,4)]
 ],
 [
  3 * numPlayers
 ],
 avoidClasses(clWater, 3, clForest, 0, clPlayer, 15, clHill, 1, clFood, 10)
);

RMS.SetProgress(90);

log("Creating straggler trees...");
createStragglerTrees(
	[oDatePalm, oSDatePalm, oCarob, oFanPalm, oPoplar, oCypress],
	avoidClasses(clForest, 1, clWater, 2, clPlayer, 5, clBaseResource, 6, clMetal, 6, clHill, 1));

setSkySet("sunny");
setSunColor(0.917, 0.828, 0.734);
setWaterColor(0, 0.501961, 1);
setWaterTint(0.501961, 1, 1);
setWaterWaviness(2.5);
setWaterType("ocean");
setWaterMurkiness(0.49);

setFogFactor(0.3);
setFogThickness(0.25);

setPPEffect("hdr");
setPPContrast(0.62);
setPPSaturation(0.51);
setPPBloom(0.12);

ExportMap();
