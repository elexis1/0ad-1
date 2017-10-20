RMS.LoadLibrary("rmgen");
RMS.LoadLibrary("common");

const tGrass = ["temp_grass", "temp_grass", "temp_grass_d"];
const tGrassDForest = "temp_plants_bog";
const tGrassA = "temp_grass_plants";
const tGrassB = "temp_plants_bog";
const tGrassC = "temp_mud_a";
const tHill = ["temp_highlands", "temp_grass_long_b"];
const tCliff = ["temp_cliff_a", "temp_cliff_b"];
const tRoad = "temp_road";
const tRoadWild = "temp_road_overgrown";
const tGrassPatchBlend = "temp_grass_long_b";
const tGrassPatch = ["temp_grass_d", "temp_grass_clovers"];
const tShore = "temp_dirt_gravel";
const tWater = "temp_dirt_gravel_b";

const oBeech = "gaia/flora_tree_euro_beech";
const oPoplar = "gaia/flora_tree_poplar";
const oApple = "gaia/flora_tree_apple";
const oOak = "gaia/flora_tree_oak";
const oBerryBush = "gaia/flora_bush_berry";
const oDeer = "gaia/fauna_deer";
const oFish = "gaia/fauna_fish";
const oGoat = "gaia/fauna_goat";
const oBoar = "gaia/fauna_boar";
const oStoneLarge = "gaia/geology_stonemine_temperate_quarry";
const oStoneSmall = "gaia/geology_stone_temperate";
const oMetalLarge = "gaia/geology_metal_temperate_slabs";

const aGrass = "actor|props/flora/grass_soft_large_tall.xml";
const aGrassShort = "actor|props/flora/grass_soft_large.xml";
const aRockLarge = "actor|geology/stone_granite_large.xml";
const aRockMedium = "actor|geology/stone_granite_med.xml";
const aBushMedium = "actor|props/flora/bush_medit_me_lush.xml";
const aBushSmall = "actor|props/flora/bush_medit_sm_lush.xml";
const aReeds = "actor|props/flora/reeds_pond_lush_a.xml";
const aLillies = "actor|props/flora/water_lillies.xml";

const pForestD = [tGrassDForest + TERRAIN_SEPARATOR + oBeech, tGrassDForest];

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
	"playerPlacement": placePlayersRiver(true, 0.6, 0),
	"playerTileClass": clPlayer,
	"baseResourceClass": clBaseResource,
	"cityPatch": {
		"innerTerrain": tRoadWild,
		"outerTerrain": tRoad
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
		"radiusFactor": 1/30
	},
	"decoratives": {
		"template": aGrassShort
	}
});
RMS.SetProgress(10);

paintRiver({
	"horizontal": true,
	"parallel": false,
	"position": 0.5,
	"width": 0.25,
	"fadeDist": 0.01,
	"deviation": 0,
	"waterHeight": waterHeight,
	"landHeight": 3,
	"meanderShort": 20,
	"meanderLong": 0,
	"waterFunc": (ix, iz, height) => {
		placeTerrain(ix, iz, height < -1.5 ? tWater : tShore);
	},
	"landFunc": (ix, iz, shoreDist1, shoreDist2) => {
		setHeight(ix, iz, 3.1);
	}
});
RMS.SetProgress(20);

createTributaries(
	true,
	randIntInclusive(9, scaleByMapSize(13, 21)),
	scaleByMapSize(10, 20),
	waterHeight,
	[-6, -1.5],
	0.2 * Math.PI,
	clWater,
	clShallow,
	avoidClasses(clPlayer, 8, clBaseResource, 4));

paintTerrainBasedOnHeight(-5, 1, 1, tWater);
paintTerrainBasedOnHeight(1, 3, 1, tShore);
paintTileClassBasedOnHeight(-6, 0.5, 1, clWater);
RMS.SetProgress(25);

createBumps(avoidClasses(clWater, 5, clPlayer, 20));
RMS.SetProgress(30);

createHills([tCliff, tCliff, tHill], avoidClasses(clPlayer, 20, clHill, 15, clWater, 5), clHill, scaleByMapSize(1, 4) * numPlayers);
RMS.SetProgress(50);

createForests(
 [tGrass, tGrassDForest, tGrassDForest, pForestD, pForestD],
 avoidClasses(clPlayer, 20, clForest, 17, clHill, 0, clWater, 6),
 clForest,
 1.0
);
RMS.SetProgress(70);

log("Creating dirt patches...");
createLayeredPatches(
 [scaleByMapSize(3, 6), scaleByMapSize(5, 10), scaleByMapSize(8, 21)],
 [[tGrass,tGrassA], tGrassB, [tGrassB,tGrassC]],
 [1,1],
 avoidClasses(clWater, 1, clForest, 0, clHill, 0, clDirt, 5, clPlayer, 6)
);

log("Creating grass patches...");
createPatches(
 [scaleByMapSize(2, 4), scaleByMapSize(3, 7), scaleByMapSize(5, 15)],
 [tGrassPatchBlend, tGrassPatch],
 [1],
 avoidClasses(clWater, 1, clForest, 0, clHill, 0, clDirt, 5, clPlayer, 6)
);
RMS.SetProgress(80);

log("Creating stone mines...");
createMines(
 [
  [new SimpleObject(oStoneSmall, 0,2, 0,4), new SimpleObject(oStoneLarge, 1,1, 0,4)],
  [new SimpleObject(oStoneSmall, 2,5, 1,3)]
 ],
 avoidClasses(clWater, 2, clForest, 1, clPlayer, 20, clRock, 10, clHill, 2),
 clRock);

log("Creating metal mines...");
createMines(
 [
  [new SimpleObject(oMetalLarge, 1,1, 0,4)]
 ],
 avoidClasses(clWater, 2, clForest, 1, clPlayer, 20, clMetal, 10, clRock, 5, clHill, 2),
 clMetal
);
RMS.SetProgress(85);

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
  scaleByMapSize(13, 200),
  scaleByMapSize(13, 200),
  scaleByMapSize(13, 200)
 ],
 avoidClasses(clWater, 1, clForest, 0, clPlayer, 0, clHill, 0)
);

// create water decoration in the shallow parts
createDecoration
(
 [[new SimpleObject(aReeds, 1,3, 0,1)],
  [new SimpleObject(aLillies, 1,2, 0,1)]
 ],
 [
  scaleByMapSize(800, 12800),
  scaleByMapSize(800, 12800)
 ],
 stayClasses(clShallow, 0)
);

createFood
(
 [
  [new SimpleObject(oDeer, 5,7, 0,4)],
  [new SimpleObject(oGoat, 2,3, 0,2)],
  [new SimpleObject(oBoar, 2,3, 0,2)]
 ],
 [
  3 * numPlayers,
  3 * numPlayers,
  3 * numPlayers
 ],
 avoidClasses(clWater, 1, clForest, 0, clPlayer, 20, clHill, 0, clFood, 15)
);

createFood
(
 [
  [new SimpleObject(oBerryBush, 5,7, 0,4)]
 ],
 [
  randIntInclusive(1, 4) * numPlayers + 2
 ],
 avoidClasses(clWater, 3, clForest, 0, clPlayer, 20, clHill, 1, clFood, 10)
);

createFood
(
 [
  [new SimpleObject(oFish, 2,3, 0,2)]
 ],
 [scaleByMapSize(3, 25) * numPlayers],
 [avoidClasses(clFood, 6), stayClasses(clWater, 4)]
);

log("Creating straggler trees...");
createStragglerTrees(
	[oBeech, oPoplar, oApple],
	avoidClasses(clWater, 1, clForest, 1, clHill, 1, clPlayer, 8, clMetal, 6, clRock, 6),
	clForest);

setSkySet("cirrus");
setWaterColor(0.114, 0.192, 0.463);
setWaterTint(0.255, 0.361, 0.651);
setWaterWaviness(3.0);
setWaterType("ocean");
setWaterMurkiness(0.83);

setFogThickness(0.35);
setFogFactor(0.55);

setPPEffect("hdr");
setPPSaturation(0.62);
setPPContrast(0.62);
setPPBloom(0.37);

ExportMap();
