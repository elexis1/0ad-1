RMS.LoadLibrary("rmgen");

const tCity = "desert_city_tile";
const tCityPlaza = "desert_city_tile_plaza";
const tSand = "desert_dirt_rough";
const tDunes = "desert_sand_dunes_100";
const tFineSand = "desert_sand_smooth";
const tCliff = ["desert_cliff_badlands", "desert_cliff_badlands_2"];
const tForestFloor = "desert_forestfloor_palms";
const tGrass = "desert_grass_a";
const tGrassSand25 = "desert_grass_a_stones";
const tDirt = "desert_dirt_rough";
const tShore = "desert_shore_stones";
const tWaterDeep = "desert_shore_stones_wet";

const oBerryBush = "gaia/flora_bush_grapes";
const oCamel = "gaia/fauna_camel";
const oFish = "gaia/fauna_fish";
const oGazelle = "gaia/fauna_gazelle";
const oGiraffe = "gaia/fauna_giraffe";
const oGoat = "gaia/fauna_goat";
const oWildebeest = "gaia/fauna_wildebeest";
const oStoneLarge = "gaia/geology_stonemine_desert_badlands_quarry";
const oStoneSmall = "gaia/geology_stone_desert_small";
const oMetalLarge = "gaia/geology_metal_desert_slabs";
const oDatePalm = "gaia/flora_tree_date_palm";
const oSDatePalm = "gaia/flora_tree_senegal_date_palm";

const aBush1 = "actor|props/flora/bush_desert_a.xml";
const aBush2 = "actor|props/flora/bush_desert_dry_a.xml";
const aBush3 = "actor|props/flora/bush_dry_a.xml";
const aBush4 = "actor|props/flora/plant_desert_a.xml";
const aBushes = [aBush1, aBush2, aBush3, aBush4];
const aDecorativeRock = "actor|geology/stone_desert_med.xml";

// terrain + entity (for painting)
const pForest = [tForestFloor + TERRAIN_SEPARATOR + oDatePalm, tForestFloor + TERRAIN_SEPARATOR + oSDatePalm, tForestFloor];
const pForestOasis = [tGrass + TERRAIN_SEPARATOR + oDatePalm, tGrass + TERRAIN_SEPARATOR + oSDatePalm, tGrass];

InitMap();

const numPlayers = getNumPlayers();
const mapSize = getMapSize();

var clPlayer = createTileClass();
var clHill1 = createTileClass();
var clForest = createTileClass();
var clPatch = createTileClass();
var clRock = createTileClass();
var clMetal = createTileClass();
var clFood = createTileClass();
var clBaseResource = createTileClass();

var [playerIDs, playerX, playerZ] = radialPlayerPlacement();

for (let i = 0; i < numPlayers; ++i)
	createArea(
		new ClumpPlacer(
			getDefaultPlayerTerritoryArea(),
			0.9,
			0.5,
			10,
			Math.round(fractionToTiles(playerX[i])),
			Math.round(fractionToTiles(playerZ[i]))),
		paintClass(clPlayer),
		null);

placeDefaultPlayerBases({
	"playerPlacement": [playerIDs, playerX, playerZ],
	"playerTileClass": clPlayer,
	"baseResourceClass": clBaseResource,
	"cityPatch": {
		"innerTerrain": tCity,
		"outerTerrain": tCityPlaza,
		"radius": 10 // TODO
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
		"template": oDatePalm,
		"areaFactor": 1/100
	}
	// No decoratives
});
RMS.SetProgress(10);

log("Creating dune patches...");
placer = new ClumpPlacer(scaleByMapSize(40, 150), 0.2, 0.1, 0);
painter = new TerrainPainter(tDunes);
createAreas(placer, [painter, paintClass(clPatch)],
	avoidClasses(clPatch, 2, clPlayer, 0),
	scaleByMapSize(5, 20)
);
RMS.SetProgress(15);

log("Creating sand patches...");
var placer = new ClumpPlacer(scaleByMapSize(25, 100), 0.2, 0.1, 0);
var painter = new TerrainPainter([tSand, tFineSand]);
createAreas(placer, [painter, paintClass(clPatch)],
	avoidClasses(clPatch, 2, clPlayer, 0),
	scaleByMapSize(15, 50)
);
RMS.SetProgress(20);

log("Creating dirt patches...");
placer = new ClumpPlacer(scaleByMapSize(25, 100), 0.2, 0.1, 0);
painter = new TerrainPainter([tDirt]);
createAreas(placer, [painter, paintClass(clPatch)],
	avoidClasses(clPatch, 2, clPlayer, 0),
	scaleByMapSize(15, 50)
);
RMS.SetProgress(25);

log("Creating oasis...");
var oRadius = scaleByMapSize(14, 40);
placer = new ClumpPlacer(PI*oRadius*oRadius, 0.6, 0.15, 0, mapSize/2, mapSize/2);
painter = new LayeredPainter([[tSand, pForest], [tGrassSand25, pForestOasis], tGrassSand25, tShore, tWaterDeep], [2, 3, 1, 1]);
elevationPainter = new SmoothElevationPainter(ELEVATION_MODIFY, -11, 8);
createArea(placer, [painter, elevationPainter, paintClass(clForest)], null);
RMS.SetProgress(30);

log("Creating oasis wildlife...");
var num = round(PI * oRadius / 8);
var constraint = new AndConstraint([borderClasses(clForest, 0, 3), avoidClasses(clForest, 0)]);
var halfSize = mapSize/2;
for (var i = 0; i < num; ++i)
{
	var r = 0;
	var angle = TWO_PI / num * i;
	do {
		// Work outward until constraint met
		var gx = round(halfSize + r * cos(angle));
		var gz = round(halfSize + r * sin(angle));
		++r;
	} while (!constraint.allows(gx,gz) && r < halfSize);

	createObjectGroup(
		new RandomGroup(
			[	new SimpleObject(oGiraffe, 2,4, 0,3),
				new SimpleObject(oWildebeest, 3,5, 0,3),
				new SimpleObject(oGazelle, 5,7, 0,3)
			],
			true,
			clFood,
			gx,
			gz),
		0);
}

constraint = new AndConstraint([borderClasses(clForest, 15, 0), avoidClasses(clFood, 5)]);
num = round(PI * oRadius / 16);
for (var i = 0; i < num; ++i)
{
	var r = 0;
	var angle = TWO_PI / num * i;
	do {
		// Work outward until constraint met
		var gx = round(halfSize + r * cos(angle));
		var gz = round(halfSize + r * sin(angle));
		++r;
	} while (!constraint.allows(gx,gz) && r < halfSize);

	group = new SimpleGroup(
		[new SimpleObject(oFish, 1,1, 0,1)],
		true, clFood, gx, gz
	);
	createObjectGroup(group, 0);
}
RMS.SetProgress(35);

log("Creating level 1 hills...");
placer = new ClumpPlacer(scaleByMapSize(50,300), 0.25, 0.1, 0.5);
var terrainPainter = new LayeredPainter(
	[tCliff, tSand],		// terrains
	[1]				// widths
);
var elevationPainter = new SmoothElevationPainter(ELEVATION_MODIFY, 16, 1);
var hillAreas = createAreas(placer, [terrainPainter, elevationPainter, paintClass(clHill1)],
	avoidClasses(clForest, 3, clPlayer, 0, clHill1, 10),
	scaleByMapSize(10,20), 100
);
RMS.SetProgress(40);

log("Creating small level 1 hills...");
placer = new ClumpPlacer(scaleByMapSize(25,150), 0.25, 0.1, 0.5);
terrainPainter = new LayeredPainter(
	[tCliff, tSand],		// terrains
	[1]				// widths
);
elevationPainter = new SmoothElevationPainter(ELEVATION_MODIFY, 16, 1);
var tempAreas = createAreas(placer, [terrainPainter, elevationPainter, paintClass(clHill1)],
	avoidClasses(clForest, 3, clPlayer, 0, clHill1, 3),
	scaleByMapSize(15,25), 100
);
for (var i = 0; i < tempAreas.length; ++i)
	hillAreas.push(tempAreas[i]);
RMS.SetProgress(45);

log("Creating decorative rocks...");
createObjectGroupsByAreasDeprecated(
	new SimpleGroup(
		[new RandomObject([aDecorativeRock, aBush2, aBush3], 3,8, 0,2)],
		true),
	0,
	borderClasses(clHill1, 0, 3),
	scaleByMapSize(40,200), 50,
	hillAreas);

RMS.SetProgress(50);

log("Creating level 2 hills...");
placer = new ClumpPlacer(scaleByMapSize(25,150), 0.25, 0.1, 0);
terrainPainter = new LayeredPainter(
	[tCliff, tSand],		// terrains
	[1]				// widths
);
elevationPainter = new SmoothElevationPainter(ELEVATION_MODIFY, 16, 1);
createAreasInAreas(placer, [terrainPainter, elevationPainter],
	[stayClasses(clHill1, 0)],
	scaleByMapSize(15,25), 50,
	hillAreas
);
RMS.SetProgress(55);

log("Creating level 3 hills...");
placer = new ClumpPlacer(scaleByMapSize(12, 75), 0.25, 0.1, 0);
terrainPainter = new LayeredPainter(
	[tCliff, tSand],		// terrains
	[1]				// widths
);
elevationPainter = new SmoothElevationPainter(ELEVATION_MODIFY, 16, 1);
createAreas(placer, [terrainPainter, elevationPainter],
	[stayClasses(clHill1, 0)],
	scaleByMapSize(15,25), 50
);
RMS.SetProgress(60);

log("Creating bumps...");
placer = new ClumpPlacer(scaleByMapSize(20, 50), 0.3, 0.06, 0);
elevationPainter = new SmoothElevationPainter(ELEVATION_MODIFY, 2, 2);
createAreas(
	placer,
	elevationPainter,
	avoidClasses(clForest, 0, clPlayer, 0, clHill1, 2),
	scaleByMapSize(100, 200)
);

RMS.SetProgress(65);

// calculate desired number of trees for map (based on size)
const MIN_TREES = 500;
const MAX_TREES = 2500;
const P_FOREST = 0.5;

var totalTrees = scaleByMapSize(MIN_TREES, MAX_TREES);
var numForest = totalTrees * P_FOREST;
var numStragglers = totalTrees * (1.0 - P_FOREST);

log("Creating forests...");
var num = scaleByMapSize(10,30);
placer = new ClumpPlacer(numForest / num, 0.15, 0.1, 0.5);
painter = new TerrainPainter([tSand, pForest]);
createAreas(placer, [painter, paintClass(clForest)],
	avoidClasses(clPlayer, 1, clForest, 10, clHill1, 1),
	num, 50
);

RMS.SetProgress(70);

log("Creating stone mines...");
var group = new SimpleGroup([new SimpleObject(oStoneSmall, 0,2, 0,4), new SimpleObject(oStoneLarge, 1,1, 0,4), new RandomObject(aBushes, 2,4, 0,2)], true, clRock);
createObjectGroupsDeprecated(group, 0,
	[avoidClasses(clForest, 1, clPlayer, 10, clRock, 10, clHill1, 1)],
	scaleByMapSize(4,16), 100
);

group = new SimpleGroup([new SimpleObject(oStoneSmall, 2,5, 1,3), new RandomObject(aBushes, 2,4, 0,2)], true, clRock);
createObjectGroupsDeprecated(group, 0,
	[avoidClasses(clForest, 1, clPlayer, 10, clRock, 10, clHill1, 1)],
	scaleByMapSize(4,16), 100
);

log("Creating metal mines...");
group = new SimpleGroup([new SimpleObject(oMetalLarge, 1,1, 0,4), new RandomObject(aBushes, 2,4, 0,2)], true, clMetal);
createObjectGroupsDeprecated(group, 0,
	[avoidClasses(clForest, 1, clPlayer, 10, clMetal, 10, clRock, 5, clHill1, 1)],
	scaleByMapSize(4,16), 100
);

RMS.SetProgress(80);

log("Creating gazelles...");
group = new SimpleGroup([new SimpleObject(oGazelle, 5,7, 0,4)], true, clFood);
createObjectGroupsDeprecated(group, 0,
	avoidClasses(clForest, 0, clPlayer, 5, clHill1, 1, clFood, 10),
	scaleByMapSize(5,20), 50
);

log("Creating goats...");
group = new SimpleGroup([new SimpleObject(oGoat, 2,4, 0,3)], true, clFood);
createObjectGroupsDeprecated(group, 0,
	avoidClasses(clForest, 0, clPlayer, 5, clHill1, 1, clFood, 10),
	scaleByMapSize(5,20), 50
);

log("Creating camels...");
group = new SimpleGroup([new SimpleObject(oCamel, 2,4, 0,2)], true, clFood);
createObjectGroupsDeprecated(group, 0,
	avoidClasses(clForest, 0, clPlayer, 5, clHill1, 1, clFood, 10),
	scaleByMapSize(5,20), 50
);
RMS.SetProgress(85);

log("Creating straggler trees...");
var types = [oDatePalm, oSDatePalm];	// some variation
var num = floor(numStragglers / types.length);
for (var i = 0; i < types.length; ++i)
{
	group = new SimpleGroup([new SimpleObject(types[i], 1,1, 0,0)], true);
	createObjectGroupsDeprecated(group, 0,
		avoidClasses(clForest, 0, clHill1, 1, clPlayer, 4, clMetal, 6, clRock, 6),
		num
	);
}
RMS.SetProgress(90);

log("Creating bushes...");
group = new SimpleGroup([new RandomObject(aBushes, 2,3, 0,2)]);
createObjectGroupsDeprecated(group, 0,
	avoidClasses(clHill1, 1, clPlayer, 0, clForest, 0),
	scaleByMapSize(16, 262)
);

log("Creating more decorative rocks...");
group = new SimpleGroup([new SimpleObject(aDecorativeRock, 1,2, 0,2)]);
createObjectGroupsDeprecated(group, 0,
	avoidClasses(clHill1, 1, clPlayer, 0, clForest, 0),
	scaleByMapSize(16, 262)
);

setWaterColor(0, 0.227, 0.843);
setWaterTint(0, 0.545, 0.859);
setWaterWaviness(1.0);
setWaterType("clap");
setWaterMurkiness(0.75);
setWaterHeight(20);

ExportMap();
