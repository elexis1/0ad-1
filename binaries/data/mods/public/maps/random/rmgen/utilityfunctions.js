var g_numStragglerTrees = 0;

function createBumps(constraint, count, minsize, maxsize, spread, failfraction, elevation)
{
	log("Creating bumps...");
	constraint = (constraint !== undefined ? constraint : avoidClasses(clPlayer, 20));
	minsize = (minsize !== undefined ? minsize : 1);
	maxsize = (maxsize !== undefined ? maxsize : floor(scaleByMapSize(4, 6)));
	spread = (spread !== undefined ? spread : floor(scaleByMapSize(2, 5)));
	failfraction = (failfraction !== undefined ? failfraction : 0);
	elevation = (elevation !== undefined ? elevation : 2);
	count = (count !== undefined ? count : scaleByMapSize(100, 200));

	createAreas(
		new ChainPlacer(minsize, maxsize, spread, failfraction),
		new SmoothElevationPainter(ELEVATION_MODIFY, elevation, 2),
		constraint,
		count);
}

function createHills(terrainset, constraint, tileclass, count, minsize, maxsize, spread, failfraction, elevation, elevationsmooth)
{
	log("Creating hills...");

	tileclass = (tileclass !== undefined ? tileclass : clHill);
	constraint = (constraint !== undefined ? constraint : avoidClasses(clPlayer, 20, clHill, 15));
	count = (count !== undefined ? count : scaleByMapSize(1, 4) * getNumPlayers());
	minsize = (minsize !== undefined ? minsize : 1);
	maxsize = (maxsize !== undefined ? maxsize : floor(scaleByMapSize(4, 6)));
	spread = (spread !== undefined ? spread : floor(scaleByMapSize(16, 40)));
	failfraction = (failfraction !== undefined ? failfraction : 0.5);
	elevation = (elevation !== undefined ? elevation : 18);
	elevationsmooth = (elevationsmooth !== undefined ? elevationsmooth : 2);

	createAreas(
		new ChainPlacer(minsize, maxsize, spread, failfraction),
		[
			new LayeredPainter(terrainset, [1, elevationsmooth]),
			new SmoothElevationPainter(ELEVATION_SET, elevation, elevationsmooth),
			paintClass(clHill)
		],
		constraint,
		count);
}

function createMountains(terrain, constraint, tileclass, count, maxHeight, minRadius, maxRadius, numCircles)
{
	log("Creating mountains...");

	tileclass = tileclass !== undefined ? tileclass : clHill;
	constraint = constraint !== undefined ? constraint : avoidClasses(clPlayer, 20, clHill, 15);
	count = count !== undefined ? count : scaleByMapSize(1, 4) * getNumPlayers();
	maxHeight = maxHeight !== undefined ? maxHeight : floor(scaleByMapSize(30, 50));
	minRadius = minRadius !== undefined ? minRadius : floor(scaleByMapSize(3, 4));
	maxRadius = maxRadius !== undefined ? maxRadius : floor(scaleByMapSize(6, 12));
	numCircles = numCircles !== undefined ? numCircles : floor(scaleByMapSize(4, 10));

	let mapSize = getMapSize();
	for (let i = 0; i < count; ++i)
		createMountain(
			maxHeight,
			minRadius,
			maxRadius,
			numCircles,
			constraint,
			randIntExclusive(0, mapSize),
			randIntExclusive(0, mapSize),
			terrain,
			tileclass,
			14);
}

function createForests(terrainset, constraint, tileclass, numMultiplier = 1, minTrees = 500, maxTrees = 3000, forestProbability = 0.7)
{
	log("Creating forests...");

	tileclass = tileclass || clForest;
	constraint = constraint || avoidClasses(clPlayer, 20, clForest, 17, clHill, 0);

	var [tM, tFF1, tFF2, tF1, tF2] = terrainset;
	var totalTrees = scaleByMapSize(minTrees, maxTrees);
	var numForest = totalTrees * forestProbability;
	g_numStragglerTrees = totalTrees * (1.0 - forestProbability);

	if (!forestProbability)
		return;

	log("Creating forests...");

	let types = [
		[[tFF2, tM, tF1], [tFF2, tF1]],
		[[tFF1, tM, tF2], [tFF1, tF2]]
	];

	let num = Math.floor(numForest / (scaleByMapSize(3,6) * numPlayers) / types.length);
	for (let type of types)
		createAreas(
			new ChainPlacer(1, Math.floor(scaleByMapSize(3, 5)), numForest / num, 0.5),
			[
				new LayeredPainter(type, [2]),
				paintClass(tileclass)
			],
			constraint,
			num
		);
}

function createLayeredPatches(sizes, terrainset, twidthset, constraint, count, tileclass, failfraction)
{
	tileclass = (tileclass !== undefined ? tileclass : clDirt);
	constraint = (constraint !== undefined ? constraint : avoidClasses(clForest, 0, clHill, 0, clDirt, 5, clPlayer, 12));
	count = (count !== undefined ? count : scaleByMapSize(15, 45));
	failfraction = (failfraction !== undefined ? failfraction : 0.5);

	for (let size of sizes)
		createAreas(
			new ChainPlacer(1, floor(scaleByMapSize(3, 5)), size, failfraction),
			[
				new LayeredPainter(terrainset, twidthset),
				paintClass(tileclass)
			],
			constraint,
			count);
}

function createPatches(sizes, terrain, constraint, count,  tileclass, failfraction)
{
	tileclass = (tileclass !== undefined ? tileclass : clDirt);
	constraint = (constraint !== undefined ? constraint : avoidClasses(clForest, 0, clHill, 0, clDirt, 5, clPlayer, 12));
	count = (count !== undefined ? count : scaleByMapSize(15, 45));
	failfraction = (failfraction !== undefined ? failfraction : 0.5);

	for (let size of sizes)
		createAreas(
			new ChainPlacer(1, floor(scaleByMapSize(3, 5)), size, failfraction),
			[
				new TerrainPainter(terrain),
				paintClass(tileclass)
			],
			constraint,
			count);
}

function createMines(mines, constraint, tileclass, count)
{
	tileclass = (tileclass !== undefined ? tileclass : clRock);
	constraint = (constraint !== undefined ? constraint : avoidClasses(clForest, 1, clPlayer, 20, clRock, 10, clHill, 1));
	count = (count !== undefined ? count : scaleByMapSize(4,16));
	for (var i = 0; i < mines.length; ++i)
	{
		var group = new SimpleGroup(mines[i], true, tileclass);
		createObjectGroupsDeprecated(group, 0,
			constraint,
			count, 70
		);
	}
}

/**
 * Places 8 stone mines in a small circular shape.
 */
function createStoneMineFormation(x, z, terrain)
{
	createArea(
		new ChainPlacer(1, 2, 2, 1, x, z, undefined, [5]),
		new TerrainPainter(terrain),
		null);

	let bbAngle = randFloat(0, TWO_PI);
	let dist = 2.5;

	for (let i = 0; i < 8; ++i)
	{
		placeObject(
			Math.round(x + randFloat(dist, dist + 1) * Math.cos(bbAngle)),
			Math.round(z + randFloat(dist, dist + 1) * Math.sin(bbAngle)),
			oStoneSmall,
			0,
			randFloat(0, 2 * PI));
		bbAngle += PI / 6;
	}
}

function createDecoration(objects, counts, constraint)
{
	log("Creating decoration...");
	constraint = (constraint !== undefined ? constraint : avoidClasses(clForest, 0, clPlayer, 0, clHill, 0));
	for (var i = 0; i < objects.length; ++i)
	{
		var group = new SimpleGroup(
			objects[i],
			true
		);
		createObjectGroupsDeprecated(
			group, 0,
			constraint,
			counts[i], 5
		);
	}
}

function createFood(objects, counts, constraint, tileclass)
{
	log("Creating food...");
	constraint = (constraint !== undefined ? constraint : avoidClasses(clForest, 0, clPlayer, 20, clHill, 1, clFood, 20));
	tileclass = (tileclass !== undefined ? tileclass : clFood);
	for (var i = 0; i < objects.length; ++i)
	{
		var group = new SimpleGroup(
			objects[i],
			true, tileclass
		);
		createObjectGroupsDeprecated(
			group, 0,
			constraint,
			counts[i], 50
		);
	}
}

function createStragglerTrees(types, constraint, tileclass)
{
	log("Creating straggler trees...");

	constraint = constraint !== undefined ?
		constraint :
		avoidClasses(clForest, 8, clHill, 1, clPlayer, 12, clMetal, 6, clRock, 6);

	tileclass = tileclass !== undefined ? tileclass : clForest;

	let num = Math.floor(g_numStragglerTrees / types.length);
	for (let type of types)
		createObjectGroupsDeprecated(
			new SimpleGroup([new SimpleObject(type, 1, 1, 0, 3)], true, tileclass),
			0,
			constraint,
			num);
}
