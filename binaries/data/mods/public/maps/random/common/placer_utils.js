var g_numStragglerTrees = 0;

function createForests(terrainset, constraint, tileclass, numMultiplier = 1, minTrees = 500, maxTrees = 3000, forestProbability = 0.7)
{
	log("Creating forests...");

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

function createMines(mines, constraint, tileclass, count)
{
	for (let mine of mines)
		createObjectGroupsDeprecated(
			new SimpleGroup(mine, true, tileclass),
			0,
			constraint,
			count || scaleByMapSize(4,16),
			70);
}

/**
 * Places 8 stone mines in a small circular shape.
 */
function createStoneMineFormation(x, z, template, terrain)
{
	createArea(
		new ChainPlacer(1, 2, 2, 1, x, z, undefined, [5]),
		new TerrainPainter(tileclass),
		null);

	let angle = randFloat(0, 2 * Math.PI);
	let dist = 2.5;

	for (let i = 0; i < 8; ++i)
	{
		placeObject(
			Math.round(x + randFloat(dist, dist + 1) * Math.cos(angle)),
			Math.round(z + randFloat(dist, dist + 1) * Math.sin(angle)),
			template,
			0,
			randFloat(0, 2 * Math.PI));
		angle += Math.PI / 6;
	}
}

function createDecoration(objects, counts, constraint)
{
	log("Creating decoration...");
	for (let i = 0; i < objects.length; ++i)
		createObjectGroupsDeprecated(
			new SimpleGroup(objects[i], true),
			0,
			constraint,
			counts[i],
			5);
}

function createFood(objects, counts, constraint, tileclass)
{
	log("Creating food...");
	for (let i = 0; i < objects.length; ++i)
		createObjectGroupsDeprecated(
			new SimpleGroup(objects[i], true, tileclass),
			0,
			constraint,
			counts[i],
			50);
}

function createStragglerTrees(types, constraint, tileclass)
{
	log("Creating straggler trees...");
	let num = Math.floor(g_numStragglerTrees / types.length);
	for (let type of types)
		createObjectGroupsDeprecated(
			new SimpleGroup([new SimpleObject(type, 1, 1, 0, 3)], true, tileclass),
			0,
			constraint,
			num);
}
