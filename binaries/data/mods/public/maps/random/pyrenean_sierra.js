RMS.LoadLibrary("rmgen");
RMS.LoadLibrary("common");
TILE_CENTERED_HEIGHT_MAP = true;

const tGrassSpecific = ["new_alpine_grass_d","new_alpine_grass_d", "new_alpine_grass_e"];
const tGrass = ["new_alpine_grass_d", "new_alpine_grass_b", "new_alpine_grass_e"];
const tGrassMidRange = ["new_alpine_grass_b", "alpine_grass_a"];
const tGrassHighRange = ["new_alpine_grass_a", "alpine_grass_a", "alpine_grass_rocky"];
const tHighRocks = ["alpine_cliff_b", "alpine_cliff_c","alpine_cliff_c", "alpine_grass_rocky"];
const tSnowedRocks = ["alpine_cliff_b", "alpine_cliff_snow"];
const tTopSnow = ["alpine_snow_rocky","alpine_snow_a"];
const tTopSnowOnly = ["alpine_snow_a"];

const tDirtyGrass = ["new_alpine_grass_d","alpine_grass_d","alpine_grass_c", "alpine_grass_b"];
const tLushGrass = ["new_alpine_grass_a","new_alpine_grass_d"];

const tMidRangeCliffs = ["alpine_cliff_b","alpine_cliff_c"];
const tHighRangeCliffs = ["alpine_mountainside","alpine_cliff_snow" ];
const tPass = ["alpine_cliff_b", "alpine_cliff_c", "alpine_grass_rocky", "alpine_grass_rocky", "alpine_grass_rocky"];

const tSand = ["beach_c", "beach_d"];
const tSandTransition = ["beach_scrub_50_"];
const tWater = ["sand_wet_a","sand_wet_b","sand_wet_b","sand_wet_b"];

const tGrassLandForest = "alpine_forrestfloor";
const tGrassLandForest2 = "alpine_grass_d";
const tForestTransition = ["new_alpine_grass_d", "new_alpine_grass_b","alpine_grass_d"];

const tRoad = "new_alpine_citytile";
const tRoadWild = "new_alpine_citytile";

const oBeech = "gaia/flora_tree_euro_beech";
const oPine = "gaia/flora_tree_aleppo_pine";
const oBerryBush = "gaia/flora_bush_berry";
const oDeer = "gaia/fauna_deer";
const oFish = "gaia/fauna_fish";
const oRabbit = "gaia/fauna_rabbit";
const oStoneLarge = "gaia/geology_stonemine_alpine_quarry";
const oStoneSmall = "gaia/geology_stone_alpine_a";
const oMetalLarge = "gaia/geology_metal_alpine_slabs";

const aGrass = "actor|props/flora/grass_soft_small_tall.xml";
const aGrassShort = "actor|props/flora/grass_soft_large.xml";
const aRockLarge = "actor|geology/stone_granite_med.xml";
const aRockMedium = "actor|geology/stone_granite_med.xml";
const aBushMedium = "actor|props/flora/bush_medit_me.xml";
const aBushSmall = "actor|props/flora/bush_medit_sm.xml";

const pForestLand = [tGrassLandForest + TERRAIN_SEPARATOR + oPine,tGrassLandForest + TERRAIN_SEPARATOR + oBeech,
				   tGrassLandForest2 + TERRAIN_SEPARATOR + oPine,tGrassLandForest2 + TERRAIN_SEPARATOR + oBeech,
				   tGrassLandForest,tGrassLandForest2,tGrassLandForest2,tGrassLandForest2];
const pForestLandLight = [tGrassLandForest + TERRAIN_SEPARATOR + oPine,tGrassLandForest + TERRAIN_SEPARATOR + oBeech,
				   tGrassLandForest2 + TERRAIN_SEPARATOR + oPine,tGrassLandForest2 + TERRAIN_SEPARATOR + oBeech,
				   tGrassLandForest,tGrassLandForest2,tForestTransition,tGrassLandForest2,
					tGrassLandForest,tForestTransition,tGrassLandForest2,tForestTransition,
						tGrassLandForest2,tGrassLandForest2,tGrassLandForest2,tGrassLandForest2];
const pForestLandVeryLight = [ tGrassLandForest2 + TERRAIN_SEPARATOR + oPine,tGrassLandForest2 + TERRAIN_SEPARATOR + oBeech,
						tForestTransition,tGrassLandForest2,tForestTransition,tForestTransition,tForestTransition,
						tGrassLandForest,tForestTransition,tGrassLandForest2,tForestTransition,
						tGrassLandForest2,tGrassLandForest2,tGrassLandForest2,tGrassLandForest2];

InitMap();

const numPlayers = getNumPlayers();
const mapSize = getMapSize();

var clDirt = createTileClass();
var clLush = createTileClass();
var clRock = createTileClass();
var clMetal = createTileClass();
var clFood = createTileClass();
var clBaseResource = createTileClass();
var clPass = createTileClass();
var clPyrenneans = createTileClass(); // TODO: should be clPyreneans
var clPass = createTileClass();
var clPlayer = createTileClass();
var clHill = createTileClass();
var clForest = createTileClass();
var clWater = createTileClass();

// Initial Terrain Creation
// I'll use very basic noised sinusoidal functions to give the terrain a way aspect
// It looks like we can't go higher than ≈ 75. Given this I'll lower the ground
const baseHeight = -6;
setWaterHeight(8);

// let's choose the angle of the pyreneans
var MoutainAngle = randFloat(0, 2 * Math.PI);
var lololo = randFloat(-PI/12,-PI/12);	// used by oceans

var baseHeights = [];
for (var ix = 0; ix < mapSize; ix++)
{
	baseHeights.push([]);
	for (var iz = 0; iz < mapSize; iz++)
	{
		if (g_Map.inMapBounds(ix,iz))
		{
			placeTerrain(ix, iz, tGrass);
			setHeight(ix,iz,baseHeight +randFloat(-1,1) + scaleByMapSize(1,3)*(cos(ix/scaleByMapSize(5,30))+sin(iz/scaleByMapSize(5,30))));
			baseHeights[ix].push( baseHeight +randFloat(-1,1) + scaleByMapSize(1,3)*(cos(ix/scaleByMapSize(5,30))+sin(iz/scaleByMapSize(5,30)))  );
		}
		else
			baseHeights[ix].push(-100);
	}
}

var playerX = [];
var playerZ = [];

for (let i = 0; i < numPlayers; ++i)
{
	let angle = MoutainAngle + lololo +
		Math.PI / 3 * (2 * ((i + 1 - (i % 2)) / numPlayers) - 1) +
		Math.PI / 2 * ((i % 2) ? 1 : - 1);

	playerX[i] = 0.35 * Math.cos(angle) + 0.5;
	playerZ[i] = 0.35 * Math.sin(angle) + 0.5;
}

placeDefaultPlayerBases({
	"playerPlacement": [primeSortAllPlayers(), playerX, playerZ],
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
		"template": oPine,
		"radiusFactor": 1/10,
		"maxDistGroup": 5
	},
	"decoratives": {
		"template": aGrassShort
	}
});
RMS.SetProgress(30);

log("Creating the pyreneans...");
var MountainStartX = fractionToTiles(0.5) + Math.cos(MoutainAngle) * fractionToTiles(0.34);
var MountainStartZ = fractionToTiles(0.5) + Math.sin(MoutainAngle) * fractionToTiles(0.34);
var MountainEndX = fractionToTiles(0.5) - Math.cos(MoutainAngle) * fractionToTiles(0.34);
var MountainEndZ = fractionToTiles(0.5) - Math.sin(MoutainAngle) * fractionToTiles(0.34);

var MountainHeight = scaleByMapSize(50, 65);
var peakCount = scaleByMapSize(100, 1000);
var MountainWidth = scaleByMapSize(15, 55);

var randomness = randFloat(-1, 1) * scaleByMapSize(1, 12);

for (let i = 0; i < peakCount; ++i)
{
	RMS.SetProgress(45 * i / peakCount + 30 * (1 - i / peakCount));

	let position = i / peakCount;

	let randHeight2 = randFloat(0, 10) + MountainHeight;

	for (let dist = 0; dist < MountainWidth; dist += 1/3)
	{
		// Sigmoid function
		let f = 2 * (1 - dist / MountainWidth);
		let FormX =
			     (-f + 1.9)
			- 4 * (f - randFloat(0.9, 1.1)) *
			      (f - randFloat(0.9, 1.1)) *
			      (f - randFloat(0.9, 1.1));

		let formula = 1 / (1 + Math.exp(FormX));

		// If we're too far from the border, we flatten
		formula *= 1 - 5 * Math.max(0, Math.abs(0.5 - position) - 0.3);

		let randHeight = randFloat(-1, 1) * 9 * formula;

		for (let i of [1, -1])
		{
			let x = Math.round((MountainStartX * (1 - position) + MountainEndX * position) + randomness * Math.cos(position * Math.PI * 4) + Math.cos(MoutainAngle + i * Math.PI / 2) * dist);
			let z = Math.round((MountainStartZ * (1 - position) + MountainEndZ * position) + randomness * Math.sin(position * Math.PI * 4) + Math.sin(MoutainAngle + i * Math.PI / 2) * dist);

			setHeight(x, z, baseHeights[x][z] + randHeight2 * formula + randHeight);
			if (getHeight(x, z) > 15)
				addToClass(x, z, clPyrenneans);
		}
	}
}
// Smoothing decreasing with height
for (let ix = 1; ix < mapSize - 1; ++ix)
	for (let iz = 1; iz < mapSize - 1; ++iz)
	{
		if (g_Map.inMapBounds(ix,iz) && checkIfInClass(ix, iz, clPyrenneans))
		{
			var NB = getNeighborsHeight(ix,iz);
			var index = 9/(1 + Math.max(0,getHeight(ix,iz)/7));
			setHeight(ix, iz, (getHeight(ix,iz) * (9 - index) + NB * index) / 9);
		}
	}
RMS.SetProgress(48);

log("Creating passages...");
var passWidth = scaleByMapSize(15, 100) / 1.8;
var passLocation = 0.35;
for (let passLoc of [passLocation, 1 - passLocation])
{
	let startX = Math.round((MountainStartX * passLoc + MountainEndX * (1 - passLoc)) + Math.cos(MoutainAngle + Math.PI / 2) * passWidth);
	let startZ = Math.round((MountainStartZ * passLoc + MountainEndZ * (1 - passLoc)) + Math.sin(MoutainAngle + Math.PI / 2) * passWidth);
	let endX = Math.round((MountainStartX * passLoc + MountainEndX * (1 - passLoc)) + Math.cos(MoutainAngle - Math.PI / 2) * passWidth);
	let endZ = Math.round((MountainStartZ * passLoc + MountainEndZ * (1 - passLoc)) + Math.sin(MoutainAngle - Math.PI / 2) * passWidth);

	createPassage({
		"startX": startX,
		"startZ": startZ,
		"startY": (getHeight(startX, startZ) + getHeight(endX, endZ)) / 2,
		"endX": endX,
		"endZ": endZ,
		"endY": MountainHeight - 25,
		"startWidth": 4,
		"endWidth": 7,
		"smooth": 2,
		"tileclass": clPass
	});
}
RMS.SetProgress(50);

log("Smoothing the mountains...");
for (let ix = 1; ix < mapSize - 1; ++ix)
	for (let iz = 1; iz < mapSize - 1; ++iz)
		if (g_Map.inMapBounds(ix,iz) && checkIfInClass(ix, iz, clPyrenneans))
		{
			let index = 9 / (1 + Math.max(0, (getHeight(ix, iz) - 10) / 7));
			setHeight(ix,iz, (getHeight(ix,iz) * (9 - index) + getNeighborsHeight(ix, iz) * index) / 9);
		}

log("Creating oceans...");
for (let angle of [0, Math.PI])
{
	let OceanX = fractionToTiles(0.5) + Math.cos(angle + MoutainAngle + lololo) * fractionToTiles(0.48);
	let OceanZ = fractionToTiles(0.5) + Math.sin(angle + MoutainAngle + lololo) * fractionToTiles(0.48);
	createArea(
		new ClumpPlacer(diskArea(fractionToTiles(0.18)), 0.9, 0.05, 10, OceanX, OceanZ),
		[
			paintClass(clWater),
			new ElevationPainter(-22)
		],
		null);
}

log("Smooth only around the water...");
for (let ix = 1; ix < mapSize - 1; ++ix)
	for (let iz = 1; iz < mapSize - 1; ++iz)
	{
		if (g_Map.inMapBounds(ix,iz) && getTileClass(clWater).countInRadius(ix, iz, 5, true))
		{
			var averageHeight = 0;
			var size = 5;
			if (getTileClass(clPyrenneans).countInRadius(ix,iz,1,true))
				size = 1;
			else if (getTileClass(clPyrenneans).countInRadius(ix,iz,2,true))
				size = 2;
			else if (getTileClass(clPyrenneans).countInRadius(ix,iz,3,true))
				size = 3;
			else if (getTileClass(clPyrenneans).countInRadius(ix,iz,4,true))
				size = 4;

			var todivide = 0;
			for (let xx = -size; xx <= size; ++xx)
				for (let yy = -size; yy <= size; ++yy)
					if (g_Map.inMapBounds(ix + xx, iz + yy) && (xx || yy))
					{
						let coord = Math.abs(xx) + Math.abs(yy);
						averageHeight += getHeight(ix + xx,iz + yy) / coord;
						todivide += 1 / coord;
					}

			averageHeight += getHeight(ix, iz) * 2;
			averageHeight /= todivide + 2;

			setHeight(ix, iz, averageHeight);
		}

		if (g_Map.inMapBounds(ix, iz) && getTileClass(clWater).countInRadius(ix, iz, 4, true) && getTileClass(clWater).countInRadius(ix, iz, 4))
			setHeight(ix,iz, getHeight(ix,iz) + randFloat(-1,1));
	}
RMS.SetProgress(55);

log("Creating hills...");
createAreas(
	new ClumpPlacer(scaleByMapSize(60, 120), 0.3, 0.06, 5),
	[
		new SmoothElevationPainter(ELEVATION_MODIFY, 7, 4, 1),
		new TerrainPainter(tGrassSpecific),
		paintClass(clHill)
	],
	avoidClasses(clWater, 5, clPlayer, 20, clBaseResource, 6, clPyrenneans, 2), scaleByMapSize(5, 35));

log("Creating forests...");
var types = [[tForestTransition, pForestLandVeryLight, pForestLandLight, pForestLand]];
var size = scaleByMapSize(40,115)*PI;
var num = floor(scaleByMapSize(8,40) / types.length);
for (let type of types)
	createAreas(
		new ClumpPlacer(size, 0.2, 0.1, 1),
		[
			new LayeredPainter(type, [scaleByMapSize(1, 2), scaleByMapSize(3, 6), scaleByMapSize(3, 6)]),
			paintClass(clForest)
		],
		avoidClasses(clPlayer, 20, clPyrenneans,0, clForest, 7, clWater, 2),
		num);
RMS.SetProgress(60);

log("Creating lone trees...");
var num = scaleByMapSize(80,400);

var group = new SimpleGroup([new SimpleObject(oPine, 1,2, 1,3),new SimpleObject(oBeech, 1,2, 1,3)], true, clForest);
createObjectGroupsDeprecated(group, 0,  avoidClasses(clWater, 3, clForest, 1, clPlayer, 8,clPyrenneans, 1), num, 20 );

log("Painting the map");
for (let x = 0; x < mapSize; ++x)
	for (let z = 0; z < mapSize; ++z)
	{
		let height = getHeight(x,z);
		let heightDiff = getHeightDifference(x,z);

		if (getTileClass(clPyrenneans).countInRadius(x, z, 2, true))
		{
			createTerrain(getPyreneansTerrain(height, heightDiff)).place(x, z);

			if (height >= 30 && heightDiff < 5 && getTileClass(clPass).countInRadius(x, z, 2, true))
				createTerrain(tPass).place(x,z);
		}

		let terrainShore = getShoreTerrain(height, heightDiff, x, z);
		if (terrainShore)
			createTerrain(terrainShore).place(x, z);
	}

function getPyreneansTerrain(height, heightDiff)
{
	if (height < 6)
		return heightDiff < 5 ? tGrass : tMidRangeCliffs;

	if (height < 18)
		return heightDiff < 8 ? tGrassMidRange : tMidRangeCliffs;

	if (height < 30)
		return heightDiff < 8 ? tGrassHighRange : tMidRangeCliffs;

	if (height < MountainHeight - 20)
		return heightDiff < 8 ? tHighRocks : tHighRangeCliffs;

	if (height < MountainHeight - 10)
		return heightDiff < 7 ? tSnowedRocks : tHighRangeCliffs;

	return heightDiff < 6 ? tTopSnowOnly : tTopSnow;
}

function getShoreTerrain(height, heightDiff, x, z)
{
	if (height <= -14)
		return tWater;

	if (height <= -2 && getTileClass(clWater).countInRadius(x, z, 2, true))
		return heightDiff < 2.5 ? tSand : tMidRangeCliffs;

	if (height <= 0 && getTileClass(clWater).countInRadius(x, z, 3, true))
		return heightDiff < 2.5 ? tSandTransition : tMidRangeCliffs;

	return undefined;
}

log("Creating dirt patches...");
for (let size of [scaleByMapSize(3, 20), scaleByMapSize(5, 40), scaleByMapSize(8, 60)])
	createAreas(
		new ClumpPlacer(size, 0.3, 0.06, 0.5),
		[
			new TerrainPainter(tDirtyGrass),
			paintClass(clDirt)
		],
		avoidClasses(clWater, 3, clForest, 0, clPyrenneans,5, clHill, 0, clDirt, 5, clPlayer, 6),
		scaleByMapSize(15, 45));

log("Creating grass patches...");
for (let size of [scaleByMapSize(2, 32), scaleByMapSize(3, 48), scaleByMapSize(5, 80)])
	createAreas(
		new ClumpPlacer(size, 0.3, 0.06, 0.5),
		[
			new TerrainPainter(tLushGrass),
			paintClass(clLush)
		],
		avoidClasses(clWater, 3, clForest, 0, clPyrenneans,5, clHill, 0, clDirt, 5, clPlayer, 6),
		scaleByMapSize(15, 45));

RMS.SetProgress(70);

// making more in dirt areas so as to appear different
log("Creating small grass tufts...");
var group = new SimpleGroup( [new SimpleObject(aGrassShort, 1,2, 0,1, -PI/8,PI/8)] );
createObjectGroupsDeprecated(group, 0, avoidClasses(clWater, 2, clHill, 2, clPlayer, 5, clDirt, 0, clPyrenneans,2), scaleByMapSize(13, 200) );
createObjectGroupsDeprecated(group, 0, stayClasses(clDirt,1), scaleByMapSize(13, 200),10);

log("Creating large grass tufts...");
group = new SimpleGroup( [new SimpleObject(aGrass, 2,4, 0,1.8, -PI/8,PI/8), new SimpleObject(aGrassShort, 3,6, 1.2,2.5, -PI/8,PI/8)] );
createObjectGroupsDeprecated(group, 0, avoidClasses(clWater, 3, clHill, 2, clPlayer, 5, clDirt, 1, clForest, 0, clPyrenneans,2), scaleByMapSize(13, 200) );
createObjectGroupsDeprecated(group, 0, stayClasses(clDirt,1), scaleByMapSize(13, 200),10);
RMS.SetProgress(75);

log("Creating bushes...");
group = new SimpleGroup( [new SimpleObject(aBushMedium, 1,2, 0,2), new SimpleObject(aBushSmall, 2,4, 0,2)] );
createObjectGroupsDeprecated(group, 0, avoidClasses(clWater, 2, clPlayer, 1, clPyrenneans, 1), scaleByMapSize(13, 200), 50 );

RMS.SetProgress(80);

log("Creating stone mines...");
group = new SimpleGroup([new SimpleObject(oStoneSmall, 0,2, 0,4), new SimpleObject(oStoneLarge, 1,1, 0,4)], true, clRock);
createObjectGroupsDeprecated(group, 0,  avoidClasses(clWater, 3, clForest, 1, clPlayer, 20, clRock, 8, clPyrenneans, 1),  scaleByMapSize(4,16), 100 );

log("Creating small stone quarries...");
group = new SimpleGroup([new SimpleObject(oStoneSmall, 2,5, 1,3)], true, clRock);
createObjectGroupsDeprecated(group, 0,  avoidClasses(clWater, 3, clForest, 1, clPlayer, 20, clRock, 8, clPyrenneans, 1),  scaleByMapSize(4,16), 100 );

log("Creating metal mines...");
group = new SimpleGroup([new SimpleObject(oMetalLarge, 1,1, 0,4)], true, clMetal);
createObjectGroupsDeprecated(group, 0, avoidClasses(clWater, 3, clForest, 1, clPlayer, 20, clMetal, 8, clRock, 5, clPyrenneans, 1), scaleByMapSize(4,16), 100  );

RMS.SetProgress(85);

log("Creating small decorative rocks...");
group = new SimpleGroup( [new SimpleObject(aRockMedium, 1,3, 0,1)], true );
createObjectGroupsDeprecated( group, 0, avoidClasses(clWater, 0, clForest, 0, clPlayer, 0), scaleByMapSize(16, 262), 50 );

log("Creating large decorative rocks...");
group = new SimpleGroup( [new SimpleObject(aRockLarge, 1,2, 0,1), new SimpleObject(aRockMedium, 1,3, 0,2)], true );
createObjectGroupsDeprecated( group, 0,  avoidClasses(clWater, 0, clForest, 0, clPlayer, 0), scaleByMapSize(8, 131), 50 );

RMS.SetProgress(90);

log("Creating deer...");
group = new SimpleGroup( [new SimpleObject(oDeer, 5,7, 0,4)], true, clFood );
createObjectGroupsDeprecated(group, 0,  avoidClasses(clWater, 3, clForest, 0, clPlayer, 20, clPyrenneans, 1, clFood, 15),  3 * numPlayers, 50 );

log("Creating rabbit...");
group = new SimpleGroup( [new SimpleObject(oRabbit, 2,3, 0,2)], true, clFood );
createObjectGroupsDeprecated(group, 0, avoidClasses(clWater, 3, clForest, 0, clPlayer, 20, clPyrenneans, 1, clFood,15), 3 * numPlayers, 50 );

log("Creating berry bush...");
group = new SimpleGroup( [new SimpleObject(oBerryBush, 5,7, 0,4)],true, clFood );
createObjectGroupsDeprecated(group, 0, avoidClasses(clWater, 3, clForest, 0, clPlayer, 20, clPyrenneans, 1, clFood, 10), randIntInclusive(1, 4) * numPlayers + 2, 50);

log("Creating fish...");
group = new SimpleGroup( [new SimpleObject(oFish, 2,3, 0,2)], true, clFood );
createObjectGroupsDeprecated(group, 0, [avoidClasses(clFood, 15), stayClasses(clWater, 6)], 20 * numPlayers, 60 );

setSunElevation(randFloat(PI/5, PI / 3));
setSunRotation(randFloat(0, 2 * Math.PI));

setSkySet("cumulus");
setSunColor(0.73,0.73,0.65);
setTerrainAmbientColor(0.45,0.45,0.50);
setUnitsAmbientColor(0.4,0.4,0.4);
setWaterColor(0.263, 0.353, 0.616);
setWaterTint(0.104, 0.172, 0.563);
setWaterWaviness(5.0);
setWaterType("ocean");
setWaterMurkiness(0.83);

ExportMap();

function getNeighborsHeight(x1, z1)
{
	var toCheck = [ [-1,-1], [-1,0], [-1,1], [0,1], [1,1], [1,0], [1,-1], [0,-1] ];
	var height = 0;
	for (var i in toCheck) {
		var xx = x1 + toCheck[i][0];
		var zz = z1 + toCheck[i][1];
		height += getHeight(round(xx),round(zz));
	}
	height /= 8;
	return height;
}

function getHeightDifference(x1, z1)
{
	x1 = round(x1);
	z1 = round(z1);
	var height = getHeight(x1,z1);

	if (!g_Map.inMapBounds(x1,z1))
		return 0;

	var toCheck = [ [-1,-1], [-1,0], [-1,1], [0,1], [1,1], [1,0], [1,-1], [0,-1] ];

	var diff = 0;
	var todiv = 0;

	for (var i in toCheck)
	{
		var xx = round(x1 + toCheck[i][0]);
		var zz = round(z1 + toCheck[i][1]);

		if (g_Map.inMapBounds(xx,zz))
		{
			diff += abs(getHeight(xx,zz) - height);
			todiv++;
		}
	}
	if (todiv)
		diff /= todiv;
	return diff;
}

