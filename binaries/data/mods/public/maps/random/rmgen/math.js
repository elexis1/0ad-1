function diskArea(radius)
{
	return Math.PI * Math.square(radius);
}

/**
 * Returns the angle of the vector between point 1 and point 2.
 * The angle is counterclockwise from the positive x axis.
 */
function getAngle(x1, z1, x2, z2)
{
	return Math.atan2(z2 - z1, x2 - x1);
}

/**
 * Revolve the given point around the given rotation center.
 */
function rotateCoordinates(x, z, angle, centerX = 0.5, centerZ = 0.5)
{
	let sin = Math.sin(angle);
	let cos = Math.cos(angle);

	return [
		cos * (x - centerX) - sin * (z - centerZ) + centerX,
		sin * (x - centerX) + cos * (z - centerZ) + centerZ
	];
}

/**
 * Get pointCount points equidistantly located on a circle.
 */
function distributePointsOnCircle(pointCount, startAngle, radius, centerX, centerZ)
{
	let points = [];
	let angle = [];
	let center = new Vector2D(centerX, centerZ);

	for (let i = 0; i < pointCount; ++i)
	{
		angle[i] = startAngle + 2 * Math.PI * i / pointCount;
		points[i] = Vector2D.add(center, new Vector2D(radius, 0).rotate(-angle[i]));
	}

	return [points, angle];
}

/**
 * Returns the distance of a point from a line.
 * @param {Vector2D} - lineStart, lineEnd, point
 * @param {boolean} absolute - If true, the function returns a non-negative number of the magnitude.
 *   Otherwise the sign denotes the direction.
 */
function distanceOfPointFromLine(lineStart, lineEnd, point, absolute = true)
{
	// Since the cross product is the area of the parallelogram with the vectors for sides and
	// one of the two vectors having length one, that area equals the distance between the points.
	let distance = Vector2D.sub(lineStart, lineEnd).normalize().cross(Vector2D.sub(point, lineEnd));
	return absolute ? Math.abs(distance) : distance;
}

/**
 * Returns whether the two lines of the given with going through the given Vector2D intersect.
 */
function testLineIntersection(start1, end1, start2, end2, width)
{
	let start1end1 = Vector2D.sub(start1, end1);
	let start2end2 = Vector2D.sub(start2, end2);
	let start1start2 = Vector2D.sub(start1, start2);

	return (
		distanceOfPointFromLine(start1, end1, start2) < width ||
		distanceOfPointFromLine(start1, end1, end2) < width ||
		distanceOfPointFromLine(start2, end2, start1) < width ||
		distanceOfPointFromLine(start2, end2, end1) < width ||
		start1end1.cross(start1start2) * start1end1.cross(Vector2D.sub(start1, end2)) <= 0 &&
		start2end2.cross(start1start2) * start2end2.cross(Vector2D.sub(start2, end1)) >= 0);
}

/**
 * Sorts the given (x, y) points so that the distance between neighboring points becomes minimal (similar to the traveling salesman problem).
 */
function sortPointsShortestCycle(points)
{
	let order = [];
	let distances = [];
	if (points.length <= 3)
	{
		for (let i = 0; i < points.length; ++i)
			order.push(i);

		return order;
	}

	// Just add the first 3 points
	let pointsToAdd = points.map(pt => pt.clone()); // TODO: clone needed? if needed, needed sooner?
	for (let i = 0; i < 3; ++i)
	{
		order.push(i);
		pointsToAdd.shift(i);
		if (i)
			distances.push(points[order[i]].distanceTo(points[order[i - 1]]));
	}

	distances.push(points[order[0]].distanceTo(points[order[order.length - 1]]));

	// Add remaining points so the path lengthens the least
	let numPointsToAdd = pointsToAdd.length;
	for (let i = 0; i < numPointsToAdd; ++i)
	{
		let indexToAddTo;
		let minEnlengthen = Infinity;
		let minDist1 = 0;
		let minDist2 = 0;
		for (let k = 0; k < order.length; ++k)
		{
			let dist1 = pointsToAdd[0].distanceTo(points[order[k]]);
			let dist2 = pointsToAdd[0].distanceTo(points[order[(k + 1) % order.length]]);
			let enlengthen = dist1 + dist2 - distances[k];
			if (enlengthen < minEnlengthen)
			{
				indexToAddTo = k;
				minEnlengthen = enlengthen;
				minDist1 = dist1;
				minDist2 = dist2;
			}
		}
		order.splice(indexToAddTo + 1, 0, i + 3);
		distances.splice(indexToAddTo, 1, minDist1, minDist2);
		pointsToAdd.shift();
	}

	return order;
}
