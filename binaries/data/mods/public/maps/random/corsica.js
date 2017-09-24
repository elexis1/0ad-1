RMS.LoadLibrary("rmgen");

var tGrass = ["medit_grass_field", "medit_grass_field_b", "temp_grass_c"];
var tDune = ["medit_grass_field_brown"];
var tBigDune = ["medit_grass_field_brown"];
var tGrassPForest = "forestfloor_dirty";
var tForestFloor = "medit_grass_shrubs";
var tGrassA = ["desert_dirt_persia_1", "desert_dirt_persia_2"];
var tGrassB = "dirta";
var tLushGrass = ["medit_grass_field","medit_grass_field_a"];

var tSteepCliffs = ["temp_cliff_b", "temp_cliff_a"];
var tCliffs = ["temp_cliff_b", "medit_cliff_italia", "medit_cliff_italia_grass"];
var tHill = ["medit_cliff_italia_grass","medit_cliff_italia_grass", "medit_grass_field", "medit_grass_field", "temp_grass"];
var tMountain = ["medit_cliff_italia_grass","medit_cliff_italia"];
var tMountainTop = ["medit_cliff_italia"];

var tDirt = ["medit_dirt", "medit_dirt_b"];
var tRoad = ["medit_city_tile","medit_rocks_grass","medit_grass_field_b"];
var tRoadWild = ["medit_rocks_grass","medit_grass_field_b"];
var tGrassPatch = "medit_dirt_b";

var tShoreBlend = ["medit_sand_wet","medit_rocks_wet"];
var tShore = ["medit_rocks","medit_sand","medit_sand"];
var tSandTransition = ["medit_sand","medit_rocks_grass","medit_rocks_grass","medit_rocks_grass"];
var tVeryDeepWater = ["medit_sea_depths","medit_sea_coral_deep"];
var tDeepWater = ["medit_sea_coral_deep","tropic_ocean_coral"];
var tCreekWater = "medit_sea_coral_plants";

var ePine = "gaia/flora_tree_aleppo_pine";
var ePalmTall = "gaia/flora_tree_cretan_date_palm_tall";
var eFanPalm = "gaia/flora_tree_medit_fan_palm";
var eApple = "gaia/flora_tree_apple";
var eBush = "gaia/flora_bush_berry";
var eFish = "gaia/fauna_fish";
var ePig = "gaia/fauna_pig";
var eStoneMine = "gaia/geology_stonemine_medit_quarry";
var eMetalMine = "gaia/geology_metal_mediterranean_slabs";

var aFlower1 = "actor|props/flora/decals_flowers_daisies.xml";
var aWaterFlower = "actor|props/flora/water_lillies.xml";
var aReedsA = "actor|props/flora/reeds_pond_lush_a.xml";
var aReedsB = "actor|props/flora/reeds_pond_lush_b.xml";
var aRock = "actor|geology/stone_granite_med.xml";
var aLargeRock = "actor|geology/stone_granite_large.xml";
var aBushA = "actor|props/flora/bush_medit_sm_lush.xml";
var aBushB = "actor|props/flora/bush_medit_me_lush.xml";
var aPlantA = "actor|props/flora/plant_medit_artichoke.xml";
var aPlantB = "actor|props/flora/grass_tufts_a.xml";
var aPlantC = "actor|props/flora/grass_soft_tuft_a.xml";
var aShorePlantA = "actor|props/flora/reeds_beach.xml";
var aShorePlantB = "actor|props/flora/grass_temp_field_brown.xml";

var aStandingStone = "actor|props/special/eyecandy/standing_stones.xml";

var tForestNicae = [tForestFloor + TERRAIN_SEPARATOR + ePine,tForestFloor + TERRAIN_SEPARATOR + ePine,tForestFloor + TERRAIN_SEPARATOR + ePine,tForestFloor + TERRAIN_SEPARATOR + ePine,tForestFloor + TERRAIN_SEPARATOR + eFanPalm, tForestFloor + TERRAIN_SEPARATOR + ePalmTall, tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor];
var tForestNicaeLight = [tForestFloor + TERRAIN_SEPARATOR + ePine,tForestFloor + TERRAIN_SEPARATOR + ePine,tForestFloor + TERRAIN_SEPARATOR + eFanPalm, tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor];
var tForestNicaeScarce = [tForestFloor + TERRAIN_SEPARATOR + ePine,tForestFloor + TERRAIN_SEPARATOR + ePine,tForestFloor + TERRAIN_SEPARATOR + eFanPalm, tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor,tForestFloor];

InitMap();

var numPlayers = getNumPlayers();
var mapSize = getMapSize();
var mapArea = mapSize*mapSize;

var clIsland = createTileClass();
var clCreek = createTileClass();

var clWater = createTileClass();

var clCliffs = createTileClass();
var clForest = createTileClass();
var clPeak = createTileClass();

var clShore = createTileClass();
var clPathToShore = createTileClass();
var clPlayer = createTileClass();
var clBaseResource = createTileClass();
var clPassage = createTileClass();
var clHill = createTileClass();
var clWater = createTileClass();
var clDirt = createTileClass();
var clRock = createTileClass();
var clMetal = createTileClass();
var clFood = createTileClass();
var clSettlement = createTileClass();
var clDune = createTileClass();

initTerrain(tVeryDeepWater);

var swap = randBool();

var nbCreeks = scaleByMapSize(6, 15);
var nbSubIsland = 5;
var nbBeaches = scaleByMapSize(2, 5);
var beachSmallRadius = fractionToTiles(0.45);
var beachBigRadius = fractionToTiles(0.57);
var nbPassagesIsland = scaleByMapSize(1, 4);

log("Creating Corsica and Sardinia");
var CorsicaX = fractionToTiles(0.99);
var SardiniaX = fractionToTiles(0.01);
if (swap)
	[CorsicaX, SardiniaX] = [SardiniaX, CorsicaX];

var islandX = [SardiniaX, CorsicaX];
var islandZ = [fractionToTiles(0.1), fractionToTiles(0.9)];

for (let island = 0; island < 2; ++island)
{
	log("Creating island area...");
	createArea(
		new ClumpPlacer(fractionToSize(0.3) * 1.8, 1.0, 0.5, 10, Math.round(islandX[island]), Math.round(islandZ[island])),
		[
			new LayeredPainter([tCliffs, tGrass], [2]),
			paintClass(clIsland),
			new SmoothElevationPainter(ELEVATION_SET, 5,0)
		],
		null);

	log("Creating subislands...");
	for (let i = 0; i < nbSubIsland + 1; ++i)
	{
		let angle = Math.PI * (island - i / (nbSubIsland * 2));
		if (!swap)
			angle *= -1;

		createArea(
			new ClumpPlacer(
				fractionToSize(0.05) / 2,
				0.6,
				0.03,
				10,
				Math.round(islandX[island] + Math.sqrt(fractionToSize(0.3) * 0.55) * Math.sin(angle)),
				Math.round(islandZ[island] + Math.sqrt(fractionToSize(0.3) * 0.55) * Math.cos(angle))),
			[
				new LayeredPainter([tCliffs, tGrass], [2]),
				paintClass(clIsland),
	            new SmoothElevationPainter(ELEVATION_SET, 5,1)
			],
			null);
	}

	log("Creating Creeks");
	for (let i = 0; i < nbCreeks + 1; ++i)
	{
		let radius = fractionToTiles(randFloat(0.49, 0.55));
		let angle = Math.PI * (island + i * (1 / (nbCreeks * 2)));
		if (swap)
			angle += PI/2;

		createArea(
			new ClumpPlacer(
				randBool() ? randFloat(10, 50) : scaleByMapSize(75, 100) + randFloat(0, 20),
				0.4,
				0.01,
				10,
				Math.round(islandX[island] + radius * Math.cos(angle)),
				Math.round(islandZ[island] + radius * Math.sin(angle))),
			[
				new TerrainPainter(tSteepCliffs),
				paintClass(clCreek),
				new SmoothElevationPainter(ELEVATION_SET, -5, 0)
			],
			null);
	}

	log("Creating beaches...");
	for (let i = 0; i < nbBeaches + 1; ++i)
	{
		let angle = Math.PI * (island + (i / (nbBeaches * 2.5)) + 1 / (nbBeaches * 6) + randFloat(-1, 1) / (nbBeaches * 7));
		if (swap)
			angle += Math.PI / 2;

		let startX = Math.round(islandX[island] + beachSmallRadius * Math.cos(angle));
		let startZ = Math.round(islandZ[island] + beachSmallRadius * Math.sin(angle));

		let endX = Math.round(islandX[island] + beachBigRadius * Math.cos(angle));
		let endZ = Math.round(islandZ[island] + beachBigRadius * Math.sin(angle));

		createArea(
			new ClumpPlacer(130, 0.7, 0.8, 10, Math.round((startX + endX * 3) / 4), Math.round((startZ + endZ * 3) / 4)),
			[new SmoothElevationPainter(ELEVATION_SET, -1, 5)],
			null);

		straightPassageMaker(
			Math.max(0, Math.min(startX, mapSize)),
			Math.max(0, Math.min(startZ, mapSize)),
			Math.max(0, Math.min(endX, mapSize)),
			Math.max(0, Math.min(endZ, mapSize)),
			25,
			18,
			4,
			clShore,
			null);
	}

	log("Creating Main Relief");
	createArea(
		new ClumpPlacer(
			fractionToSize(0.3) * 1.8,
			1,
			0.2,
			4,
			Math.round((islandX[island] * 5 + fractionToTiles(0.5)) / 6.0),
			Math.round(fractionToTiles(island ? 0.8 : 0.2))),
		[new SmoothElevationPainter(ELEVATION_MODIFY, 30, fractionToTiles(0.45))],
		null);
}

RMS.SetProgress(30);

log("Determine players per island...");
var island = 0;
var formerTeam = getPlayerTeam(0);
var onIsland = [[], []];

for (let o = 0; o < numPlayers; ++o)
{
	if (getPlayerTeam(o) === formerTeam && formerTeam !== -1)
	{
		// same island
		if (island === 0)
			onIsland[1].push(o);
		else
			onIsland[0].push(o);
	}
	else if (getPlayerTeam(o) !== -1)
	{
		if (island === 0)
		{
			island = 1;
			onIsland[0].push(o);
		}
		else
		{
			island = 0;
			onIsland[1].push(o);
		}
	}
	else
	{
		// Now the less crowded:
		if (onIsland[1].length > onIsland[0].length)
			onIsland[0].push(o);
		else
			onIsland[1].push(o);
	}
	formerTeam = getPlayerTeam(o);
}

// Determine player locations
var fx = [];
var fz = [];
var playerAngle = [];
for (let island = 0; island < 2; ++island)
{
	let pi = onIsland[island];

	for (let i = 0; i < pi.length; ++i)
	{
		let angle = Math.PI * (i / (2 * pi.length) + 1 / (4 * pi.length) + island);
		if (swap)
			angle += Math.PI / 2;

		let p = pi[i];
		playerAngle[p] = angle;
		fx[p] = Math.round(islandX[island] + fractionToTiles(0.36 * Math.cos(angle)));
		fz[p] = Math.round(fractionToTiles(island + 0.36 * Math.sin(angle)));
	}
}

placeDefaultPlayerBases({
	"playerPlacement": [sortAllPlayers(), fx.map(f => tilesToFraction(f)), fz.map(f => tilesToFraction(f))],
	// playerTileClass set below
	"baseResourceClass": clBaseResource,
	//iberWall': false TODO
	"chicken": {
	},
	"berries": {
		"template": eBush
	},
	"metal": {
		"template": eMetalMine
	},
	"stone": {
		"template": eStoneMine
	}
	// trees below
	// no decoratives
});

var radius = 23;

for (let i = 0; i < numPlayers; ++i)
{
	// let's create a nice platform
	createArea(
		new ClumpPlacer(Math.PI * Math.pow(radius, 2), 0.95, 0.3, 10, fx[i], fz[i]),
		[paintClass(clPlayer)],
		null);

	// create the city patch
	var cityRadius = radius/4;
	var placer = new ClumpPlacer(PI*cityRadius*cityRadius, 0.8, 0.3, 10, fx[i], fz[i]);
	var painter = new LayeredPainter([tRoadWild,tRoad],[1]);
	var elevationPainter = new SmoothElevationPainter(ELEVATION_SET, getHeight(fx[i], fz[i]),10);
	createArea(placer, [painter,paintClass(clSettlement),elevationPainter], null);

	// Starting trees
	createObjectGroupsDeprecated(
		new SimpleGroup(
			[
				new SimpleObject(ePine, 1, 3, 1, 4),
				new SimpleObject(ePalmTall, 0, 1, 1, 4),
				new SimpleObject(eFanPalm, 0, 1, 0, 2)
			],
			true,
			clForest),
		0,
		[
			avoidClasses(
				clBaseResource, 4,
				clSettlement,0),
			stayClasses(clPlayer,1)
		],
		150,
		1000);
}
RMS.SetProgress(40);

log("Creating Corsica and Sardinia...");
for (let island = 0; island < 2; ++island)
{
	let x = Math.round((islandX[island] * 5 + fractionToTiles(0.5)) / 6.0);
	let z = Math.round(islandZ[island]);

	log("Creating first level plateau");
	createArea(
		new ClumpPlacer(fractionToSize(0.18) * 1.8, 0.95, 0.02, 4, x, z),
		[new SmoothElevationPainter(ELEVATION_MODIFY, 9, 1)],
		null);

	if (mapSize > 150)
	{
		log("Creating second level plateau");
		createArea(
			new ClumpPlacer(fractionToSize(0.1), 0.98, 0.04, 4, x, z),
			[
				new LayeredPainter([tCliffs, tGrass], [2]),
				new SmoothElevationPainter(ELEVATION_MODIFY, 8, 1)
			],
			null);

		log("Creating passages towards the island...");
		for (let i = 0; i < nbPassagesIsland; ++i)
		{
			let radius = Math.sqrt(fractionToSize(0.1) / Math.PI) + 2; //TODO +2!??!?
			let angle = Math.PI * (i / (2 * nbPassagesIsland) + 1 / (4 * nbPassagesIsland) + island);
			if (swap)
				angle += Math.PI / 2;

			straightPassageMaker(
				Math.round(x + (radius + 5) * Math.cos(angle)),
				Math.round(z + (radius + 5) * Math.sin(angle)),
				Math.round(x + (radius - 4) * Math.cos(angle)),
				Math.round(z + (radius - 4) * Math.sin(angle)),
				1,
				6,
				2,
				clPassage,
				tGrass);
		}
	}

	log("Creating passages...");
	for (let i = 0; i <= 3; ++i)
	{
		let radius = Math.sqrt(fractionToSize(0.18) * 1.8 / Math.PI) + 2;
		let angle = Math.PI * (i / 7 + 1 / 9 + island);
		if (swap)
			angle += Math.PI / 2;

		straightPassageMaker(
			Math.round(x + (radius + 7) * Math.cos(angle)),
			Math.round(z + (radius + 7) * Math.sin(angle)),
			Math.round(x + (radius - 5) * Math.cos(angle)),
			Math.round(z + (radius - 5) * Math.sin(angle)),
			4,
			10,
			3,
			clPassage,
			tGrass);
	}
}
RMS.SetProgress(50);

log("Creating bumps");
createAreas(
	new ClumpPlacer(70, 0.6, 0.1, 4),
	[new SmoothElevationPainter(ELEVATION_MODIFY, 2,3)],
	[avoidClasses(clPlayer, 2, clPassage, 2), stayClasses(clIsland, 2)],
	2 * scaleByMapSize(20, 100), 5);

log("Creating anti bumps");
createAreas(
	new ClumpPlacer(120, 0.3, 0.1, 4),
	[new SmoothElevationPainter(ELEVATION_MODIFY, -5, 6)],
	[avoidClasses(clPlayer, 2, clPassage, 2, clIsland, 2, clIsland, 2)],
	scaleByMapSize(20,100),
	5);

log("Repainting");
var terrTop = createTerrain(tMountainTop);
var terrMount = createTerrain(tMountain);
var terrHill = createTerrain(tHill);
var terrCliff = createTerrain(tCliffs);
var terrSteepCliff = createTerrain(tSteepCliffs);
var terrGrass = createTerrain(tGrass);

var terrShallow = createTerrain(tCreekWater);
var terrDeep = createTerrain(tDeepWater);
var terrDark = createTerrain(tVeryDeepWater);
var terrSand = createTerrain(tShore);
var terrWetSand = createTerrain(tShoreBlend);
var terrSandTransition = createTerrain(tSandTransition);

// Mark water
for (let sandx = 0; sandx < mapSize; ++sandx)
	for (let sandz = 0; sandz < mapSize; ++sandz)
		if (getHeight(sandx, sandz) < 0)
			addToClass(sandx, sandz, clWater);

// Mark land
for (let sandx = 0; sandx < mapSize; ++sandx)
	for (let sandz = 0; sandz < mapSize; ++sandz)
	{
		if (getTileClass(clSettlement).countMembersInRadius(sandx, sandz, 2))
			continue;

		var height = getHeight(sandx,sandz);
		var heightDiff = getHeightDiff(sandx,sandz);
		if (height >= 0.5 && height < 1.5 /*&& getTileClass(clWater).countMembersInRadius(sandx,sandz,3) > 0 */ && getTileClass(clShore).countMembersInRadius(sandx,sandz,2) > 0)
		{
			terrSandTransition.place(sandx,sandz);
		}
		else if (height >= 1 && getTileClass(clWater).countMembersInRadius(sandx,sandz,3) == 0)
		{
			// paint hills or cliffs depending on terrain elevation difference
			if (height > 17 && getTileClass(clPassage).countMembersInRadius(sandx,sandz,2) == 0)
			{
				if (heightDiff < 5)
					terrHill.place(sandx,sandz);
				else if(heightDiff < 10)
					terrMount.place(sandx,sandz);
			} else
				terrGrass.place(sandx,sandz);

			if (height > 25 && heightDiff >= 10 && getTileClass(clPassage).countMembersInRadius(sandx,sandz,2) == 0)
			{
				terrSteepCliff.place(sandx,sandz);
				addToClass(sandx,sandz,clCliffs);
			}
			else if(heightDiff >= 10 && getTileClass(clPassage).countMembersInRadius(sandx,sandz,2) == 0)
			{
				terrCliff.place(sandx,sandz);
				addToClass(sandx,sandz,clCliffs);
			}
		}
		else
		{
			if (height >= 0 && heightDiff >= 9)
			{
				terrCliff.place(sandx,sandz);
				addToClass(sandx,sandz,clCliffs);
			}
			else if (height >= -0.75 && height < 1.5 && heightDiff < 9)
					terrSand.place(sandx,sandz);
			else if (height >= -3  && height < -0.75 && heightDiff < 9)
				terrWetSand.place(sandx,sandz);
			else if (height >= -6  && height < -3 && heightDiff < 9)
				terrShallow.place(sandx,sandz);
			else if (height > -10  && height < -6 && heightDiff < 6)
				terrDeep.place(sandx,sandz);

			if (heightDiff >= 9)
			{
				terrCliff.place(sandx,sandz);
				addToClass(sandx,sandz,clCliffs);
			}
		}
	}

RMS.SetProgress(65);

log("Creating stone mines...");
var group = new SimpleGroup([new SimpleObject(eStoneMine, 1,1, 0,0),new SimpleObject(aBushB, 1,1, 2,2), new SimpleObject(aBushA, 0,2, 1,3)], true, clBaseResource);
createObjectGroupsDeprecated(group, 0,[stayClasses(clIsland, 1),avoidClasses(clWater, 3, clPlayer,2 , clBaseResource, 2,clCliffs,1)], scaleByMapSize(6,25), 1000);

log("Creating metal mines...");
group = new SimpleGroup([new SimpleObject(eMetalMine, 1,1, 0,0),new SimpleObject(aBushB, 1,1, 2,2), new SimpleObject(aBushA, 0,2, 1,3)], true, clBaseResource);
createObjectGroupsDeprecated(group, 0,[avoidClasses(clWater, 3, clPlayer, 2, clBaseResource, 2, clCliffs,1), stayClasses(clIsland, 1)], scaleByMapSize(6,25), 1000);

log("Creating grass patches...");
placer = new ClumpPlacer(20, 0.3, 0.06, 0.5);
painter = new TerrainPainter(tLushGrass);
createAreas( placer, [painter,paintClass(clForest)], avoidClasses(clWater, 1,clPlayer, 0,clBaseResource, 3,clCliffs,1), scaleByMapSize(10, 40) );

log("Creating forests...");
var TreeGroup = new SimpleGroup([new SimpleObject(ePine, 3,6, 1,3),new SimpleObject(ePalmTall, 1,3, 1,3),new SimpleObject(eFanPalm, 0,2, 0,2),new SimpleObject(eApple, 0,1, 1,2)], true, clForest);
createObjectGroupsDeprecated(TreeGroup, 0, [avoidClasses(clWater, 1, clForest, 0,clPlayer, 0,clBaseResource, 2,clCliffs,2), stayClasses(clIsland, 3)],  scaleByMapSize(350,2500), 100 );

RMS.SetProgress(75);

log("Creating small decorative rocks...");
group = new SimpleGroup( [new SimpleObject(aRock, 1,3, 0,1),new SimpleObject(aStandingStone, 0,2, 0,3)], true );
createObjectGroupsDeprecated( group, 0, avoidClasses(clWater, 0, clForest, 0, clPlayer, 0,clBaseResource, 0, clPassage, 2),
	scaleByMapSize(16, 262), 50
);

log("Creating large decorative rocks...");
group = new SimpleGroup( [new SimpleObject(aLargeRock, 1,2, 0,1), new SimpleObject(aRock, 1,3, 0,2)], true
);
createObjectGroupsDeprecated( group, 0, avoidClasses(clWater, 0, clForest, 0, clPlayer, 0,clBaseResource, 0, clPassage, 2),
	scaleByMapSize(8, 131), 50
);
createObjectGroupsDeprecated( group, 0, borderClasses(clWater, 5,10), scaleByMapSize(100,800), 500);

log("Creating beautification...");
group = new SimpleGroup( [new SimpleObject(aPlantA, 3,7, 0,3),new SimpleObject(aPlantB, 3,6, 0,3),new SimpleObject(aPlantC, 1,4, 0,4)], true );
createObjectGroupsDeprecated( group, 0, avoidClasses(clWater, 0,clBaseResource, 0, clShore,3), scaleByMapSize(100, 600), 50  );
group = new SimpleGroup( [new SimpleObject(aPlantB, 5,20, 0,5),new SimpleObject(aPlantC, 4,10, 0,4)], true );
createObjectGroupsDeprecated( group, 0, avoidClasses(clWater, 0,clBaseResource, 0, clShore,3), scaleByMapSize(100, 600), 50  );

RMS.SetProgress(80);

log("Creating animals...");
group = new SimpleGroup( [new SimpleObject(ePig, 2,4, 0,3)] );
createObjectGroupsDeprecated( group, 0, avoidClasses(clWater, 3,clBaseResource, 0), scaleByMapSize(20, 100), 50  );

group = new SimpleGroup( [new SimpleObject(eFish, 1,2, 0,3)] );
createObjectGroupsDeprecated( group, 0, [avoidClasses(clCreek,3,clShore,3),stayClasses(clWater, 3)], scaleByMapSize(50, 150), 100  );

RMS.SetProgress(95);

setSkySet(pickRandom(["cumulus", "sunny"]));

setSunColor(0.8,0.66,0.48);
setSunElevation(0.828932);
if (!swap)
	setSunRotation(6.3*PI/8);
else
	setSunRotation(2.3*PI/8);
setTerrainAmbientColor(0.564706,0.543726,0.419608);
setUnitsAmbientColor(0.53,0.55,0.45);
setWaterColor(0.2,0.294,0.49);
setWaterTint(0.208, 0.659, 0.925);
setWaterMurkiness(0.72);
setWaterWaviness(2.0);
setWaterType("ocean");
ExportMap();

// this function will go from point [x1,z1] to point [x2,z2], while following a curve of width (starting-center-starting)
// it can smooth on the side depending on "smooth", which is the distance of the smooth. Tileclass and Terrain set a tileclass/terrain
// it effectively can create a smooth path from point [x1,z1] to point [x2,z2], ie Canyon, whatever.
// note: NOT efficient for large distances: I'm widely oversampling
function straightPassageMaker(x1, z1, x2, z2, startWidth, centerWidth, smooth, tileclass, terrain)
{
	var mapSize = g_Map.size;
	var stepNB = sqrt((x2-x1)*(x2-x1) + (z2-z1)*(z2-z1)) + 2;

	var startHeight = getHeight(x1,z1);
	var finishHeight = getHeight(x2,z2);
	for (var step = 0; step <= stepNB; step+=0.5)
	{
		var ix = ((stepNB-step)*x1 + x2*step) / stepNB;
		var iz = ((stepNB-step)*z1 + z2*step) / stepNB;

		// 5 at star/end, and 0 at the center
		var width = (abs(step - stepNB/2.0) *startWidth + (stepNB/2 - abs(step - stepNB/2.0)) * centerWidth ) / (stepNB/2);
		var oldDirection = [x2-x1, z2-z1];

		// let's get the perpendicular direction
		var direction = [ -oldDirection[1],oldDirection[0] ];

		if (abs(direction[0]) > abs(direction[1]))
		{
			direction[1] = direction[1] / abs(direction[0]);
			if (direction[0] > 0)
				direction[0] = 1;
			else
				direction[0] = -1;
		}
		else
		{
			direction[0] = direction[0] / abs(direction[1]);
			if (direction[1] > 0)
				direction[1] = 1;
			else
				direction[1] = -1;
		}

		for (var po = -Math.floor(width/2.0); po <= Math.floor(width/2.0); po+=0.5)
		{
			var rx = po*direction[0];
			var rz = po*direction[1];

			var relativeWidth = abs(po / Math.floor(width/2));
			var targetHeight = ((stepNB-step)*startHeight + finishHeight*step) / stepNB;

			if (round(ix + rx) < mapSize && round(iz + rz) < mapSize && round(ix + rx) >= 0 && round(iz + rz) >= 0)
			{
				// smoothing the sides
				if ( abs(abs(po) - abs(Math.floor(width/2.0))) < smooth)
				{
					var localHeight = getHeight(round(ix + rx), round(iz + rz));
					var localPart = smooth - abs(abs(po) - abs(Math.floor(width/2.0)));
					var targetHeight = (localHeight * localPart + targetHeight * (1/localPart) )/ (localPart + 1/localPart);
				}

				g_Map.setHeight(round(ix + rx), round(iz + rz), targetHeight);

				if (tileclass !== null)
					addToClass(round(ix + rx), round(iz + rz), tileclass);

				if (terrain !== null)
					placeTerrain(round(ix + rx), round(iz + rz), terrain);
			}
		}
	}
}

// no need for preliminary rounding
function getHeightDiff(x1, z1)
{
	var height = getHeight(round(x1),round(z1));
	var diff = 0;
	if (z1 + 1 < mapSize)
		diff += abs(getHeight(round(x1),round(z1+1)) - height);
	if (x1 + 1 < mapSize && z1 + 1 < mapSize)
		diff += abs(getHeight(round(x1+1),round(z1+1)) - height);
	if (x1 + 1 < mapSize)
		diff += abs(getHeight(round(x1+1),round(z1)) - height);
	if (x1 + 1 < mapSize && z1 - 1 >= 0)
		diff += abs(getHeight(round(x1+1),round(z1-1)) - height);
	if (z1 - 1 >= 0)
		diff += abs(getHeight(round(x1),round(z1-1)) - height);
	if (x1 - 1 >= 0 && z1 - 1 >= 0)
		diff += abs(getHeight(round(x1-1),round(z1-1)) - height);
	if (x1 - 1 >= 0)
		diff += abs(getHeight(round(x1-1),round(z1)) - height);
	if (x1 - 1 >= 0 && z1 + 1 < mapSize)
		diff += abs(getHeight(round(x1-1),round(z1+1)) - height);
	return diff;
}

function hasTextureInRadius(x1, z1,radius, textureName)
{
	for (let xx = x1 - radius; xx <= x1 + radius; ++xx)
		for (let zz = z1 - radius; zz <= z1 + radius; ++zz)
		{
			if (xx == x1 && zz == z1 ||
			    xx < 0 || xx >= mapSize ||
			    zz < 0 || zz >= mapSize)
				continue;

			if (typeof(textureName) != "number")
				for (var i in textureName)
					if (g_Map.getTexture(xx, zz) == textureName[i])
						return true;
			else if (g_Map.getTexture(xx, zz) == textureName)
				return true;
		}
	return false;
}
