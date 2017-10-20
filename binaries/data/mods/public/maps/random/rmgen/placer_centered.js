/**
 * A Centered Placer computes the shape of an area.
 * The placer has an x and z properties specifying the center of the area.
 * They are randomized by the createAreas call or given in the constructor.
 * The place function returns all points of that area that meet the given Constraint.
 */

/**
 * The ClumpPlacer generates a roughly circular clump of points.
 *
 * @param size - The average number of points in the clump.
 * @param coherence - How much the radius of the clump varies (1 = circle, 0 = very random).
 * @param smoothness - How smooth the border of the clump is (1 = few peaks, 0 = very jagged).
 * @param failfraction - Percentage of place attempts allowed to fail.
 */
function ClumpPlacer(size, coherence, smoothness, failFraction = 0, x = -1, z = -1)
{
	this.size = size;
	this.coherence = coherence;
	this.smoothness = smoothness;
	this.failFraction = failFraction;
	this.x = x;
	this.z = z;
}

ClumpPlacer.prototype.place = function(constraint)
{
	if (!g_Map.inMapBounds(this.x, this.z) || !constraint.allows(this.x, this.z))
		return undefined;

	let clumpRadius = Math.sqrt(this.size / Math.PI);
	let perim = clumpRadius * 8 * Math.PI;
	let intPerim = Math.ceil(perim);
	let noise = new Float32Array(intPerim);

	// Generate some interpolated noise
	let ctrlPts = 1 + Math.floor(Math.min(1 / Math.max(this.smoothness, 1 / intPerim), clumpRadius * 2 * Math.PI));
	let ctrlCoords = new Float32Array(ctrlPts + 1);
	let ctrlVals = new Float32Array(ctrlPts + 1);

	for (let i = 0; i < ctrlPts; ++i)
	{
		ctrlCoords[i] = i * perim / ctrlPts;
		ctrlVals[i] = randFloat(0, 2);
	}

	let mapSize = getMapSize();
	let retVec = [];
	let gotRet = new Array(mapSize).fill(0).map(p => new Uint8Array(mapSize));

	let c = 0;
	let looped = false;
	for (let i = 0; i < intPerim; ++i)
	{
		if (ctrlCoords[(c + 1) % ctrlPts] < i && !looped)
		{
			c = (c + 1) % ctrlPts;
			if (c + 1 == ctrlPts)
				looped = true;
		}

		noise[i] = cubicInterpolation2(
			(i - ctrlCoords[c]) / ((looped ? perim : ctrlCoords[(c + 1) % ctrlPts]) - ctrlCoords[c]),
			ctrlVals[(c + ctrlPts - 1) % ctrlPts],
			ctrlVals[c],
			ctrlVals[(c + 1) % ctrlPts],
			ctrlVals[(c + 2) % ctrlPts]);
	}

	let failed = 0;
	for (let p = 0; p < intPerim; ++p)
	{
		let angle = 2 * Math.PI * p / perim;
		let sin = Math.sin(angle);
		let cos = Math.cos(angle);

		let xx = this.x;
		let yy = this.z;

		for (let k = 0; k < Math.ceil(clumpRadius * (1 + (1 - this.coherence) * noise[p])); ++k)
		{
			let i = Math.floor(xx);
			let j = Math.floor(yy);

			if (g_Map.inMapBounds(i, j) && constraint.allows(i, j))
			{
				if (!gotRet[i][j])
				{
					gotRet[i][j] = 1;
					retVec.push({ "x": i, "z": j });
				}
			}
			else
				++failed;

			xx += sin;
			yy += cos;
		}
	}

	if (failed > this.size * this.failFraction)
		return undefined;

	return retVec;
};

/**
 * The ChainPlacer generates a more random clump of points (random circles around the edges of the current clump).
 *
 * @param minRadius, maxRadius - size of the circles.
 * @param numCircles - number of circles.
 * @param failFraction - Percentage of place attempts allowed to fail.
 * @param x, z - Tile coordinates of placer center
 * @param farthestCircleCenter
 * @param radiusQueue
 */
function ChainPlacer(minRadius, maxRadius, numCircles, failFraction = 0, x = -1, z = -1, farthestCircleCenter = 0, radiusQueue = [])
{
	this.minRadius = Math.min(Math.max(1, minRadius), maxRadius);
	this.maxRadius = maxRadius;
	this.numCircles = numCircles;
	this.failFraction = failFraction;
	this.x = x;
	this.z = z;
	this.farthestCircleCenter = farthestCircleCenter;
	this.radiusQueue = radiusQueue;
}

ChainPlacer.prototype.place = function(constraint)
{
	if (!g_Map.inMapBounds(this.x, this.z) || !constraint.allows(this.x, this.z))
		return undefined;

	let retVec = [];
	let mapSize = getMapSize();
	let failed = 0;
	let count = 0;

	let gotRet = new Array(mapSize).fill(0).map(p => new Array(mapSize).fill(-1));
	--mapSize;

	let edges = [[this.x, this.z]];
	for (let i = 0; i < this.numCircles; ++i)
	{
		let radius =
			this.radiusQueue.length ?
				this.radiusQueue.pop() :
				randIntInclusive(this.minRadius, this.maxRadius);

		let radius2 = radius * radius;
		let [cx, cz] = pickRandom(edges);

		let left = Math.max(0, cx - radius);
		let top = Math.max(0, cz - radius);
		let right = Math.min(cx + radius, mapSize);
		let bottom = Math.min(cz + radius, mapSize);

		for (let ix = left; ix <= right; ++ix)
			for (let iz = top; iz <= bottom; ++iz)
				if (getDistanceToSquared(ix, iz, cx, cz) <= radius2)
				{
					if (g_Map.inMapBounds(ix, iz) && constraint.allows(ix, iz))
					{
						let state = gotRet[ix][iz];
						if (state == -1)
						{
							retVec.push({ "x": ix, "z": iz });
							gotRet[ix][iz] = -2;
						}
						else if (state >= 0)
						{
							edges.splice(state, 1);
							gotRet[ix][iz] = -2;

							for (let k = state; k < edges.length; ++k)
								--gotRet[edges[k][0]][edges[k][1]];
						}
					}
					else
						++failed;

					++count;
				}

		for (let ix = left; ix <= right; ++ix)
			for (let iz = top; iz <= bottom; ++iz)
			{
				if (this.farthestCircleCenter && (
				      Math.abs(this.x - ix) > Math.abs(this.farthestCircleCenter) ||
					  Math.abs(this.z - iz) > Math.abs(this.farthestCircleCenter)))
					continue;

				if (gotRet[ix][iz] == -2 && (
				      ix > 0 && gotRet[ix-1][iz] == -1 ||
				      iz > 0 && gotRet[ix][iz-1] == -1 ||
				      ix < mapSize && gotRet[ix+1][iz] == -1 ||
				      iz < mapSize && gotRet[ix][iz+1] == -1))
				{
					edges.push([ix, iz]);
					gotRet[ix][iz] = edges.length - 1;
				}
			}
	}

	if (failed > count * this.failFraction)
		return undefined;

	return retVec;
};
