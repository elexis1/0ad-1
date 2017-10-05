function createBumps(constraint, count, minsize, maxsize, spread, failfraction, elevation)
{
	log("Creating bumps...");
	createAreas(
		new ChainPlacer(
			minsize || 1,
			maxsize || Math.floor(scaleByMapSize(4, 6)),
			spread || Math.floor(scaleByMapSize(2, 5)),
			failfraction || 0),
		new SmoothElevationPainter(ELEVATION_MODIFY, elevation !== undefined ? elevation : 2, 2),
		constraint,
		count || scaleByMapSize(100, 200));
}

function createHills(terrainset, constraint, tileclass, count, minsize, maxsize, spread, failfraction, elevation, elevationsmooth)
{
	log("Creating hills...");
	createAreas(
		new ChainPlacer(
			minsize || 1,
			maxsize || Math.floor(scaleByMapSize(4, 6)),
			spread || Math.floor(scaleByMapSize(16, 40)),
			failfraction !== undefined ? failfraction : 0.5),
		[
			new LayeredPainter(terrainset, [1, elevationsmooth || 2]),
			new SmoothElevationPainter(
				ELEVATION_SET,
				(elevation !== undefined ? elevation : 18),
				elevationsmooth || 2),
			paintClass(tileclass)
		],
		constraint,
		count || scaleByMapSize(1, 4) * getNumPlayers());
}

function createMountains(terrain, constraint, tileclass, count, maxHeight, minRadius, maxRadius, numCircles)
{
	log("Creating mountains...");
	let mapSize = getMapSize();

	for (let i = 0; i < (count || scaleByMapSize(1, 4) * getNumPlayers()); ++i)
		createMountain(
			maxHeight !== undefined ? maxHeight : Math.floor(scaleByMapSize(30, 50)),
			minRadius || Math.floor(scaleByMapSize(3, 4)),
			maxRadius || Math.floor(scaleByMapSize(6, 12)),
			numCircles || Math.floor(scaleByMapSize(4, 10)),
			constraint,
			randIntExclusive(0, mapSize),
			randIntExclusive(0, mapSize),
			terrain,
			tileclass,
			14);
}

function createLayeredPatches(sizes, terrainset, twidthset, constraint, count, tileclass, failfraction)
{
	// TODO
	tileclass = (tileclass !== undefined ? tileclass : clDirt);

	for (let size of sizes)
		createAreas(
			new ChainPlacer(1, Math.floor(scaleByMapSize(3, 5)), size, failfraction !== undefined ? failfraction : 0.5),
			[
				new LayeredPainter(terrainset, twidthset),
				paintClass(tileclass)
			],
			constraint,
			count || scaleByMapSize(15, 45));
}

function createPatches(sizes, terrain, constraint, count,  tileclass, failfraction)
{
	tileclass = (tileclass !== undefined ? tileclass : clDirt);

	for (let size of sizes)
		createAreas(
			new ChainPlacer(
				1,
				Math.floor(scaleByMapSize(3, 5)),
				size,
				failfraction !== undefined ? failfraction : 0.5),
			[
				new TerrainPainter(terrain),
				paintClass(tileclass)
			],
			constraint,
			count || scaleByMapSize(15, 45));
}
