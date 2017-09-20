// TODO: iberWall': 'towers

//	Function for creating shallow water between two given points by changing the height of all tiles in
//	the path with height less than or equal to "maxheight" to "height"
//
//	x1,z1: 	Starting point of path
//	x2,z2: 	Ending point of path
//	width: 	Width of the shallow
//	maxheight:		Maximum height that it changes
//	height:		Height of the shallow
//	smooth:		smooth elevation in borders
//	tileclass:		(Optianal) - Adds those tiles to the class given
//	terrain:		(Optional) - Changes the texture of the elevated land
function passageMaker(x1, z1, x2, z2, width, maxheight, height, smooth, tileclass, terrain, riverheight)
{
	var tchm = TILE_CENTERED_HEIGHT_MAP;
	TILE_CENTERED_HEIGHT_MAP = true;
	var mapSize = g_Map.size;

	for (var ix = 0; ix < mapSize; ix++)
		for (var iz = 0; iz < mapSize; iz++)
		{
			var a = z1-z2;
			var b = x2-x1;
			var c = (z1*(x1-x2))-(x1*(z1-z2));
			var dis = abs(a*ix + b*iz + c)/sqrt(a*a + b*b);
			var k = (a*ix + b*iz + c)/(a*a + b*b);
			var my = iz-(b*k);
			var inline = 0;

			if (b == 0)
			{
				dis = abs(ix-x1);
				if ((iz <= Math.max(z1,z2))&&(iz >= Math.min(z1,z2)))
					inline = 1;
			}
			else if ((my <= Math.max(z1,z2))&&(my >= Math.min(z1,z2)))
				inline = 1;

			if (dis <= width && inline && g_Map.getHeight(ix, iz) <= maxheight)
			{
				if (dis > width - smooth)
					g_Map.setHeight(ix, iz, ((width - dis)*(height)+(riverheight)*(smooth - width + dis))/(smooth));
				else if (dis <= width - smooth)
					g_Map.setHeight(ix, iz, height);

				if (tileclass !== undefined)
					addToClass(ix, iz, tileclass);

				if (terrain !== undefined)
					placeTerrain(ix, iz, terrain);
			}
		}

	TILE_CENTERED_HEIGHT_MAP = tchm;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//rndRiver is a fuction that creates random values useful for making a jagged river.
//
//it works the same as sin or cos function. the only difference is that it's period is 1 instead of 2*pi
//it needs the "seed" parameter to use it to make random curves that don't get broken.
//seed must be created using randFloat(). or else it won't work
//
//	f:	Input: Same as angle in a sine function
//	seed:	Random Seed: Best to implement is to use randFloat()
//
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function rndRiver(f, seed)
{
	var rndRq = seed;
	var rndRw = rndRq;
	var rndRe = 0;
	var rndRr = f-floor(f);
	var rndRa = 0;
	for (var rndRx=0; rndRx<=floor(f); rndRx++)
		rndRw = 10*(rndRw-floor(rndRw));

	var rndRs = rndRx % 2 ? 1 : -1;

	rndRe = (floor(rndRw))%5;

	if (rndRe==0)
		rndRa = (rndRs)*2.3*(rndRr)*(rndRr-1)*(rndRr-0.5)*(rndRr-0.5);
	else if (rndRe==1)
		rndRa = (rndRs)*2.6*(rndRr)*(rndRr-1)*(rndRr-0.3)*(rndRr-0.7);
	else if (rndRe==2)
		rndRa = (rndRs)*22*(rndRr)*(rndRr-1)*(rndRr-0.2)*(rndRr-0.3)*(rndRr-0.3)*(rndRr-0.8);
	else if (rndRe==3)
		rndRa = (rndRs)*180*(rndRr)*(rndRr-1)*(rndRr-0.2)*(rndRr-0.2)*(rndRr-0.4)*(rndRr-0.6)*(rndRr-0.6)*(rndRr-0.8);
	else if (rndRe==4)
		rndRa = (rndRs)*2.6*(rndRr)*(rndRr-1)*(rndRr-0.5)*(rndRr-0.7);

	return rndRa;
}

/**
 * Creates a meandering river at the given location and width.
 * Optionally calls a function on the affected tiles.
 *
 * @property horizontal - Whether the river is horizontal or vertical
 * @property parallel - Whether the shorelines should be parallel or meander separately.
 * @property position - Location of the river. Number between 0 and 1.
 * @property width - Size between the two shorelines. Number between 0 and 1.
 * @property fadeDist - Size of the shoreline.
 * @property deviation - Fuzz effect on the shoreline if greater than 0.
 * @property waterHeight - Ground height of the riverbed.
 * @proeprty landHeight - Ground height of the end of the shoreline.
 * @property meanderShort - Strength of frequent meanders.
 * @property meanderLong - Strength of less frequent meanders.
 * @property waterFunc - Optional function called on water tiles, providing ix, iz, height.
 * @property landFunc - Optional function called on land tiles, providing ix, iz, shoreDist1, shoreDist2.
 */
function paintRiver(args)
{
	log("Creating the river");

	let theta1 = randFloat(0, 1);
	let theta2 = randFloat(0, 1);

	let seed1 = randFloat(2, 3);
	let seed2 = randFloat(2, 3);

	let meanderShort = args.meanderShort / scaleByMapSize(35, 160);
	let meanderLong = args.meanderLong / scaleByMapSize(35, 100);

	let mapSize = g_Map.size;

	for (let ix = 0; ix < mapSize; ++ix)
		for (let iz = 0; iz < mapSize; ++iz)
		{
			if (args.constraint && !args.constraint.allows(ix, iz))
				continue;

			let x = ix / (mapSize + 1.0);
			let z = iz / (mapSize + 1.0);

			let coord1 = args.horizontal ? z : x;
			let coord2 = args.horizontal ? x : z;

			// River curve at this place
			let cu1 = meanderShort * rndRiver(theta1 + coord2 * mapSize / 128, seed1);
			let cu2 = meanderShort * rndRiver(theta2 + coord2 * mapSize / 128, seed2);

			cu1 += meanderLong * rndRiver(theta2 + coord2 * mapSize / 256, seed2);
			cu2 += meanderLong * rndRiver(theta2 + coord2 * mapSize / 256, seed2);
			if (args.parallel)
				cu2 = cu1;

			// Fuzz the river border
			let devCoord1 = coord1 * randFloat(1 - args.deviation, 1 + args.deviation);
			let devCoord2 = coord2 * randFloat(1 - args.deviation, 1 + args.deviation);

			let shoreDist1 = -devCoord1 + cu1 + args.position - args.width / 2;
			let shoreDist2 = -devCoord1 + cu2 + args.position + args.width / 2;

			if (shoreDist1 < 0 && shoreDist2 > 0)
			{
				let height = args.waterHeight;

				if (shoreDist1 > -args.fadeDist)
					height += (args.landHeight - args.waterHeight) * (1 + shoreDist1 / args.fadeDist);
				else if (shoreDist2 < args.fadeDist)
					height += (args.landHeight - args.waterHeight) * (1 - shoreDist2 / args.fadeDist);

				setHeight(ix, iz, height);

				if (args.waterFunc)
					args.waterFunc(ix, iz, height);
			}
			else if (args.landFunc)
				args.landFunc(ix, iz, shoreDist1, shoreDist2);
		}
}

/////////////////////////////////////////////////////////////////////////////////////////
// createStartingPlayerEntities
//
//	Creates the starting player entities
//	fx&fz: position of player base
//	playerid: id of player
//	civEntities: use getStartingEntities(id-1) fo this one
//	orientation: orientation of the main base building, default is BUILDING_ORIENTATION
//
///////////////////////////////////////////////////////////////////////////////////////////
function createStartingPlayerEntities(fx, fz, playerid, civEntities, orientation = BUILDING_ORIENTATION)
{
	var uDist = 6;
	var uSpace = 2;
	placeObject(fx, fz, civEntities[0].Template, playerid, orientation);
	for (var j = 1; j < civEntities.length; ++j)
	{
		var uAngle = orientation - PI * (2-j) / 2;
		var count = (civEntities[j].Count !== undefined ? civEntities[j].Count : 1);
		for (var numberofentities = 0; numberofentities < count; numberofentities++)
		{
			var ux = fx + uDist * cos(uAngle) + numberofentities * uSpace * cos(uAngle + PI/2) - (0.75 * uSpace * floor(count / 2) * cos(uAngle + PI/2));
			var uz = fz + uDist * sin(uAngle) + numberofentities * uSpace * sin(uAngle + PI/2) - (0.75 * uSpace * floor(count / 2) * sin(uAngle + PI/2));
			placeObject(ux, uz, civEntities[j].Template, playerid, uAngle);
		}
	}
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// placeCivDefaultEntities
//
//	Creates the default starting player entities depending on the players civ
//	fx&fy: position of player base
//	playerid: id of player
//	kwargs: Takes some optional keyword arguments to tweek things
//		'iberWall': may be false, 'walls' (default) or 'towers'. Determines the defensive structures Iberians get as civ bonus
//		'orientation': angle of the main base building, default is BUILDING_ORIENTATION
//
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function placeCivDefaultEntities(fx, fz, playerid, kwargs = {})
{
	var iberWall = 'walls';

	if (getMapSize() <= 128)
		iberWall = false;

	if ('iberWall' in kwargs)
		iberWall = kwargs.iberWall;

	var orientation = BUILDING_ORIENTATION;
	if ('orientation' in kwargs)
		orientation = kwargs.orientation;

	// Place default civ starting entities
	var civ = getCivCode(playerid-1);
	var civEntities = getStartingEntities(playerid-1);
	var uDist = 6;
	var uSpace = 2;
	placeObject(fx, fz, civEntities[0].Template, playerid, orientation);
	for (var j = 1; j < civEntities.length; ++j)
	{
		var uAngle = orientation - PI * (2-j) / 2;
		var count = (civEntities[j].Count !== undefined ? civEntities[j].Count : 1);
		for (var numberofentities = 0; numberofentities < count; numberofentities++)
		{
			var ux = fx + uDist * cos(uAngle) + numberofentities * uSpace * cos(uAngle + PI/2) - (0.75 * uSpace * floor(count / 2) * cos(uAngle + PI/2));
			var uz = fz + uDist * sin(uAngle) + numberofentities * uSpace * sin(uAngle + PI/2) - (0.75 * uSpace * floor(count / 2) * sin(uAngle + PI/2));
			placeObject(ux, uz, civEntities[j].Template, playerid, uAngle);
		}
	}
	// Add defensive structiures for Iberians as their civ bonus
	if (civ == 'iber' && iberWall != false)
	{
		if (iberWall == 'towers')
			placePolygonalWall(fx, fz, 15, ['entry'], 'tower', civ, playerid, orientation, 7);
		else
			placeGenericFortress(fx, fz, 20/*radius*/, playerid);
	}
}

function placeDefaultPlayerBases(args)
{
	for (let i = 0; i < getNumPlayers(); ++i)
		placeDefaultPlayerBase(args, i);
}

function placeDefaultPlayerBase(args, i)
{
	deepfreeze(args);

	let [playerIDs, playerX, playerZ] = args.playerPlacement;

	log("Creating base for player " + playerIDs[i] + "...");

	let fx = fractionToTiles(playerX[i]);
	let fz = fractionToTiles(playerZ[i]);

	placeCivDefaultEntities(fx, fz, playerIDs[i]);

	if (args.playerTileClass !== undefined)
		addCivicCenterAreaToClass(Math.round(fx), Math.round(fz), args.playerTileClass);

	// With 50% chance place the two mines in proximity
	//let maxAngle = 2 * Math.PI * (randBool() ? 1 : 0.2);
	//let startingAngle;

	// Create the largest objects first
	let defaultBaseFunctions = {
		"cityPatch": placeDefaultCityPatch,
		"trees": placeDefaultTrees,
		"metal": createDefaultMine,
		"stone": createDefaultMine,
		"berries": placeDefaultBerries,
		"chicken": placeDefaultChicken,
		"decoratives": placeDefaultDecoratives
	};

	for (let baseFuncID in defaultBaseFunctions)
	{
		if (!args[baseFuncID])
			continue;

		let args2 = clone(args[baseFuncID]);
		args2.playerID = playerIDs[i];
		args2.playerX = playerX[i];
		args2.playerZ = playerZ[i];
		args2.baseResourceClass = args.baseResourceClass;
		args2.baseResourceConstraint = avoidClasses(args.baseResourceClass, 4);

		defaultBaseFunctions[baseFuncID](args2);
	}
}

function getDefaultPlayerTerritoryRadius()
{
	return scaleByMapSize(15, 25);
}

function getDefaultPlayerTerritoryArea()
{
	return Math.PI * Math.pow(getDefaultPlayerTerritoryRadius(), 2);
}

function getDefaultBaseArgs(args)
{
	return [
		(property, defaultVal) => args[property] === undefined ? defaultVal : args[property],
		fractionToTiles(args.playerX),
		fractionToTiles(args.playerZ)
	];
}

/**
 * @property tileClass - optionally mark the entire city patch with a tile class
 */
function placeDefaultCityPatch(args)
{
	let [get, fx, fz] = getDefaultBaseArgs(args);

	let painters = [
		new LayeredPainter([args.innerTerrain, args.outerTerrain], [1])
	];

	if (args.tileClass !== undefined)
		painters.push(paintClass(args.tileClass));

	createArea(
		new ClumpPlacer(
			Math.floor(get("areaFactor", 1 / 9) * getDefaultPlayerTerritoryArea()),
			get("coherence", 0.6),
			get("smoothness", 0.3),
			get("failFraction", 10),
			Math.round(fx),
			Math.round(fz)),
		painters,
		null);
}

function placeDefaultChicken(args)
{
	let [get, fx, fz] = getDefaultBaseArgs(args);

	for (let j = 0; j < get("count", 2); ++j)
		for (let tries = 0; tries < get("maxTries", 30); ++tries)
		{
			let angle = randFloat(0, 2 * Math.PI);
			if (createObjectGroup(
				new SimpleGroup(
					[new SimpleObject(get("template", "gaia/fauna_chicken"), 5, 5, 0, get("count", 2))],
					true,
					args.baseResourceClass,
					Math.round(fx + get("dist", 9) * Math.cos(angle)),
					Math.round(fz + get("dist", 9) * Math.sin(angle))),
				0,
				args.baseResourceConstraint))
				break;
		}
}

function placeDefaultBerries(args)
{
	let [get, fx, fz] = getDefaultBaseArgs(args);
	for (let tries = 0; tries < get("maxTries", 30); ++tries)
	{
		let angle = randFloat(0, 2 * Math.PI);
		if (createObjectGroup(
			new SimpleGroup(
				[new SimpleObject(
					get("template", "gaia/flora_bush_berry"),
					get("minCount", 5),
					get("maxCount", 5),
					get("maxDist", 1),
					get("maxDist", 3))
				],
				true,
				args.baseResourceClass,
				Math.round(fx + get("dist", 12) * Math.cos(angle)),
				Math.round(fz + get("dist", 12) * Math.sin(angle))),
			0,
			args.baseResourceConstraint))
			return;
	}
}

function createDefaultMine(args)
{
	let [get, fx, fz] = getDefaultBaseArgs(args);
	//args.get("startingAngle", randFloat(0, 2 * Math.PI))
	//args.get("minAngle", Math.PI / 3)
	//args.get("maxAngle", Math.PI * 2)

	//warn(uneval(typeof (args.baseResourceConstraint.allows)));
	for (let tries = 0; tries < get("maxTries", 30); ++tries)
	{
		let angle = randFloat(0, 2 * Math.PI);
		//do
		//	angle = randFloat(0, 2 * Math.PI);
		//while (maxAngle && Math.abs(angle - startingAngle) > maxAngle ||
		//       minAngle && Math.abs(angle - startingAngle) < minAngle)

		if (createObjectGroup(
			new SimpleGroup(
				[new SimpleObject(args.template, 1, 1, 0, 0)],
				true,
				args.baseResourceClass,
				Math.round(fx + get("dist", 12) * Math.cos(angle)),
				Math.round(fz + get("dist", 12) * Math.sin(angle))),
			0,
			args.baseResourceConstraint))
			return;
	}
}

function placeDefaultTrees(args)
{
	let [get, fx, fz] = getDefaultBaseArgs(args);
	let num = Math.floor(get("areaFactor", 1 / 60) * getDefaultPlayerTerritoryArea());

	for (let x = 0; x < get("maxTries", 30); ++x)
	{
		let angle = randFloat(0, 2 * Math.PI);
		let dist = randFloat(get("minDist", 11), get("maxDist", 13));

		if (createObjectGroup(
			new SimpleGroup(
				[new SimpleObject(args.template, num, num, get("minDistGroup", 1), get("maxDistGroup", 3))],
				false,
				args.baseResourceClass,
				Math.round(fx + dist * Math.cos(angle)),
				Math.round(fz + dist * Math.sin(angle))),
			0,
			args.baseResourceConstraint))
			return;
	}
}

/**
 * Typically used for placing grass tufts around the civic centers.
 */
function placeDefaultDecoratives(args)
{
	let [get, fx, fz] = getDefaultBaseArgs(args);
	let radius = getDefaultPlayerTerritoryArea();

	for (let i = 0; i < get("areaFactor", 1 / 250) * radius; ++i)
		for (let x = 0; x < get("maxTries", 30); ++x)
		{
			let angle = randFloat(0, 2 * PI);
			let dist = radius - randIntInclusive(get("maxDist", 5), get("maxDist", 5));

			if (createObjectGroup(
				new SimpleGroup(
					[new SimpleObject(
						args.template,
						get("minCount", 2),
						get("maxCount", 5),
						0,
						1,
						-Math.PI/8,
						Math.PI/8)
					],
					false,
					args.baseResourceClass,
					Math.round(fx + dist * Math.cos(angle)),
					Math.round(fz + dist * Math.sin(angle))
				),
				0,
				avoidClasses(args.baseResourceClass, 3)))
				break;
		}
}

function modifyTilesBasedOnHeight(minHeight, maxHeight, mode, func)
{
	for (let qx = 0; qx < g_Map.size; ++qx)
		for (let qz = 0; qz < g_Map.size; ++qz)
		{
			let height = g_Map.getHeight(qx, qz);
			if (mode == 0 && height >  minHeight && height < maxHeight ||
			    mode == 1 && height >= minHeight && height < maxHeight ||
			    mode == 2 && height >  minHeight && height <= maxHeight ||
			    mode == 3 && height >= minHeight && height <= maxHeight)
			func(qx, qz);
		}
}

function paintTerrainBasedOnHeight(minHeight, maxHeight, mode, terrain)
{
	modifyTilesBasedOnHeight(minHeight, maxHeight, mode, (qx, qz) => {
		placeTerrain(qx, qz, terrain);
	});
}

function paintTileClassBasedOnHeight(minHeight, maxHeight, mode, tileclass)
{
	modifyTilesBasedOnHeight(minHeight, maxHeight, mode, (qx, qz) => {
		addToClass(qx, qz, tileclass);
	});
}

function unPaintTileClassBasedOnHeight(minHeight, maxHeight, mode, tileclass)
{
	modifyTilesBasedOnHeight(minHeight, maxHeight, mode, (qx, qz) => {
		removeFromClass(qx, qz, tileclass);
	});
}

//	"get The Intended Point In A Direction Based On Height"
//	gets the N'th point with a specific height in a line and returns it as a [x, y] array
//	startPoint: [x, y] array defining the start point
//	endPoint: [x, y] array defining the ending point
//	heightRange: [min, max] array defining the range which the height of the intended point can be. includes both "min" and "max"
//  step: how much tile units per turn should the search go. more value means faster but less accurate
//  n: how many points to skip before ending the search. skips """n-1 points""".
function getTIPIADBON(startPoint, endPoint, heightRange, step, n)
{
	let X = endPoint[0] - startPoint[0];
	let Y = endPoint[1] - startPoint[1];

	let M = Math.sqrt(Math.pow(X, 2) + step * Math.pow(Y, 2));

	let stepX = step * X / M;
	let stepY = step * Y / M;

	let y = startPoint[1];
	let checked = 0;

	for (let x = startPoint[0]; true; x += stepX)
	{
		let ix = Math.floor(x);
		let iy = Math.floor(y);

		if (ix < g_Map.size || iy < g_Map.size)
		{
			if (g_Map.getHeight(ix, iy) <= heightRange[1] &&
			    g_Map.getHeight(ix, iy) >= heightRange[0])
				++checked;

			if (checked >= n)
				return [x, y];
		}

		y += stepY;

		if (y > endPoint[1] && stepY > 0 ||
		    y < endPoint[1] && stepY < 0 ||
		    x > endPoint[1] && stepX > 0 ||
		    x < endPoint[1] && stepX < 0)
			return undefined;
	}

	return undefined;
}

/////////////////////////////////////////////////////////////////////////////////////////
// doIntersect
//
//	determines if two lines with the width "width" intersect or collide with each other
//	x1, y1, x2, y2: determine the position of the first line
//	x3, y3, x4, y4: determine the position of the second line
//	width: determines the width of the lines
//
///////////////////////////////////////////////////////////////////////////////////////////

function checkIfIntersect (x1, y1, x2, y2, x3, y3, x4, y4, width)
{
	if (x1 == x2)
	{
		if (((x3 - x1) < width) || ((x4 - x2) < width))
			return true;
	}
	else
	{
		var m = (y1 - y2) / (x1 - x2);
		var b = y1 - m * x1;
		var m2 = sqrt(m * m + 1);
		if ((Math.abs((y3 - x3 * m - b)/m2) < width) || (Math.abs((y4 - x4 * m - b)/m2) < width))
			return true;
		//neccessary for some situations.
		if (x3 == x4)
		{
			if (((x1 - x3) < width) || ((x2 - x4) < width))
				return true;
		}
		else
		{
			var m = (y3 - y4) / (x3 - x4);
			var b = y3 - m * x3;
			var m2 = sqrt(m * m + 1);
			if ((Math.abs((y1 - x1 * m - b)/m2) < width) || (Math.abs((y2 - x2 * m - b)/m2) < width))
				return true;
		}
	}

	var s = ((x1 - x2) * (y3 - y1) - (y1 - y2) * (x3 - x1)), p = ((x1 - x2) * (y4 - y1) - (y1 - y2) * (x4 - x1));
	if ((s * p) <= 0)
	{
		s = ((x3 - x4) * (y1 - y3) - (y3 - y4) * (x1 - x3));
		p = ((x3 - x4) * (y2 - y3) - (y3 - y4) * (x2 - x3));
		if ((s * p) <= 0)
			return true;
	}
	return false;
}

/**
 * Returns the distance of a point from a line.
 */
function distanceOfPointFromLine(line_x1, line_y1, line_x2, line_y2, point_x, point_y)
{
	let width_x = line_x1 - line_x2;
	if (!width_x)
		return Math.abs(point_x - line_x1);

	let width_y = line_y1 - line_y2;
	if (!width_y)
		return Math.abs(point_y - line_y1);

	let inclination = width_y / width_x;
	let intercept = line_y1 - inclination * line_x1;

	return Math.abs((point_y - point_x * inclination - intercept) / Math.sqrt(inclination * inclination + 1));
}

/////////////////////////////////////////////////////////////////////////////////////////
// createRamp
//
//	creates a ramp from point (x1, y1) to (x2, y2).
//	x1, y1, x2, y2: determine the position of the start and end of the ramp
//	minHeight, maxHeight: determine the height levels of the start and end point
//	width: determines the width of the ramp
//	smoothLevel: determines the smooth level around the edges of the ramp
//	mainTerrain: (Optional) determines the terrain texture for the ramp
//	edgeTerrain: (Optional) determines the terrain texture for the edges
//	tileclass: (Optional) adds the ramp to this tile class
//
///////////////////////////////////////////////////////////////////////////////////////////

function createRamp (x1, y1, x2, y2, minHeight, maxHeight, width, smoothLevel, mainTerrain, edgeTerrain, tileclass)
{
	var halfWidth = width / 2;
	var mapSize = g_Map.size;

	if (y1 == y2)
	{
		var x3 = x2;
		var y3 = y2 + halfWidth;
	}
	else
	{
		var m = (x1 - x2) / (y1 - y2);
		var b = y2 + m * x2;
		var x3 = x2 + halfWidth;
		var y3 = - m * x3 + b;
	}

	var minBoundX = (x1 <= x2 ? (x1 > halfWidth ? x1 - halfWidth : 0) : (x2 > halfWidth ? x2 - halfWidth : 0));
	var maxBoundX = (x1 >= x2 ? (x1 < mapSize - halfWidth ? x1 + halfWidth : mapSize) : (x2 < mapSize - halfWidth ? x2 + halfWidth : mapSize));
	var minBoundY = (y1 <= y2 ? (y1 > halfWidth ? y1 - halfWidth : 0) : (y2 > halfWidth ? y2 - halfWidth : 0));
	var maxBoundY = (y1 >= y2 ? (x1 < mapSize - halfWidth ? y1 + halfWidth : mapSize) : (y2 < mapSize - halfWidth ? y2 + halfWidth : mapSize));

	for (var x = minBoundX; x < maxBoundX; ++x)
	{
		for (var y = minBoundY; y < maxBoundY; ++y)
		{
			var lDist = distanceOfPointFromLine(x3, y3, x2, y2, x, y);
			var sDist = distanceOfPointFromLine(x1, y1, x2, y2, x, y);
			var rampLength = sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
			if (lDist <= rampLength && sDist <= halfWidth)
			{
				var h = ((rampLength - lDist) * maxHeight + lDist * minHeight) / rampLength;
				if (sDist >= halfWidth - smoothLevel)
				{
					h = (h - minHeight) * (halfWidth - sDist) / smoothLevel + minHeight;
					if (edgeTerrain !== undefined)
						placeTerrain(x, y, edgeTerrain);
				}
				else
				{
					if (mainTerrain !== undefined)
						placeTerrain(x, y, mainTerrain);
				}
				if (tileclass !== undefined)
					addToClass(x, y, tileclass);
				if((g_Map.getHeight(floor(x), floor(y)) < h) && (h <= maxHeight))
					g_Map.setHeight(x, y, h);
			}
		}
	}
}

/////////////////////////////////////////////////////////////////////////////////////////
// createMountain
//
//	creates a mountain using a tecnique very similar to chain placer.
//
///////////////////////////////////////////////////////////////////////////////////////////

function createMountain(maxHeight, minRadius, maxRadius, numCircles, constraint, x, z, terrain, tileclass, fcc, q)
{
	fcc = (fcc !== undefined ? fcc : 0);
	q = (q !== undefined ? q : []);

	// checking for an array of constraints
	if (constraint instanceof Array)
	{
		var constraintArray = constraint;
		constraint = new AndConstraint(constraintArray);
	}

	// Preliminary bounds check
	if (!g_Map.inMapBounds(x, z) || !constraint.allows(x, z))
	{
		return;
	}

	var size = getMapSize();
	var queueEmpty = (q.length ? false : true);

	var gotRet = [];
	for (var i = 0; i < size; ++i)
	{
		gotRet[i] = [];
		for (var j = 0; j < size; ++j)
			gotRet[i][j] = -1;
	}

	--size;

	if (minRadius < 1) minRadius = 1;
	if (minRadius > maxRadius) minRadius = maxRadius;

	var edges = [[x, z]];
	var circles = [];

	for (var i = 0; i < numCircles; ++i)
	{
		var badPoint = false;
		var [cx, cz] = pickRandom(edges);

		if (queueEmpty)
			var radius = randIntInclusive(minRadius, maxRadius);
		else
		{
			var radius = q.pop();
			queueEmpty = (q.length ? false : true);
		}

		var sx = cx - radius, lx = cx + radius;
		var sz = cz - radius, lz = cz + radius;

		sx = (sx < 0 ? 0 : sx);
		sz = (sz < 0 ? 0 : sz);
		lx = (lx > size ? size : lx);
		lz = (lz > size ? size : lz);

		var radius2 = radius * radius;
		var dx, dz, distance2;

		for (var ix = sx; ix <= lx; ++ix)
		{
			for (var iz = sz; iz <= lz; ++ iz)
			{
				dx = ix - cx;
				dz = iz - cz;
				distance2 = dx * dx + dz * dz;
				if (dx * dx + dz * dz <= radius2)
				{
					if (g_Map.inMapBounds(ix, iz))
					{
						if (!constraint.allows(ix, iz))
						{
							badPoint = true;
							break;
						}

						var state = gotRet[ix][iz];

						if (state == -1)
						{
							gotRet[ix][iz] = -2;
						}
						else if (state >= 0)
						{

							var s = edges.splice(state, 1);

							gotRet[ix][iz] = -2;

							var edgesLength = edges.length;
							for (var k = state; k < edges.length; ++k)
							{
								--gotRet[edges[k][0]][edges[k][1]];
							}
						}
					}
				}
			}
			if (badPoint)
				break;
		}

		if (badPoint)
			continue;
		else
			circles.push([cx, cz, radius]);

		for (var ix = sx; ix <= lx; ++ix)
		{
			for (var iz = sz; iz <= lz; ++ iz)
			{
				if (fcc)
					if ((x - ix) > fcc || (ix - x) > fcc || (z - iz) > fcc || (iz - z) > fcc)
						continue;

				if (gotRet[ix][iz] == -2)
				{
					if (ix > 0)
					{
						if (gotRet[ix-1][iz] == -1)
						{
							edges.push([ix, iz]);
							gotRet[ix][iz] = edges.length - 1;
							continue;
						}
					}
					if (iz > 0)
					{
						if (gotRet[ix][iz-1] == -1)
						{
							edges.push([ix, iz]);
							gotRet[ix][iz] = edges.length - 1;
							continue;
						}
					}
					if (ix < size)
					{
						if (gotRet[ix+1][iz] == -1)
						{
							edges.push([ix, iz]);
							gotRet[ix][iz] = edges.length - 1;
							continue;
						}
					}
					if (iz < size)
					{
						if (gotRet[ix][iz+1] == -1)
						{
							edges.push([ix, iz]);
							gotRet[ix][iz] = edges.length - 1;
							continue;
						}
					}
				}
			}
		}
	}

	var numFinalCircles = circles.length;

	for (var i = 0; i < numFinalCircles; ++i)
	{
		var point = circles[i];
		var cx = point[0], cz = point[1], radius = point[2];

		var sx = cx - radius, lx = cx + radius;
		var sz = cz - radius, lz = cz + radius;

		sx = (sx < 0 ? 0 : sx);
		sz = (sz < 0 ? 0 : sz);
		lx = (lx > size ? size : lx);
		lz = (lz > size ? size : lz);

		var radius2 = radius * radius;
		var dx, dz, distance2;

		var clumpHeight = radius / maxRadius * maxHeight * randFloat(0.8, 1.2);

		for (var ix = sx; ix <= lx; ++ix)
		{
			for (var iz = sz; iz <= lz; ++ iz)
			{
				dx = ix - cx;
				dz = iz - cz;
				distance2 = dx * dx + dz * dz;

				var newHeight = Math.round((Math.sin(PI * (2 * ((radius - Math.sqrt(distance2)) / radius) / 3 - 1/6)) + 0.5) * 2/3 * clumpHeight) + randIntInclusive(0, 2);

				if (dx * dx + dz * dz <= radius2)
				{
					if (g_Map.getHeight(ix, iz) < newHeight)
						g_Map.setHeight(ix, iz, newHeight);
					else if (g_Map.getHeight(ix, iz) >= newHeight && g_Map.getHeight(ix, iz) < newHeight + 4)
						g_Map.setHeight(ix, iz, newHeight + 4);
					if (terrain !== undefined)
						placeTerrain(ix, iz, terrain);
					if (tileclass !== undefined)
						addToClass(ix, iz, tileclass);
				}
			}
		}
	}
}

/**
 * Generates a volcano mountain. Smoke and lava are optional.
 *
 * @param {number} fx - Horizontal coordinate of the center.
 * @param {number} fz - Horizontal coordinate of the center.
 * @param {number} tileClass - Painted onto every tile that is occupied by the volcano.
 * @param {string} terrainTexture - The texture painted onto the volcano hill.
 * @param {array} lavaTextures - Three different textures for the interior, from the outside to the inside.
 * @param {boolean} smoke - Whether to place smoke particles.
 * @param {number} elevationType - Elevation painter type, ELEVATION_SET = absolute or ELEVATION_MODIFY = relative.
 */
function createVolcano(fx, fz, tileClass, terrainTexture, lavaTextures, smoke, elevationType)
{
	log("Creating volcano");

	let ix = Math.round(fractionToTiles(fx));
	let iz = Math.round(fractionToTiles(fz));

	let baseSize = Math.pow(getMapSize(), 2) / scaleByMapSize(1, 8);

	let coherence = 0.7;
	let smoothness = 0.05;
	let failFraction = 100;
	let steepness = 3;

	let clLava = createTileClass();

	let layers = [
		{
			"clumps": 0.067,
			"elevation": 15,
			"tileClass": tileClass
		},
		{
			"clumps": 0.05,
			"elevation": 25,
			"tileClass": createTileClass()
		},
		{
			"clumps": 0.02,
			"elevation": 45,
			"tileClass": createTileClass()
		},
		{
			"clumps": 0.011,
			"elevation": 62,
			"tileClass": createTileClass()
		},
		{
			"clumps": 0.003,
			"elevation": 42,
			"tileClass": clLava,
			"painter": lavaTextures && new LayeredPainter([terrainTexture, ...lavaTextures], [1, 1, 1]),
			"steepness": 1
		}
	];

	for (let i = 0; i < layers.length; ++i)
		createArea(
			new ClumpPlacer(baseSize * layers[i].clumps, coherence, smoothness, failFraction, ix, iz),
			[
				layers[i].painter || new LayeredPainter([terrainTexture, terrainTexture], [3]),
				new SmoothElevationPainter(elevationType, layers[i].elevation, layers[i].steepness || steepness),
				paintClass(layers[i].tileClass)
			],
			i == 0 ? null : stayClasses(layers[i - 1].tileClass, 1));

	if (smoke)
	{
		let num = Math.floor(baseSize * 0.002);
		createObjectGroup(
			new SimpleGroup(
				[new SimpleObject("actor|particle/smoke.xml", num, num, 0, 7)],
				false,
				clLava,
				ix,
				iz),
			0,
		stayClasses(tileClass, 1));
	}
}
