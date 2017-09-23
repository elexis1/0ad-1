function unknownEdgeSeas(civicCenter = true, landHeight = 3, waterHeight = -4)
{
	for (let ix = 0; ix < mapSize; ++ix)
		for (let iz = 0; iz < mapSize; ++iz)
			setHeight(ix, iz, landHeight);

	let playerX = [];
	let playerZ = [];
	let horizontal = randBool();

	if (civicCenter)
		for (let i = 0; i < numPlayers; i++)
		{
			let playerPos1 = (i + 1) / (numPlayers + 1);
			let playerPos2 = 0.4 + 0.2 * (i % 2);

			playerX[i] = horizontal ? playerPos1 : playerPos2;
			playerZ[i] = horizontal ? playerPos2 : playerPos1;
	
			addCivicCenterAreaToClass(
				Math.round(fractionToTiles(playerX[i])),
				Math.round(fractionToTiles(playerZ[i])),
				clPlayer);
		}

	for (let location of pickRandom([["first"], ["second"], ["first", "second"]]))
		paintRiver({
			"horizontal": horizontal,
			"parallel": false,
			"position": (location == "first" ? 0 : 1) + (location == "first" ? +1 : -1) * randFloat(0, scaleByMapSize(0, 0.1)),
			"width": 0.61,
			"fadeDist": 0.015,
			"deviation": 0,
			"waterHeight": waterHeight,
			"landHeight": landHeight,
			"meanderShort": 0,
			"meanderLong": 0,
			"waterFunc": (ix, iz, height) => {
				placeTerrain(ix, iz, height < -1.5 ? tWater : tShore);
				addToClass(ix, iz, clWater);
			},
			"landFunc": (ix, iz, shoreDist1, shoreDist2) => {
				if (getHeight(ix, iz) < 0.5)
					addToClass(ix, iz, clWater);
			}
		});

	log("Creating shore jaggedness inwards...");
	createAreas(
		new ChainPlacer(2, Math.floor(scaleByMapSize(4, 6)), 3, 1),
		[
			new LayeredPainter([tCliff, tHill], [2]),
			new SmoothElevationPainter(ELEVATION_SET, waterHeight, 4),
			paintClass(clWater)
		],
		[avoidClasses(clPlayer, 20), borderClasses(clWater, 6, 4)],
		scaleByMapSize(7, 130) * 2,
		150);

	log("Creating shore jaggedness outwards...");
	createAreas(
		new ChainPlacer(2, Math.floor(scaleByMapSize(4, 6)), 3, 1),
		[
			new LayeredPainter([tCliff, tHill], [2]),
			new SmoothElevationPainter(ELEVATION_SET, landHeight, 4),
			unPaintClass(clWater)
		],
		borderClasses(clWater, 4, 7),
		scaleByMapSize(12, 130) * 2,
		150);

	if (randBool())
	{
		log("Creating extentions...");
		createAreas(
			new ChainPlacer(floor(scaleByMapSize(4, 7)), floor(scaleByMapSize(7, 10)), floor(scaleByMapSize(16, 40)), 0.07),
			[
				new LayeredPainter([tMainTerrain, tMainTerrain], [2]),
				new SmoothElevationPainter(ELEVATION_SET, landHeight, 4),
				paintClass(clLand)
			],
			null,
			scaleByMapSize(2, 5) * randIntInclusive(8,14)
		);
	}

	return [sortAllPlayers(), playerX, playerZ];
}
