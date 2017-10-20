/**
 * A Non-Centered Placer has the same properties as a Centered Place, except that
 * the location of the area cannot be randomized and is given in the constructor.
 */

/**
 * The RectPlacer provides all points between within (x1, z1) and (x2, z2) and
 * the map boundaries that meet the Constraint.
 */
function RectPlacer(x1, z1, x2, z2)
{
	this.x1 = x1;
	this.z1 = z1;
	this.x2 = x2;
	this.z2 = z2;

	if (x1 > x2 || z1 > z2)
		throw("RectPlacer: incorrect bounds on rect");
}

RectPlacer.prototype.place = function(constraint)
{
	if (!g_Map.inMapBounds(this.x1, this.z1) || !constraint.allows(this.x1, this.z1) ||
		!g_Map.inMapBounds(this.x2, this.z2) || !constraint.allows(this.x2, this.z2))
		return undefined;

	let ret = [];

	for (let x = this.x1; x < this.x2; ++x)
		for (let z = this.z1; z < this.z2; ++z)
			if (constraint.allows(x, z))
				ret.push({ "x": x, "z": z });
			else
				return undefined;

	return ret;
};

/**
 * The HeightPlacer provides all points meeting the constraint that have an elevation within the given boundaries.
 */
function HeightPlacer(lowerBound, upperBound)
{
    this.lowerBound = lowerBound;
    this.upperBound = upperBound;
}

HeightPlacer.prototype.place = function(constraint)
{
	let mapSize = getMapSize();
    let ret = [];
	for (let x = 0; x < mapSize; ++x)
		for (let z = 0; z < mapSize; ++z)
			if (g_Map.height[x][z] >= this.lowerBound &&
			    g_Map.height[x][z] <= this.upperBound &&
			    (!constraint || constraint.allows(x, z)))
				ret.push({ "x": x, "z": z });

	return ret;
};

/**
 * A PathPlacer creates a winding path between two points.
 *
 * @param x1, z1 - Starting point of path.
 * @param x2, z2 - Ending point of path.
 * @param width - Width of the path.
 * @param waviness - How wavy the path will be (higher is wavier, 0 is a straight line).
 * @param smoothness - How smooth the path will be (higher is smoother).
 * @param offset - Max amplitude of waves along the path (0 is straight line).
 * @param tapering - How much the width of the path changes from start to end.
 *          If positive, the width will decrease by that factor.
 *          If negative, the width will increase by that factor.
 */
function PathPlacer(x1, z1, x2, z2, width, waviness, smoothness, offset, tapering, failfraction = 5)
{
	this.x1 = x1;
	this.z1 = z1;
	this.x2 = x2;
	this.z2 = z2;
	this.width = width;
	this.waviness = waviness;
	this.smoothness = smoothness;
	this.offset = offset;
	this.tapering = tapering;
	this.failfraction = failfraction;
}

PathPlacer.prototype.place = function(constraint)
{
	let dx = this.x2 - this.x1;
	let dz = this.z2 - this.z1;
	var dist = Math.sqrt(dx*dx + dz*dz);
	dx /= dist;
	dz /= dist;

	let offset = 1 + Math.floor(dist / 4 * this.offset);
	let numSteps = 1 + Math.floor(dist / 4 * this.waviness);
	let numISteps = 1 + Math.floor(dist / 4 * this.smoothness);
	let totalSteps = numSteps * numISteps;

	let size = getMapSize();
	let gotRet = [];
	for (let i = 0; i < size; ++i)
		gotRet[i] = new Uint8Array(size);

	// Generate random offsets
	let ctrlVals = new Float32Array(numSteps);
	for (let j = 1; j < numSteps - 1; ++j)
		ctrlVals[j] = randFloat(-offset, offset);

	// Interpolate for smoothed 1D noise
	let noise = new Float32Array(totalSteps + 1);
	for (let j = 0; j < numSteps; ++j)
	{
		let coords = [];
		for (let k = 0; k < numISteps; ++k)
			coords.push(k / numISteps);

		coords = cubicInterpolation2(
			coords,
			ctrlVals[(j + numSteps - 1) % numSteps],
			ctrlVals[j],
			ctrlVals[(j + 1) % numSteps],
			ctrlVals[(j + 2) % numSteps]);

		for (let k = 0; k < numISteps; ++k)
			noise[j * numISteps + k] = coords[k];
	}

	// Add smoothed noise to straight path
	let segments1 = [];
	let segments2 = [];

	for (let j = 0; j < totalSteps; ++j)
	{
		// Interpolated points along straight path
		let t = j / totalSteps;
		let tx = this.x1 * (1 - t) + this.x2 * t;
		let tz = this.z1 * (1 - t) + this.z2 * t;

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
		var dist2 = Math.sqrt(ndx*ndx + ndz*ndz);
		ndx /= dist2;
		ndz /= dist2;

		let taperedWidth = (1 - t * this.tapering) * this.width / 2;

		// Find slope of offset path
		segments1.push({
			"x": Math.round(nx + ndz * taperedWidth),
			"z": Math.round(nz - ndx * taperedWidth)
		});

		segments2.push({
			"x": Math.round(nx2 - ndz * taperedWidth),
			"z": Math.round(nz2 + ndx * taperedWidth)
		});
	}

	// Draw path segments
	let retVec = [];
	let failed = 0;

	// Fills in a line from (z, x1) to (z,x2)
	let fillLine = function(z, x1, x2)
	{
		let left = Math.round(Math.min(x1, x2));
		let right = Math.round(Math.max(x1, x2));
		for (let x = left; x <= right; ++x)
		{
			if (constraint.allows(x, z))
			{
				if (g_Map.inMapBounds(x, z) && !gotRet[x][z])
				{
					retVec.push({ "x": x, "z": z });
					gotRet[x][z] = 1;
				}
			}
			else
				++failed;
		}
	};

	for (let j = 0; j < segments1.length - 1; ++j)
	{
		// Fill quad formed by these 4 points
		// Note the code assumes these points have been rounded to integer values
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
					let dx = D1.z != D2.z ? (D2.x - D1.x) / (D2.z - D1.z) : 0;
					let dx2 = A.z != C.z ? (C.x - A.x) / (C.z - A.z) : 0;
					for (let z = D1.z; z <= D2.z; ++z)
						fillLine(z, D1.x + dx * (z - D1.z), A.x + dx2 * (z - A.z));
				}
		}
	}

	// TODO is dist or dist2 meant?
	if (failed > this.width * this.failfraction * dist)
		return undefined;

	return retVec;
};
