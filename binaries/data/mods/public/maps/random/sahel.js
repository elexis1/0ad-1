RMS.LoadLibrary("rmgen");

const tGrass1 = "savanna_grass_a";
const tGrass2 = "savanna_grass_b";
const tGrass3 = "savanna_shrubs_a";
const tDirt1 = "savanna_dirt_rocks_a";
const tDirt2 = "savanna_dirt_rocks_b";
const tDirt3 = "savanna_dirt_rocks_c";
const tDirt4 = "savanna_dirt_b";
const tCityTiles = "savanna_tile_a";
const tShore = "savanna_riparian_bank";
const tWater = "savanna_riparian_wet";

const oBaobab = "gaia/flora_tree_baobab";
const oBerryBush = "gaia/flora_bush_berry";
const oGazelle = "gaia/fauna_gazelle";
const oGiraffe = "gaia/fauna_giraffe";
const oGiraffeInfant = "gaia/fauna_giraffe_infant";
const oElephant = "gaia/fauna_elephant_african_bush";
const oElephantInfant = "gaia/fauna_elephant_african_infant";
const oLion = "gaia/fauna_lion";
const oLioness = "gaia/fauna_lioness";
const oZebra = "gaia/fauna_zebra";
const oStoneSmall = "gaia/geology_stone_savanna_small";
const oMetalLarge = "gaia/geology_metal_savanna_slabs";

const aBush = "actor|props/flora/bush_medit_sm_dry.xml";
const aRock = "actor|geology/stone_savanna_med.xml";

InitMap();

var numPlayers = getNumPlayers();
var mapSize = getMapSize();
var mapArea = mapSize*mapSize;

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

placeDefaultPlayerBases({
	"playerPlacement": radialPlayerPlacement(),
	"playerTileClass": clPlayer,
	"baseResourceClass": clBaseResource,
	"cityPatch": {
		"innerTerrain": tCityTiles,
		"outerTerrain": tCityTiles
	},
	"chicken": {
	},
	"berries": {
		"template": oBerryBush
	},
	"metal": {
		"template": oMetalLarge
	},
	"stone_formation": {
		"terrain": tDirt4
	},
	"trees": {
		"template": oBaobab,
		"radiusFactor": 1/15,
	}
	// No decoratives
});
RMS.SetProgress(20);

log("Creating big patches...");
var patches = [tGrass2, tGrass3];
for (var i = 0; i < patches.length; i++)
	createAreas(
		new ChainPlacer(Math.floor(scaleByMapSize(3, 6)), Math.floor(scaleByMapSize(10, 20)), Math.floor(scaleByMapSize(15, 60)), 1),
		new TerrainPainter(patches[i]),
		avoidClasses(clPlayer, 10),
		scaleByMapSize(5, 20));

log("Creating small patches...");
for (let size of [scaleByMapSize(3, 6), scaleByMapSize(5, 10), scaleByMapSize(8, 21)])
	for (let patch of [tDirt1, tDirt2, tDirt3])
		createAreas(
			new ChainPlacer(1, Math.floor(scaleByMapSize(3, 5)), size, 1),
			new TerrainPainter(patch),
			avoidClasses(clPlayer, 12),
			scaleByMapSize(4, 15));

log("Creating water holes...");
createAreas(
	new ChainPlacer(1, Math.floor(scaleByMapSize(3, 5)), Math.floor(scaleByMapSize(20, 60)), 1),
	[
		new LayeredPainter([tShore, tWater], [1]),
		new SmoothElevationPainter(ELEVATION_SET, -5, 7),
		paintClass(clWater)
	],
	avoidClasses(clPlayer, 24),
	scaleByMapSize(1, 3));
RMS.SetProgress(55);

var playerConstraint = new AvoidTileClassConstraint(clPlayer, 30);
var minesConstraint = new AvoidTileClassConstraint(clRock, 25);
var waterConstraint = new AvoidTileClassConstraint(clWater, 10);

log("Creating stone mines...");
for (var i = 0; i < scaleByMapSize(12,30); ++i)
{
	var mX = randIntExclusive(0, mapSize);
	var mZ = randIntExclusive(0, mapSize);
	if (playerConstraint.allows(mX, mZ) && minesConstraint.allows(mX, mZ) && waterConstraint.allows(mX, mZ))
	{
		createStoneMineFormation(mX, mZ, tDirt4);
		addToClass(mX, mZ, clRock);
	}
}

log("Creating metal mines...");
var group = new SimpleGroup([new SimpleObject(oMetalLarge, 1, 1, 0, 4)], true, clMetal);
createObjectGroupsDeprecated(group, 0,
	avoidClasses(clPlayer, 20, clMetal, 10, clRock, 8, clWater, 4),
	scaleByMapSize(2,8), 100
);

RMS.SetProgress(65);

log("Creating small decorative rocks...");
group = new SimpleGroup(
	[new SimpleObject(aRock, 1,3, 0,3)],
	true
);
createObjectGroupsDeprecated(
	group, 0,
	avoidClasses(clPlayer, 7, clWater, 1),
	scaleByMapSize(200, 1200), 1
);

RMS.SetProgress(70);

log("Creating gazelle...");
group = new SimpleGroup(
	[new SimpleObject(oGazelle, 5,7, 0,4)],
	true, clFood
);
createObjectGroupsDeprecated(group, 0,
	avoidClasses(clWater, 1, clPlayer, 20, clFood, 11),
	scaleByMapSize(4,12), 50
);

log("Creating zebra...");
group = new SimpleGroup(
	[new SimpleObject(oZebra, 5,7, 0,4)],
	true, clFood
);
createObjectGroupsDeprecated(group, 0,
	avoidClasses(clWater, 1, clPlayer, 20, clFood, 11),
	scaleByMapSize(4,12), 50
);

log("Creating giraffe...");
group = new SimpleGroup(
	[new SimpleObject(oGiraffe, 2,4, 0,4), new SimpleObject(oGiraffeInfant, 0,2, 0,4)],
	true, clFood
);
createObjectGroupsDeprecated(group, 0,
	avoidClasses(clWater, 1, clPlayer, 20, clFood, 11),
	scaleByMapSize(4,12), 50
);

log("Creating elephants...");
group = new SimpleGroup(
	[new SimpleObject(oElephant, 2,4, 0,4), new SimpleObject(oElephantInfant, 0,2, 0,4)],
	true, clFood
);
createObjectGroupsDeprecated(group, 0,
	avoidClasses(clWater, 1, clPlayer, 20, clFood, 11),
	scaleByMapSize(4,12), 50
);

log("Creating lions...");
group = new SimpleGroup(
	[new SimpleObject(oLion, 0,1, 0,4), new SimpleObject(oLioness, 2,3, 0,4)],
	true, clFood
);
createObjectGroupsDeprecated(group, 0,
	avoidClasses(clWater, 1, clPlayer, 20, clFood, 11),
	scaleByMapSize(4,12), 50
);

log("Creating berry bush...");
group = new SimpleGroup(
	[new SimpleObject(oBerryBush, 5,7, 0,4)],
	true, clFood
);
createObjectGroupsDeprecated(group, 0,
	avoidClasses(clWater, 3, clPlayer, 20, clFood, 12, clRock, 7, clMetal, 6),
	randIntInclusive(1, 4) * numPlayers + 2, 50
);

RMS.SetProgress(85);

log("Creating straggler trees...");
var num = scaleByMapSize(70, 500);
group = new SimpleGroup(
	[new SimpleObject(oBaobab, 1,1, 0,3)],
	true, clForest
);
createObjectGroupsDeprecated(group, 0,
	avoidClasses(clForest, 1, clPlayer, 20, clMetal, 6, clRock, 7, clWater, 1),
	num
);

log("Creating large grass tufts...");
group = new SimpleGroup(
	[new SimpleObject(aBush, 2,4, 0,1.8, -PI/8,PI/8)]
);
createObjectGroupsDeprecated(group, 0,
	avoidClasses(clWater, 3, clPlayer, 2, clForest, 0),
	scaleByMapSize(100, 1200)
);

setSunColor(0.87451, 0.847059, 0.647059);
setWaterColor(0.741176, 0.592157, 0.27451);
setWaterTint(0.741176, 0.592157, 0.27451);
setWaterWaviness(2.0);
setWaterType("clap");
setWaterMurkiness(0.835938);

setUnitsAmbientColor(0.57, 0.58, 0.55);
setTerrainAmbientColor(0.447059, 0.509804, 0.54902);

setFogFactor(0.25);
setFogThickness(0.15);
setFogColor(0.847059, 0.737255, 0.482353);

setPPEffect("hdr");
setPPContrast(0.57031);
setPPBloom(0.34);

ExportMap();
