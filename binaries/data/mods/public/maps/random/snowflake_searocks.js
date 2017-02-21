RMS.LoadLibrary("rmgen");

var random_terrain = randomizeBiome();

const tMainTerrain = rBiomeT1();
const tForestFloor1 = rBiomeT2();
const tForestFloor2 = rBiomeT3();
const tCliff = rBiomeT4();
const tTier1Terrain = rBiomeT5();
const tTier2Terrain = rBiomeT6();
const tTier3Terrain = rBiomeT7();
const tHill = rBiomeT1();
const tRoad = rBiomeT10();
const tRoadWild = rBiomeT11();
const tTier4Terrain = rBiomeT12();
const tWater = rBiomeT15();

// gaia entities
const oTree1 = rBiomeE1();
const oTree2 = rBiomeE2();
const oTree3 = rBiomeE3();
const oTree4 = rBiomeE4();
const oTree5 = rBiomeE5();
const oFruitBush = rBiomeE6();
const oMainHuntableAnimal = rBiomeE8();
const oSecondaryHuntableAnimal = rBiomeE10();
const oStoneLarge = rBiomeE11();
const oStoneSmall = rBiomeE12();
const oMetalLarge = rBiomeE13();

// decorative props
const aGrass = rBiomeA1();
const aGrassShort = rBiomeA2();
const aRockLarge = rBiomeA5();
const aRockMedium = rBiomeA6();
const aBushMedium = rBiomeA7();
const aBushSmall = rBiomeA8();

const pForest1 = [tForestFloor2 + TERRAIN_SEPARATOR + oTree1, tForestFloor2 + TERRAIN_SEPARATOR + oTree2, tForestFloor2];
const pForest2 = [tForestFloor1 + TERRAIN_SEPARATOR + oTree4, tForestFloor1 + TERRAIN_SEPARATOR + oTree5, tForestFloor1];

log("Initializing map...");
InitMap();

const numPlayers = getNumPlayers();
const mapSize = getMapSize();

if (numPlayers == 1)
	error("This map does not support 1 player only!");

log(mapSize);

var clPlayer = createTileClass();
var clHill = createTileClass();
var clForest = createTileClass();
var clDirt = createTileClass();
var clRock = createTileClass();
var clMetal = createTileClass();
var clFood = createTileClass();
var clBaseResource = createTileClass();
var clLand = createTileClass();

initTerrain(tWater);

const radius = scaleByMapSize(15,30);
const cliffRadius = 2;
const elevation = 20;

// randomize player order
var playerIDs = [];
for (var i = 0; i < numPlayers; ++i)
	playerIDs.push(i+1);
playerIDs = sortPlayers(playerIDs);

// place players
var playerX = new Array(numPlayers);
var playerZ = new Array(numPlayers);
var playerAngle = new Array(numPlayers);

var startAngle = randFloat(0, TWO_PI);
for (var i = 0; i < numPlayers; ++i)
{
	playerAngle[i] = startAngle + i*TWO_PI/numPlayers;
	playerX[i] = 0.5 + 0.35*cos(playerAngle[i]);
	playerZ[i] = 0.5 + 0.35*sin(playerAngle[i]);
}

var numIslands = 0;
var isConnected = [];
var IslandX;
var IslandZ;

function initIsConnected(numIslands)
{
	for (let m = 0; m < numIslands; ++m)
	{
		isConnected[m] = [];
		for (let n = 0; n < numIslands; ++n)
			isConnected[m][n] = 0;
	}
}

function createIsland(size, tileClass)
{
	let hillSize = PI * radius * radius * size;
	createArea(
			new ClumpPlacer(hillSize, 0.95, 0.6, 10, ix, iz),
		[
			new LayeredPainter([tCliff, tHill], [cliffRadius]),
			new SmoothElevationPainter(ELEVATION_SET, elevation, cliffRadius),
			paintClass(tileClass)
		],
		null);
	return hillSize;
}

function centralIsland()
{
	numIslands = numPlayers + 1;

	initIsConnected(numIslands);
	IslandX = new Array(numIslands);
	IslandZ = new Array(numIslands);

	//connections
	var sX = 0;
	var sZ = 0;
	for (var l = 0; l < numPlayers; l++)
	{
		isConnected[l][numPlayers] = 1;
		sX = sX + playerX[l];
		sZ = sZ + playerZ[l];
	}

	var fx = fractionToTiles((sX)/numPlayers);
	var fz = fractionToTiles((sZ)/numPlayers);
	var ix = round(fx);
	var iz = round(fz);

	IslandX[numPlayers] = ix;
	IslandZ[numPlayers] = iz;

	createIsland(1, clLand);
}

function noMiddleIsland()
{
	numIslands = 2 * numPlayers;

	IslandX = new Array(numIslands);
	IslandZ = new Array(numIslands);

	initIsConnected(numIslands);

	for (let e = 0; e < numPlayers; ++e)
	{
		if (e+1< numPlayers)
			isConnected[e][e+1] = 1;
		else
			isConnected[0][e] = 1;

		isConnected[e+numPlayers][e] = 1;
		if (e+numPlayers+1<numIslands)
			isConnected[e+numPlayers][e+numPlayers+1] = 1;
		else
			isConnected[e+numPlayers][numPlayers] = 1;

		let fx = fractionToTiles(0.5 + 0.16*cos(startAngle + e*TWO_PI/numPlayers));
		let fz = fractionToTiles(0.5 + 0.16*sin(startAngle + e*TWO_PI/numPlayers));
		let ix = round(fx);
		let iz = round(fz);

		IslandX[e+numPlayers] = ix;
		IslandZ[e+numPlayers] = iz;

		createIsland(0.81, clLand);
	}
}

function snowFlake(smallIslandRadius, smallIslandSize, bigIslandRadius, bigIslandSize)
{
	numIslands = 4 * numPlayers + 1;

	initIsConnected(numIslands);

	let sX = 0;
	let sZ = 0;

	for (let l = 0; l < numPlayers; ++l)
	{
		isConnected[4 * numPlayers][l + 2 * numPlayers] = 1;

		sX = sX + playerX[l];
		sZ = sZ + playerZ[l];
	}

	let fx = fractionToTiles(sX/numPlayers);
	let fz = fractionToTiles(sZ/numPlayers);
	let ix = round(fx);
	let iz = round(fz);

	IslandX = new Array(numIslands);
	IslandZ = new Array(numIslands);

	IslandX[4*numPlayers] = ix;
	IslandZ[4*numPlayers] = iz;

	createIsland(0.36, clLand);

	for (let e = 0; e < numPlayers; ++e)
	{
		// Central Island
		{
			isConnected[e+2*numPlayers][e] = 1;
			if (e+2*numPlayers+1<numIslands-numPlayers-1)
				isConnected[e+2*numPlayers][e+2*numPlayers+1] = 1;
			else
				isConnected[2*numPlayers][e+2*numPlayers] = 1;

			let fx = fractionToTiles(0.5 + 0.16*cos(startAngle + e*TWO_PI/numPlayers));
			let fz = fractionToTiles(0.5 + 0.16*sin(startAngle + e*TWO_PI/numPlayers));
			let ix = round(fx);
			let iz = round(fz);
			IslandX[e+2*numPlayers] = ix;
			IslandZ[e+2*numPlayers] = iz;

			createIsland(0.81, clLand);
		}

		// Small Islands
		{
			isConnected[e+3*numPlayers][e+numPlayers] = 1;

			let fx = fractionToTiles(0.5 + smallIslandRadius * cos(startAngle + e*TWO_PI/numPlayers + TWO_PI/(2*numPlayers)));
			let fz = fractionToTiles(0.5 + smallIslandRadius * sin(startAngle + e*TWO_PI/numPlayers + TWO_PI/(2*numPlayers)));
			let ix = round(fx);
			let iz = round(fz);

			IslandX[e+3*numPlayers] = ix;
			IslandZ[e+3*numPlayers] = iz;

			createIsland(smallIslandSize, clLand);
		}
	}

	for (let e = 0; e < numPlayers; ++e)
	{
		isConnected[e][e+numPlayers] = 1;

		if (e + 1 < numPlayers)
			isConnected[e + 1][e+numPlayers] = 1;
		else
			isConnected[0][e+numPlayers] = 1;

		//second island id 4
		let fx = fractionToTiles(0.5 + bigIslandRadius * cos(startAngle + e*TWO_PI/numPlayers + TWO_PI/(2*numPlayers)));
		let fz = fractionToTiles(0.5 + bigIslandRadius * sin(startAngle + e*TWO_PI/numPlayers + TWO_PI/(2*numPlayers)));
		let ix = round(fx);
		let iz = round(fz);
		IslandX[e+numPlayers] = ix;
		IslandZ[e+numPlayers] = iz;

		createIsland(bigIslandSize, clLand);
	}
}

if (mapSize == 128 || mapSize == 192)
{
	if (numPlayers == 2 || numPlayers == 3)
		snowFlake(0.27, 0.49, 0.41, 1);

	if (numPlayers == 4)
		snowFlake(0.41, 0.49, 0.27, 1);

	if (numPlayers > 4)
		centralIsland();
}

if (mapSize == 256)
{
	if (numPlayers == 2 || numPlayers == 3 || numPlayers == 4)
		snowFlake(0.41, 0.49, 0.26, 1);

	if (numPlayers > 4)
		noMiddleIsland();
}

if (mapSize == 320)
{
	if (1 < numPlayers && numPlayers < 8)
		snowFlake(0.41, 0.49, 0.26, 1);

	if (numPlayers == 8)
		noMiddleIsland();
}

if (mapSize >= 384)
{
	if (numPlayers == 2 || numPlayers == 3 || numPlayers == 4 || numPlayers == 5)
		snowFlake(0.41, 0.49, 0.24, 1);

	if (numPlayers == 6 || numPlayers == 7 || numPlayers == 8)
		snowFlake(0.41, 0.36, 0.28, 0.81);
}

for (let m = 0; m < numIslands; ++m)
	for (let n = 0; n < numIslands; ++n)
		if (isConnected[m][n] == 1)
			isConnected[n][m] = 1;

for (var i = 0; i < numPlayers; ++i)
{
	var id = playerIDs[i];
	log("Creating base for player " + id + "...");

	// get the x and z in tiles
	var fx = fractionToTiles(playerX[i]);
	var fz = fractionToTiles(playerZ[i]);
	var ix = round(fx);
	var iz = round(fz);
	IslandX[i] = ix;
	IslandZ[i] = iz;

	let hillSize = createIsland(1, clPlayer);

	// create the city patch
	var cityRadius = radius/3;
	var placer = new ClumpPlacer(PI*cityRadius*cityRadius, 0.6, 0.3, 10, ix, iz);
	var painter = new LayeredPainter([tRoadWild, tRoad], [1]);
	createArea(placer, painter, null);

	placeCivDefaultEntities(fx, fz, id, { 'iberWall': 'towers' });

	placeDefaultChicken(fx, fz, clBaseResource);

	// create berry bushes
	var bbAngle = randFloat(0, TWO_PI);
	var bbDist = 10;
	var bbX = round(fx + bbDist * cos(bbAngle));
	var bbZ = round(fz + bbDist * sin(bbAngle));
	var group = new SimpleGroup(
		[new SimpleObject(oFruitBush, 5,5, 0,3)],
		true, clBaseResource, bbX, bbZ
	);
	createObjectGroup(group, 0);

	// create metal mine
	var mAngle = bbAngle;
	while(abs(mAngle - bbAngle) < PI/3)
		mAngle = randFloat(0, TWO_PI);

	var mDist = radius - 4;
	var mX = round(fx + mDist * cos(mAngle));
	var mZ = round(fz + mDist * sin(mAngle));
	group = new SimpleGroup(
		[new SimpleObject(oMetalLarge, 1,1, 0,0)],
		true, clBaseResource, mX, mZ
	);
	createObjectGroup(group, 0);

	// create stone mines
	mAngle += randFloat(PI/8, PI/4);
	mX = round(fx + mDist * cos(mAngle));
	mZ = round(fz + mDist * sin(mAngle));
	group = new SimpleGroup(
		[new SimpleObject(oStoneLarge, 1,1, 0,2)],
		true, clBaseResource, mX, mZ
	);
	createObjectGroup(group, 0);

	// create starting trees
	var num = floor(hillSize / 60);
	var tAngle = randFloat(-PI/3, 4*PI/3);
	var tDist = 11;
	var tX = round(fx + tDist * cos(tAngle));
	var tZ = round(fz + tDist * sin(tAngle));
	group = new SimpleGroup(
		[new SimpleObject(oTree1, num, num, 0,4)],
		false, clBaseResource, tX, tZ
	);
	createObjectGroup(group, 0, [avoidClasses(clBaseResource,2), stayClasses(clPlayer, 3)]);

	placeDefaultDecoratives(fx, fz, aGrassShort, clBaseResource, radius);
}
RMS.SetProgress(30);

// Create connectors
for (var ix = 0; ix < mapSize; ix++)
	for (var iz = 0; iz < mapSize; iz++)
		for (var m = 0; m < numIslands; m++)
			for (var n = 0; n < numIslands; n++)
				if (isConnected[m][n] == 1)
				{
					var a = IslandZ[m]-IslandZ[n];
					var b = IslandX[n]-IslandX[m];
					var c = (IslandZ[m]*(IslandX[m]-IslandX[n]))-(IslandX[m]*(IslandZ[m]-IslandZ[n]));
					var dis = abs(a*ix + b*iz + c)/sqrt(a*a + b*b);
					var k = (a*ix + b*iz + c)/(a*a + b*b);
					var y = iz-(b*k);

					if (dis < 5 && y <= Math.max(IslandZ[m], IslandZ[n]) && y >= Math.min(IslandZ[m], IslandZ[n]))
					{
						if (dis < 3)
						{
							var h = 20;
							if (dis < 2)
								var t = tHill;
							else
								var t = tCliff;
							addToClass(ix, iz, clLand);
						}
						else
						{
							var h = 50 - 10 * dis;
							var t = tCliff;
							addToClass(ix, iz, clLand);
						}

						if (getHeight(ix, iz)<h)
						{
							placeTerrain(ix, iz, t);
							setHeight(ix, iz, h);
						}
					}
				}

// calculate desired number of trees for map (based on size)
if (random_terrain == g_BiomeSavanna)
{
	var MIN_TREES = 200;
	var MAX_TREES = 1250;
	var P_FOREST = 0.02;
}
else if (random_terrain == g_BiomeTropic)
{
	var MIN_TREES = 1000;
	var MAX_TREES = 6000;
	var P_FOREST = 0.6;
}
else
{
	var MIN_TREES = 500;
	var MAX_TREES = 3000;
	var P_FOREST = 0.7;
}

var totalTrees = scaleByMapSize(MIN_TREES, MAX_TREES);
var numForest = totalTrees * P_FOREST;
var numStragglers = totalTrees * (1.0 - P_FOREST);

log("Creating forests...");
var types = [
	[[tForestFloor2, tMainTerrain, pForest1], [tForestFloor2, pForest1]],
	[[tForestFloor1, tMainTerrain, pForest2], [tForestFloor1, pForest2]]
];	// some variation

if (random_terrain == g_BiomeSavanna)
	var size = numForest / (0.5 * scaleByMapSize(2,8) * numPlayers);
else
	var size = numForest / (scaleByMapSize(2,8) * numPlayers);

var num = floor(size / types.length);
for (var i = 0; i < types.length; ++i)
{
	placer = new ClumpPlacer(numForest / num, 0.1, 0.1, 1);
	painter = new LayeredPainter(
		types[i],		// terrains
		[2]											// widths
		);
	createAreas(
		placer,
		[painter, paintClass(clForest)],
		[avoidClasses(clPlayer, 6, clForest, 10, clHill, 0), stayClasses(clLand, 4)],
		num
	);
}

RMS.SetProgress(55);

log("Creating stone mines...");
group = new SimpleGroup([new SimpleObject(oStoneSmall, 0,2, 0,4), new SimpleObject(oStoneLarge, 1,1, 0,4)], true, clRock);
createObjectGroups(group, 0,
	[avoidClasses(clForest, 1, clPlayer, 10, clRock, 10, clHill, 1), stayClasses(clLand, 5)],
	5*scaleByMapSize(4,16), 100
);

log("Creating small stone mines...");
group = new SimpleGroup([new SimpleObject(oStoneSmall, 2,5, 1,3)], true, clRock);
createObjectGroups(group, 0,
	[avoidClasses(clForest, 1, clPlayer, 10, clRock, 10, clHill, 1), stayClasses(clLand, 5)],
	5*scaleByMapSize(4,16), 100
);

log("Creating metal mines...");
group = new SimpleGroup([new SimpleObject(oMetalLarge, 1,1, 0,4)], true, clMetal);
createObjectGroups(group, 0,
	[avoidClasses(clForest, 1, clPlayer, 10, clMetal, 10, clRock, 5, clHill, 1), stayClasses(clLand, 5)],
	5*scaleByMapSize(4,16), 100
);

RMS.SetProgress(65);
log("Creating dirt patches...");
var sizes = [scaleByMapSize(3, 48), scaleByMapSize(5, 84), scaleByMapSize(8, 128)];
for (var i = 0; i < sizes.length; ++i)
{
	placer = new ClumpPlacer(sizes[i], 0.3, 0.06, 0.5);
	painter = new LayeredPainter(
		[[tMainTerrain,tTier1Terrain],[tTier1Terrain,tTier2Terrain], [tTier2Terrain,tTier3Terrain]], 		// terrains
		[1,1]															// widths
	);
	createAreas(
		placer,
		[painter, paintClass(clDirt)],
		[avoidClasses(clForest, 0, clHill, 0, clDirt, 5, clPlayer, 12), stayClasses(clLand, 5)],
		scaleByMapSize(15, 45)
	);
}

log("Creating grass patches...");
var sizes = [scaleByMapSize(2, 32), scaleByMapSize(3, 48), scaleByMapSize(5, 80)];
for (var i = 0; i < sizes.length; ++i)
{
	placer = new ClumpPlacer(sizes[i], 0.3, 0.06, 0.5);
	painter = new TerrainPainter(tTier4Terrain);
	createAreas(
		placer,
		painter,
		[avoidClasses(clForest, 0, clHill, 0, clDirt, 5, clPlayer, 12), stayClasses(clLand, 5)],
		scaleByMapSize(15, 45)
	);
}

log("Creating small decorative rocks...");
group = new SimpleGroup(
	[new SimpleObject(aRockMedium, 1,3, 0,1)],
	true
);
createObjectGroups(
	group, 0,
	[avoidClasses(clForest, 0, clPlayer, 0, clHill, 0), stayClasses(clLand, 4)],
	scaleByMapSize(16, 262), 50
);

log("Creating large decorative rocks...");
group = new SimpleGroup(
	[new SimpleObject(aRockLarge, 1,2, 0,1), new SimpleObject(aRockMedium, 1,3, 0,2)],
	true
);
createObjectGroups(
	group, 0,
	[avoidClasses(clForest, 0, clPlayer, 0, clHill, 0), stayClasses(clLand, 4)],
	scaleByMapSize(8, 131), 50
);

RMS.SetProgress(70);

log("Creating deer...");
group = new SimpleGroup(
	[new SimpleObject(oMainHuntableAnimal, 5,7, 0,4)],
	true, clFood
);
createObjectGroups(group, 0,
	[avoidClasses(clForest, 0, clPlayer, 10, clHill, 1, clFood, 20), stayClasses(clLand, 4)],
	3 * numPlayers, 50
);

RMS.SetProgress(75);

log("Creating sheep...");
group = new SimpleGroup(
	[new SimpleObject(oSecondaryHuntableAnimal, 2,3, 0,2)],
	true, clFood
);
createObjectGroups(group, 0,
	[avoidClasses(clForest, 0, clPlayer, 10, clHill, 1, clFood, 20), stayClasses(clLand, 4)],
	3 * numPlayers, 50
);

log("Creating fruits...");
group = new SimpleGroup(
	[new SimpleObject(oFruitBush, 5,7, 0,4)],
	true, clFood
);
createObjectGroups(group, 0,
	[avoidClasses(clForest, 0, clPlayer, 10, clHill, 1, clFood, 20), stayClasses(clLand, 4)],
	3 * numPlayers, 50
);
RMS.SetProgress(85);

log("Creating straggler trees...");
var types = [oTree1, oTree2, oTree4, oTree3];	// some variation
var num = floor(numStragglers / types.length);
for (var i = 0; i < types.length; ++i)
{
	group = new SimpleGroup(
		[new SimpleObject(types[i], 1,1, 0,3)],
		true, clForest
	);
	createObjectGroups(group, 0,
		[avoidClasses(clForest, 1, clHill, 1, clPlayer, 9, clMetal, 6, clRock, 6), stayClasses(clLand, 4)],
		num
	);
}

var planetm = 1;
if (random_terrain == g_BiomeTropic)
	planetm = 8;

log("Creating small grass tufts...");
group = new SimpleGroup(
	[new SimpleObject(aGrassShort, 1,2, 0,1, -PI/8,PI/8)]
);
createObjectGroups(group, 0,
	[avoidClasses(clHill, 2, clPlayer, 2, clDirt, 0), stayClasses(clLand, 4)],
	planetm * scaleByMapSize(13, 200)
);

RMS.SetProgress(90);

log("Creating large grass tufts...");
group = new SimpleGroup(
	[new SimpleObject(aGrass, 2,4, 0,1.8, -PI/8,PI/8), new SimpleObject(aGrassShort, 3,6, 1.2,2.5, -PI/8,PI/8)]
);
createObjectGroups(group, 0,
	[avoidClasses(clHill, 2, clPlayer, 2, clDirt, 1, clForest, 0), stayClasses(clLand, 4)],
	planetm * scaleByMapSize(13, 200)
);
RMS.SetProgress(95);

log("Creating bushes...");
group = new SimpleGroup(
	[new SimpleObject(aBushMedium, 1,2, 0,2), new SimpleObject(aBushSmall, 2,4, 0,2)]
);
createObjectGroups(group, 0,
	[avoidClasses(clHill, 1, clPlayer, 1, clDirt, 1), stayClasses(clLand, 4)],
	planetm * scaleByMapSize(13, 200), 50
);

setSkySet(pickRandom(["cirrus", "cumulus", "sunny"]));
setSunRotation(randFloat(0, TWO_PI));
setSunElevation(randFloat(PI/ 5, PI / 3));

ExportMap();
