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

	let mapSize = getMapSize();

	for (let ix = 0; ix < mapSize; ++ix)
		for (let iz = 0; iz < mapSize; ++iz)
		{
			if (args.constraint && !args.constraint.allows(ix, iz))
				continue;

			let x = ix / (mapSize + 1);
			let z = iz / (mapSize + 1);

			let coord1 = args.horizontal ? z : x;
			let coord2 = args.horizontal ? x : z;

			// River curve at this place
			let cu1 = meanderShort * rndRiver(theta1 + coord2 * mapSize / 128, seed1);
			let cu2 = args.parallel ? cu1 :
				meanderShort * rndRiver(theta2 + coord2 * mapSize / 128, seed2) +
				meanderLong * rndRiver(theta2 + coord2 * mapSize / 256, seed2);

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

/**
 * Helper function to create a meandering river.
 * It works the same as sin or cos function with the difference that it's period is 1 instead of 2 pi.
 */
function rndRiver(f, seed)
{
	let rndRw = seed;

	for (var i = 0; i <= f; ++i)
		rndRw = 10 * (rndRw % 1);

	let rndRr = f % 1;
	let retVal = (i % 2 ? 1 : -1) * rndRr * (rndRr - 1);

	let rndRe = Math.floor(rndRw) % 5;
	if (rndRe == 0)
		retVal *= 2.3 * (rndRr - 0.5) * (rndRr - 0.5);
	else if (rndRe == 1)
		retVal *= 2.6 * (rndRr - 0.3) * (rndRr - 0.7);
	else if (rndRe == 2)
		retVal *= 22 * (rndRr - 0.2) * (rndRr - 0.3) * (rndRr - 0.3) * (rndRr - 0.8);
	else if (rndRe == 3)
		retVal *= 180 * (rndRr - 0.2) * (rndRr - 0.2) * (rndRr - 0.4) * (rndRr - 0.6) * (rndRr - 0.6) * (rndRr - 0.8);
	else if (rndRe == 4)
		retVal *= 2.6 * (rndRr - 0.5) * (rndRr - 0.7);

	return retVal;
}

function createTributaries(horizontal, riverCount, riverWidth, waterHeight, heightRange, maxAngle, tributaryRiverTileClass, shallowTileClass, constraint)
{
	log("Creating horizontal tributary rivers...");
	let waviness = 0.4;
	let smoothness = scaleByMapSize(3, 12);
	let offset = 0.1;
	let tapering = 0.05;

	let riverConstraint = avoidClasses(tributaryRiverTileClass, 3);
	if (shallowTileClass)
		riverConstraint = new AndConstraint([riverConstraint, avoidClasses(shallowTileClass, 2)]);

	for (let i = 0; i < riverCount; ++i)
	{
		log("Determining tributary start point...");
		let location = randFloat(tapering, 1 - tapering);
		let sign = randBool() ? 1 : -1;
		let angle = sign * randFloat(maxAngle, 2 * Math.PI - maxAngle);
		let distance = sign * tapering;

		let searchStart = [fractionToTiles(location), fractionToTiles(0.5 + distance)];
		let searchEnd = [fractionToTiles(location), fractionToTiles(0.5 - distance)];

		if (!horizontal)
		{
			searchStart.reverse();
			searchEnd.reverse();
		}

		let start = getTIPIADBON(searchStart, searchEnd, heightRange, 0.5, 4);
		if (!start)
			continue;

		let endX = fractionToTiles(0.5 + 0.49 * Math.cos(angle));
		let endZ = fractionToTiles(0.5 + 0.49 * Math.sin(angle));

		log("Creating tributary river...");
		if (!createArea(
			new PathPlacer(
				Math.floor(start[0]),
				Math.floor(start[1]),
				Math.floor(endX),
				Math.floor(endZ),
				riverWidth,
				waviness,
				smoothness,
				offset,
				tapering),
			[
				new SmoothElevationPainter(ELEVATION_SET, waterHeight, 4),
				paintClass(tributaryRiverTileClass)
			],
			new AndConstraint([constraint, riverConstraint])))
			continue;

		log("Creating small puddles at the map border to ensure players being separated...");
		createArea(
			new ClumpPlacer(Math.floor(diskArea(riverWidth / 2)), 0.95, 0.6, 10, endX, endZ),
			new SmoothElevationPainter(ELEVATION_SET, waterHeight, 3),
			constraint);
	}

	log("Creating shallows in tributaries...");
	if (shallowTileClass)
		for (let z of [0.25, 0.75])
		{
			let m1 = [Math.round(fractionToTiles(0.2)), Math.round(fractionToTiles(z))];
			let m2 = [Math.round(fractionToTiles(0.8)), Math.round(fractionToTiles(z))];

			if (!horizontal)
			{
				m1.reverse();
				m2.reverse();
			}

			createShallowsPassage(...m1, ...m2, scaleByMapSize(4, 8), -2, -2, 2, shallowTileClass, undefined, waterHeight);
		}
}

/**
 * Create shallow water between (x1, z1) and (x2, z2) of tiles below maxHeight.
 */
function createShallowsPassage(x1, z1, x2, z2, width, maxHeight, shallowHeight, smooth, tileclass, terrain, riverHeight)
{
	let mapSize = getMapSize();
	let distance = getDistance(x1, z1, x2, z2);

	let a = z1 - z2;
	let b = x2 - x1;

	for (let ix = 0; ix < mapSize; ++ix)
		for (let iz = 0; iz < mapSize; ++iz)
		{
			let c = a * (ix - x1) + b * (iz - z1);
			let my = iz - b * c / Math.square(distance);
			let inline = 0;

			let dis;
			if (b == 0)
			{
				dis = Math.abs(ix - x1);
				if (iz <= Math.max(z1, z2) && iz >= Math.min(z1, z2))
					inline = 1;
			}
			else if (my <= Math.max(z1, z2) && my >= Math.min(z1, z2))
			{
				dis = Math.abs(c) / distance;
				inline = 1;
			}

			if (dis > width || !inline || getHeight(ix, iz) > maxHeight)
				continue;

			if (dis > width - smooth)
				g_Map.setHeight(ix, iz, ((width - dis) * shallowHeight + riverHeight * (smooth - width + dis)) / smooth);
			else if (dis <= width - smooth)
				g_Map.setHeight(ix, iz, shallowHeight);

			if (tileclass !== undefined)
				addToClass(ix, iz, tileclass);

			if (terrain !== undefined)
				placeTerrain(ix, iz, terrain);
		}
}

/**
 * Creates a smooth, passable path between between (startX, startZ) and (endX, endZ) with the given startWidth and endWidth.
 * Paints the given tileclass and terrain.
 */
function createPassage(args)
{
	let mapSize = getMapSize();
	let stepCount = getDistance(args.startX, args.startZ, args.endX, args.endZ) + 2;

	let startY = args.startY !== undefined ? args.startY : getHeight(args.startX, args.startZ);
	let endY = args.endY !== undefined ? args.endY : getHeight(args.endX, args.endZ);

	for (let step = 0; step <= stepCount; step += 0.5)
	{
		let halfStepCount = stepCount / 2;
		let stepCenter = Math.abs(step - halfStepCount);
		let remainingSteps = stepCount - step;
		let halfWidth = Math.floor((stepCenter * args.startWidth + (halfStepCount - stepCenter) * args.endWidth) / stepCount);
		let ix = (args.startX * remainingSteps + args.endX * step) / stepCount;
		let iz = (args.startZ * remainingSteps + args.endZ * step) / stepCount;

		// perpendicular direction
		let direction = [args.startZ - args.endZ, args.endX - args.startX];
		if (Math.abs(direction[0]) > Math.abs(direction[1]))
			direction.reverse();

		for (let passageZ = -halfWidth; passageZ <= halfWidth; passageZ += 0.5)
		{
			let x = Math.round(ix + passageZ * direction[0] / Math.abs(direction[1]));
			let z = Math.round(iz + passageZ * Math.sign(direction[1] || 1));

			if (!g_Map.inMapBounds(x, z))
				continue;

			//let targetHeight = (stepCenter * startY + (halfStepCount - stepCenter) * endY) / halfStepCount;
			let targetHeight = (remainingSteps * startY + endY * step) / stepCount;

			let smoothDistance = args.smooth - Math.abs(Math.abs(passageZ) - halfWidth);
			if (smoothDistance > 0)
				targetHeight = (getHeight(x, z) * smoothDistance + targetHeight / smoothDistance) / (smoothDistance + 1 / smoothDistance);

			g_Map.setHeight(x, z, targetHeight);

			if (args.tileclass)
				addToClass(x, z, args.tileclass);

			if (args.terrain)
				placeTerrain(x, z, args.terrain);
		}
	}
}

/**
 * Creates a ramp from (x1, y1) to (x2, y2).
 */
function createRamp(x1, y1, x2, y2, minHeight, maxHeight, width, smoothLevel, mainTerrain, edgeTerrain, tileclass)
{
	let halfWidth = width / 2;

	let x3;
	let y3;

	if (y1 == y2)
	{
		x3 = x2;
		y3 = y2 + halfWidth;
	}
	else
	{
		x3 = x2 + halfWidth;
		y3 = (x1 - x2) / (y1 - y2) * (x2 - x3) + y2;
	}

	let minBoundX = Math.max(Math.min(x1, x2) - halfWidth, 0);
	let minBoundY = Math.max(Math.min(y1, y2) - halfWidth, 0);
	let maxBoundX = Math.min(Math.max(x1, x2) + halfWidth, getMapSize());
	let maxBoundY = Math.min(Math.max(y1, y2) + halfWidth, getMapSize());

	for (let x = minBoundX; x < maxBoundX; ++x)
		for (let y = minBoundY; y < maxBoundY; ++y)
		{
			let lDist = distanceOfPointFromLine(x3, y3, x2, y2, x, y);
			let sDist = distanceOfPointFromLine(x1, y1, x2, y2, x, y);
			let rampLength = getDistance(x1, y1, x2, y2);

			if (lDist > rampLength || sDist > halfWidth)
				continue;

			let height = ((rampLength - lDist) * maxHeight + lDist * minHeight) / rampLength;

			if (sDist >= halfWidth - smoothLevel)
			{
				height = (height - minHeight) * (halfWidth - sDist) / smoothLevel + minHeight;

				if (edgeTerrain)
					placeTerrain(x, y, edgeTerrain);
			}
			else if (mainTerrain)
				placeTerrain(x, y, mainTerrain);

			if (tileclass !== undefined)
				addToClass(x, y, tileclass);

			if (g_Map.getHeight(Math.floor(x), Math.floor(y)) < height && height <= maxHeight)
				g_Map.setHeight(x, y, height);
		}
}

/**
 * Create a mountain using a technique very similar to chain placer.
 */
function createMountain(maxHeight, minRadius, maxRadius, numCircles, constraint, x, z, terrain, tileclass, fcc, q)
{
	fcc = fcc || 0;
	q = q || [];

	if (constraint instanceof Array)
		constraint = new AndConstraint(constraint);

	if (!g_Map.inMapBounds(x, z) || !constraint.allows(x, z))
		return;

	let mapSize = getMapSize();
	let queueEmpty = !q.length;

	let gotRet = [];
	for (let i = 0; i < mapSize; ++i)
	{
		gotRet[i] = [];
		for (let j = 0; j < mapSize; ++j)
			gotRet[i][j] = -1;
	}

	--mapSize;

	minRadius = Math.max(1, Math.min(minRadius, maxRadius));

	let edges = [[x, z]];
	let circles = [];

	for (let i = 0; i < numCircles; ++i)
	{
		let badPoint = false;
		let [cx, cz] = pickRandom(edges);

		let radius;
		if (queueEmpty)
			radius = randIntInclusive(minRadius, maxRadius);
		else
		{
			radius = q.pop();
			queueEmpty = !q.length;
		}

		let sx = Math.max(0, cx - radius);
		let sz = Math.max(0, cz - radius);
		let lx = Math.min(cx + radius, mapSize);
		let lz = Math.min(cz + radius, mapSize);

		let radius2 = Math.square(radius);

		for (let ix = sx; ix <= lx; ++ix)
		{
			for (let iz = sz; iz <= lz; ++iz)
			{
				if (getDistance(ix, iz, cx, cz) > radius2 || !g_Map.inMapBounds(ix, iz))
					continue;

				if (!constraint.allows(ix, iz))
				{
					badPoint = true;
					break;
				}

				let state = gotRet[ix][iz];
				if (state == -1)
				{
					gotRet[ix][iz] = -2;
				}
				else if (state >= 0)
				{
					let s = edges.splice(state, 1);
					gotRet[ix][iz] = -2;

					let edgesLength = edges.length;
					for (let k = state; k < edges.length; ++k)
						--gotRet[edges[k][0]][edges[k][1]];
				}
			}

			if (badPoint)
				break;
		}

		if (badPoint)
			continue;

		circles.push([cx, cz, radius]);

		for (let ix = sx; ix <= lx; ++ix)
			for (let iz = sz; iz <= lz; ++iz)
			{
				if (gotRet[ix][iz] != -2 ||
				    fcc && (x - ix > fcc || ix - x > fcc || z - iz > fcc || iz - z > fcc) ||
				    ix > 0 && gotRet[ix-1][iz] == -1 ||
				    iz > 0 && gotRet[ix][iz-1] == -1 ||
				    ix < mapSize && gotRet[ix+1][iz] == -1 ||
				    iz < mapSize && gotRet[ix][iz+1] == -1)
					continue;

				edges.push([ix, iz]);
				gotRet[ix][iz] = edges.length - 1;
			}
	}

	for (let [cx, cz, radius] of circles)
	{
		let sx = Math.max(0, cx - radius);
		let sz = Math.max(0, cz - radius);
		let lx = Math.min(cx + radius, mapSize);
		let lz = Math.min(cz + radius, mapSize);

		let clumpHeight = radius / maxRadius * maxHeight * randFloat(0.8, 1.2);

		for (let ix = sx; ix <= lx; ++ix)
			for (let iz = sz; iz <= lz; ++iz)
			{
				let distance = getDistance(ix, iz, cx, cz);

				let newHeight =
					randIntInclusive(0, 2) +
					Math.round(2/3 * clumpHeight * (Math.sin(Math.PI * 2/3 * (3/4 - distance / radius)) + 0.5));

				if (distance > radius)
					continue;

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

	let baseSize = getMapArea() / scaleByMapSize(1, 8);
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

/**
 * Get The Intended Point In A Direction Based On Height.
 * Retrieves the N'th point with a specific height in a line and returns it as a [x, y] array.
 *
 * @param startPoint - [x, y] array defining the start point
 * @param endPoint - [x, y] array defining the ending point
 * @param heightRange - [min, max] array defining the range which the height of the intended point can be. includes both "min" and "max"
 * @param step - how much tile units per turn should the search go. more value means faster but less accurate
 * @param n - how many points to skip before ending the search. skips """n-1 points""".
 */
function getTIPIADBON(startPoint, endPoint, heightRange, step, n)
{
	let X = endPoint[0] - startPoint[0];
	let Y = endPoint[1] - startPoint[1];

	if (!X && !Y)
	{
		error("getTIPIADBON startPoint and endPoint are identical! " + new Error().stack);
		return undefined;
	}

	let M = Math.sqrt(Math.square(X) + step * Math.square(Y));
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
			if (getHeight(ix, iy) <= heightRange[1] &&
			    getHeight(ix, iy) >= heightRange[0])
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
