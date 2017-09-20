RMS.LoadLibrary("rmgen");

const tCity = "desert_city_tile_pers_dirt";

if (randBool()) // summer
{
	var tDirtMain = ["desert_dirt_persia_1", "desert_dirt_persia_2", "grass_field_dry"];
	var tLakebed1 = ["desert_lakebed_dry_b", "desert_lakebed_dry"];
	var tLakebed2 = ["desert_lakebed_dry_b", "desert_lakebed_dry", "desert_shore_stones", "desert_shore_stones"];
	var tPebbles = "desert_pebbles_rough";
	var tCliff = ["desert_cliff_persia_1", "desert_cliff_persia_crumbling"];
	var tForestFloor = "medit_grass_field_dry";
	var tRocky = "desert_dirt_persia_rocky";
	var tRocks = "desert_dirt_persia_rocks";
	var tGrass = "grass_field_dry";
	var tHill = "desert_cliff_persia_base";
}
else //spring
{
	var tDirtMain = ["desert_grass_a", "desert_grass_a", "desert_grass_a", "desert_plants_a"];
	var tLakebed1 = ["desert_lakebed_dry_b", "desert_lakebed_dry"];
	var tLakebed2 = "desert_grass_a_sand";
	var tPebbles = "desert_pebbles_rough";
	var tCliff = ["desert_cliff_persia_1", "desert_cliff_persia_crumbling"];
	var tForestFloor = "desert_plants_b_persia";
	var tRocky = "desert_plants_b_persia";
	var tRocks = "desert_plants_a";
	var tGrass = "desert_dirt_persia_rocky";
	var tHill = "desert_cliff_persia_base";

	setTerrainAmbientColor(0.329412, 0.419608, 0.501961);
}

const oGrapesBush = "gaia/flora_bush_grapes";
const oCamel = "gaia/fauna_camel";
const oFish = "gaia/fauna_fish";
const oSheep = "gaia/fauna_sheep";
const oGoat = "gaia/fauna_goat";
const oLion = "gaia/fauna_lioness";
const oStoneLarge = "gaia/geology_stonemine_desert_badlands_quarry";
const oStoneSmall = "gaia/geology_stone_desert_small";
const oMetalLarge = "gaia/geology_metal_desert_slabs";
const oTamarix = "gaia/flora_tree_tamarix";
const oOak = "gaia/flora_tree_oak";

const aBush1 = "actor|props/flora/bush_desert_a.xml";
const aBush2 = "actor|props/flora/bush_desert_dry_a.xml";
const aBush3 = "actor|props/flora/bush_dry_a.xml";
const aBush4 = "actor|props/flora/plant_desert_a.xml";
const aBushes = [aBush1, aBush2, aBush3, aBush4];
const aDecorativeRock = "actor|geology/stone_desert_med.xml";

// terrain + entity (for painting)
const pForestO = [tForestFloor + TERRAIN_SEPARATOR + oOak, tForestFloor + TERRAIN_SEPARATOR + oOak, tForestFloor, tDirtMain, tDirtMain];

InitMap();

const numPlayers = getNumPlayers();
const mapSize = getMapSize();
const mapArea = mapSize*mapSize;

var clPlayer = createTileClass();
var clHill = createTileClass();
var clForest = createTileClass();
var clPatch = createTileClass();
var clRock = createTileClass();
var clMetal = createTileClass();
var clFood = createTileClass();
var clBaseResource = createTileClass();
var clCP = createTileClass();

initTerrain(tDirtMain);

placeDefaultPlayerBases({
	"playerPlacement": radialPlayerPlacement(),
	"baseResourceClass": clBaseResource,
	"cityPatch": {
		"innerTerrain": tCity,
		"outerTerrain": tCity,
		"tileClass": clPlayer
	},
	"chicken": {
	},
	"berries": {
		"template": oGrapesBush,
	},
	"metal": {
		"template": oMetalLarge,
		"template_surroundings": aBushes // TODO
	},
	"stone": {
		"template": oStoneLarge,
		"template_surroundings": aBushes
	},
	"trees": {
		"template": oOak,
		"areaFactor": 1/300, // TODO: 3
	}
	// No decoratives
});
RMS.SetProgress(10);

log("Creating rock patches...");
createAreas(
	new ChainPlacer(1, Math.floor(scaleByMapSize(3, 6)), Math.floor(scaleByMapSize(20, 45)), 0),
	[
		new TerrainPainter(tRocky),
		paintClass(clPatch)
	],
	avoidClasses(clPatch, 2, clPlayer, 0),
	scaleByMapSize(5, 20));
RMS.SetProgress(15);

log("Creating secondary rock patches...");
createAreas(
	new ChainPlacer(1, Math.floor(scaleByMapSize(3, 5)), Math.floor(scaleByMapSize(15, 40)), 0),
	[
		new TerrainPainter([tRocky, tRocks]),
		paintClass(clPatch)
	],
	avoidClasses(clPatch, 2, clPlayer, 4),
	scaleByMapSize(15, 50));
RMS.SetProgress(20);

log("Creating dirt patches...");
createAreas(
	new ChainPlacer(
		1,
		Math.floor(scaleByMapSize(3, 5)),
		Math.floor(scaleByMapSize(15, 40)),
		0),
	[
		new TerrainPainter([tGrass]),
		paintClass(clPatch)
	],
	avoidClasses(clPatch, 2, clPlayer, 4),
	scaleByMapSize(15, 50));
RMS.SetProgress(25);

log("Creating centeral plateau...");
createArea(
	new ChainPlacer(
		2,
		Math.floor(scaleByMapSize(5, 13)),
		Math.floor(scaleByMapSize(35, 200)),
		1,
		mapSize / 2,
		mapSize / 2,
		0,
		[Math.floor(scaleByMapSize(18, 68))]),
	[
		new LayeredPainter([tLakebed2, tLakebed1], [6]),
		new SmoothElevationPainter(ELEVATION_MODIFY, -10, 8),
		paintClass(clCP)
	],
	avoidClasses(clPlayer, 18));
RMS.SetProgress(30);

log("Creating hills...");
for (let i = 0; i < scaleByMapSize(20, 80); ++i)
	createMountain(
		floor(scaleByMapSize(40, 60)),
		floor(scaleByMapSize(3, 4)),
		floor(scaleByMapSize(6, 12)),
		floor(scaleByMapSize(4, 10)),
		avoidClasses(clPlayer, 7, clCP, 5, clHill, floor(scaleByMapSize(18, 25))),
		randIntExclusive(0, mapSize),
		randIntExclusive(0, mapSize),
		tCliff,
		clHill,
		14);
RMS.SetProgress(35);

// calculate desired number of trees for map (based on size)
const MIN_TREES = 500;
const MAX_TREES = 2500;
const P_FOREST = 0.7;

var totalTrees = scaleByMapSize(MIN_TREES, MAX_TREES);
var numForest = totalTrees * P_FOREST;
var numStragglers = totalTrees * (1.0 - P_FOREST);

log("Creating forests...");
var types = [
	[[tDirtMain, tForestFloor, pForestO], [tForestFloor, pForestO]],
	[[tDirtMain, tForestFloor, pForestO], [tForestFloor, pForestO]]
];
var size = numForest / (scaleByMapSize(3,6) * numPlayers);
var num = floor(size / types.length);
for (let type of types)
	createAreas(
		new ChainPlacer(
			Math.floor(scaleByMapSize(1, 2)),
			Math.floor(scaleByMapSize(2, 5)),
			Math.floor(size / Math.floor(scaleByMapSize(8, 3))),
			1),
		[
			new LayeredPainter(type, [2]),
			paintClass(clForest)
		],
		avoidClasses(
			clPlayer, 6,
			clForest, 10,
			clHill, 1,
			clCP, 1),
		num);
RMS.SetProgress(50);

log("Creating stone mines...");
var group = new SimpleGroup([new SimpleObject(oStoneSmall, 0,2, 0,4), new SimpleObject(oStoneLarge, 1,1, 0,4), new RandomObject(aBushes, 2,4, 0,2)], true, clRock);
createObjectGroupsDeprecated(group, 0,
	[avoidClasses(clForest, 1, clPlayer, 10, clRock, 10, clHill, 1, clCP, 1)],
	scaleByMapSize(2,8), 100
);

log("Creating small stone quarries...");
group = new SimpleGroup([new SimpleObject(oStoneSmall, 2,5, 1,3), new RandomObject(aBushes, 2,4, 0,2)], true, clRock);
createObjectGroupsDeprecated(group, 0,
	[avoidClasses(clForest, 1, clPlayer, 10, clRock, 10, clHill, 1, clCP, 1)],
	scaleByMapSize(2,8), 100
);

log("Creating metal mines...");
group = new SimpleGroup([new SimpleObject(oMetalLarge, 1,1, 0,4), new RandomObject(aBushes, 2,4, 0,2)], true, clMetal);
createObjectGroupsDeprecated(group, 0,
	[avoidClasses(clForest, 1, clPlayer, 10, clMetal, 10, clRock, 5, clHill, 1, clCP, 1)],
	scaleByMapSize(2,8), 100
);

log("Creating centeral stone mines...");
group = new SimpleGroup([new SimpleObject(oStoneSmall, 0,2, 0,4), new SimpleObject(oStoneLarge, 1,1, 0,4), new RandomObject(aBushes, 2,4, 0,2)], true, clRock);
createObjectGroupsDeprecated(group, 0,
	stayClasses(clCP, 6),
	5*scaleByMapSize(5,30), 50
);

log("Creating small stone quarries...");
group = new SimpleGroup([new SimpleObject(oStoneSmall, 2,5, 1,3), new RandomObject(aBushes, 2,4, 0,2)], true, clRock);
createObjectGroupsDeprecated(group, 0,
	stayClasses(clCP, 6),
	5*scaleByMapSize(5,30), 50
);

log("Creating centeral metal mines...");
group = new SimpleGroup([new SimpleObject(oMetalLarge, 1,1, 0,4), new RandomObject(aBushes, 2,4, 0,2)], true, clMetal);
createObjectGroupsDeprecated(group, 0,
	stayClasses(clCP, 6),
	5*scaleByMapSize(5,30), 50
);

RMS.SetProgress(60);

log("Creating small decorative rocks...");
group = new SimpleGroup(
	[new SimpleObject(aDecorativeRock, 1,3, 0,1)],
	true
);
createObjectGroupsDeprecated(
	group, 0,
	avoidClasses(clForest, 0, clPlayer, 0, clHill, 0),
	scaleByMapSize(16, 262), 50
);

RMS.SetProgress(65);

log("Creating bushes...");
group = new SimpleGroup(
	[new SimpleObject(aBush2, 1,2, 0,1), new SimpleObject(aBush1, 1,3, 0,2)],
	true
);
createObjectGroupsDeprecated(
	group, 0,
	avoidClasses(clForest, 0, clPlayer, 0, clHill, 0),
	scaleByMapSize(8, 131), 50
);

RMS.SetProgress(70);

log("Creating goat...");
group = new SimpleGroup(
	[new SimpleObject(oGoat, 5,7, 0,4)],
	true, clFood
);
createObjectGroupsDeprecated(group, 0,
	avoidClasses(clForest, 0, clPlayer, 1, clHill, 1, clFood, 20, clCP, 2),
	3 * numPlayers, 50
);

log("Creating sheep...");
group = new SimpleGroup(
	[new SimpleObject(oSheep, 2,3, 0,2)],
	true, clFood
);
createObjectGroupsDeprecated(group, 0,
	avoidClasses(clForest, 0, clPlayer, 1, clHill, 1, clFood, 20, clCP, 2),
	3 * numPlayers, 50
);

log("Creating grape bush...");
group = new SimpleGroup(
	[new SimpleObject(oGrapesBush, 5,7, 0,4)],
	true, clFood
);
createObjectGroupsDeprecated(group, 0,
	avoidClasses(clForest, 0, clPlayer, 20, clHill, 1, clFood, 10, clCP, 2),
	randIntInclusive(1, 4) * numPlayers + 2, 50
);

log("Creating camels...");
group = new SimpleGroup(
	[new SimpleObject(oCamel, 2,3, 0,2)],
	true, clFood
);
createObjectGroupsDeprecated(group, 0,
	stayClasses(clCP, 2),
	3 * numPlayers, 50
);

RMS.SetProgress(90);

log("Creating straggler trees...");
var types = [oOak];
var num = floor(numStragglers / types.length);
for (let type of types)
	createObjectGroupsDeprecated(
		new SimpleGroup(
			[new SimpleObject(type, 1, 1, 0, 3)],
			true,
			clForest),
		0,
		avoidClasses(
			clForest, 1,
			clHill, 1,
			clPlayer, 1,
			clBaseResource, 6,
			clMetal, 6,
			clRock, 6,
			clCP, 2),
		num);

setSunColor(1.0, 0.796, 0.374);
setSunElevation(PI / 6);
setSunRotation(-1.86532);

setFogFactor(0.2);
setFogThickness(0.0);
setFogColor(0.852, 0.746, 0.493);

setPPEffect("hdr");
setPPContrast(0.75);
setPPSaturation(0.45);
setPPBloom(0.3);

ExportMap();
