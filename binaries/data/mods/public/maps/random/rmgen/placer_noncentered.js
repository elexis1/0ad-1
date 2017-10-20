/**
 * A Non-Centered Placer generates an shape (array of points) at a fixed location meeting a Constraint and
 * is typically called by createArea.
 * Since this type of Placer has no x and z property, its location cannot be randomized using createAreas.
 */

/**
 * The RectPlacer provides the points between (x1, z1) and (x2, z2) if they meet the Constraint.
 */
function RectPlacer(x1, z1, x2, z2)
{
	this.x1 = x1;
	this.z1 = z1;
	this.x2 = x2;
	this.z2 = z2;

	if (x1 > x2 || z1 > z2)
		throw new Error("RectPlacer: invalid bounds");
}

RectPlacer.prototype.place = function(constraint)
{
	if (!g_Map.inMapBounds(this.x1, this.z1) || !g_Map.inMapBounds(this.x2, this.z2))
		return undefined;

	let points = [];

	for (let x = this.x1; x <= this.x2; ++x)
		for (let z = this.z1; z <= this.z2; ++z)
			if (constraint.allows(x, z))
				points.push({ "x": x, "z": z });
			else
				return undefined;

	return points;
};

/**
 * The HeightPlacer provides all points between the minimum and maximum elevation that meet the Constraint.
 */
function HeightPlacer(minElevation, maxElevation)
{
	this.minElevation = minElevation;
	this.maxElevation = maxElevation;
}

HeightPlacer.prototype.place = function(constraint)
{
	let mapSize = getMapSize();
	let points = [];
	for (let x = 0; x < mapSize; ++x)
		for (let z = 0; z < mapSize; ++z)
			if (g_Map.height[x][z] >= this.minElevation &&
			    g_Map.height[x][z] <= this.maxElevation &&
			    constraint.allows(x, z))
				points.push({ "x": x, "z": z });

	return points;
};

/**
 * A PathPlacer creates a symmetric, winding path between two points.
 *
 * @param x1, z1 - Starting point of path.
 * @param x2, z2 - Ending point of path.
 * @param width - Width of the path.
 * @param waviness - How wavy the path will be (higher is wavier, 0 is a straight line).
 * @param smoothness - How smooth the path will be (higher is smoother).
 * @param maxOffset - Max amplitude of waves along the path, relative to the length of the path (0 is straight line).
 * @param tapering - How much the width of the path changes from start to end.
 *          If positive, the width will decrease by that factor.
 *          If negative, the width will increase by that factor.
 */
function PathPlacer(x1, z1, x2, z2, width, waviness, smoothness, maxOffset, tapering, failfraction = 5)
{
	this.x1 = x1;
	this.z1 = z1;
	this.x2 = x2;
	this.z2 = z2;
	this.width = width;
	this.waviness = waviness;
	this.smoothness = smoothness;
	this.maxOffset = maxOffset;
	this.tapering = tapering;
	this.failfraction = failfraction;
}

PathPlacer.prototype.place = function(constraint)
{
	// Get the direction and length of the path
	let dx = this.x2 - this.x1;
	let dz = this.z2 - this.z1;
	let pathLength = Math.euclidDistance2D(0, 0, dx, dz);
	dx /= pathLength;
	dz /= pathLength;

	// The later cubic interpolated uses four points
	let smoothingDistance = pathLength / 4;

	// The maximum amplitude of the river is proportional to the length of the path
	let maxOffset = 1 + Math.floor(smoothingDistance * this.maxOffset);

	// Model the path as a wave with this number of extrema
	let stepsWaviness = 1 + Math.floor(smoothingDistance * this.waviness);

	// At how many points to smooth in between two extrema of the wave
	let stepsSmoothing = 1 + Math.floor(smoothingDistance * this.smoothness);

	let totalSteps = stepsWaviness * stepsSmoothing;

	// Randomize offset at each extrema of the wave
	let offsets = new Float32Array(stepsWaviness);
	for (let j = 1; j < stepsWaviness - 1; ++j)
		offsets[j] = randFloat(-1, 1) * maxOffset;

	// Interpolate between th t
	let noise = new Float32Array(totalSteps + 1);
	for (let j = 0; j < stepsWaviness; ++j)
		for (let k = 0; k < stepsSmoothing; ++k)
			noise[j * stepsSmoothing + k] = cubicInterpolation(
				1,
				k / stepsSmoothing,
				offsets[(j + stepsWaviness - 1) % stepsWaviness],
				offsets[j],
				offsets[(j + 1) % stepsWaviness],
				offsets[(j + 2) % stepsWaviness]);

	// Add smoothed noise to straight path
	let segments1 = [];
	let segments2 = [];

	for (let j = 0; j < totalSteps; ++j)
	{
		// Interpolated points along straight path
		let t1 = j / totalSteps;
		let tx = this.x1 * (1 - t1) + this.x2 * t1;
		let tz = this.z1 * (1 - t1) + this.z2 * t1;

		let t2 = (j + 1) / totalSteps;
		let tx2 = this.x1 * (1 - t2) + this.x2 * t2;
		let tz2 = this.z1 * (1 - t2) + this.z2 * t2;

		// Find noise offset points
		let nx = tx - dz * noise[j];
		let nz = tz + dx * noise[j];
		let nx2 = tx2 - dz * noise[j + 1];
		let nz2 = tz2 + dx * noise[j + 1];

		// Find slope of offset points
		let ndx = nx2 - nx;
		let ndz = nz2 - nz;
		let dist = Math.euclidDistance2D(0, 0, ndx, ndz);
		ndx /= dist;
		ndz /= dist;

		let taperedWidth = (1 - t1 * this.tapering) * this.width / 2;

		// Find slope of offset path
		segments1.push(
			({
				"x": Math.round(nx + ndz * taperedWidth),
				"z": Math.round(nz - ndx * taperedWidth)
			});

		segments2.push({
			"x": Math.round(nx2 - ndz * taperedWidth),
			"z": Math.round(nz2 + ndx * taperedWidth)
		});
	}

	// Draw path segments
	let resultPoints = [];
	let failed = 0;

	let mapSize = getMapSize();
	let isResultingPoint = [];
	for (let i = 0; i < mapSize; ++i)
		isResultingPoint[i] = new Uint8Array(mapSize);

	// Adds points between (x1, z) and (x2, z) to the result
	let fillLine = function(z, x1, x2)
	{
		let left = Math.round(Math.min(x1, x2));
		let right = Math.round(Math.max(x1, x2));
		for (let x = left; x <= right; ++x)
		{
			if (!constraint.allows(x, z))
			{
				++failed;
				continue;
			}

			if (!g_Map.inMapBounds(x, z) || isResultingPoint[x][z])
				continue;

			resultPoints.push({ "x": x, "z": z });
			isResultingPoint[x][z] = 1;
		}
	};

	for (let j = 0; j < segments1.length - 1; ++j)
	{
		// Fill quad formed by these 4 points
		let pt11 = segments1[j];
		let pt12 = segments1[j + 1];
		let pt21 = segments2[j];
		let pt22 = segments2[j + 1];

		for (let triple of [[pt12, pt11, pt21], [pt12, pt21, pt22]])
		{
			// Sort vertices by min z
			let [A, B, C] = triple.sort((a, b) => a.z - b.z);

			// Fill line from A to B, then from B to C
			for (let [D1, D2] of [[A, B], [B, C]])
				if (D1.z == D2.z)
					fillLine(D1.z, D1.x, D2.x);
				else
				{
					let dx = (D2.x - D1.x) / (D2.z - D1.z);
					let dx2 = A.z != C.z ? (C.x - A.x) / (C.z - A.z) : 0;
					for (let z = D1.z; z <= D2.z; ++z)
						fillLine(z, D1.x + dx * (z - D1.z), A.x + dx2 * (z - A.z));
				}
		}
	}

	if (failed > this.width * pathLength * this.failfraction)
		return undefined;

	return resultPoints;
};
