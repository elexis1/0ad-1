function getDistance(x1, z1, x2, z2)
{
	return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(z1 - z2, 2));
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

/**
 * Determines wheather two lines with the given width intersect.
 */
function checkIfIntersect(line1_x1, line1_y1, line1_x2, line1_y2, line2_x1, line2_y1, line2_x2, line2_y2, width)
{
	if (line1_x1 == line1_x2)
	{
		if (line2_x1 - line1_x1 < width || line2_x2 - line1_x2 < width)
			return true;
	}
	else
	{
		let m = (line1_y1 - line1_y2) / (line1_x1 - line1_x2);
		let b = line1_y1 - m * line1_x1;
		let m2 = Math.sqrt(m * m + 1);

		if (Math.abs((line2_y1 - line2_x1 * m - b) / m2) < width || Math.abs((line2_y2 - line2_x2 * m - b) / m2) < width)
			return true;

		if (line2_x1 == line2_x2)
		{
			if (line1_x1 - line2_x1 < width || line1_x2 - line2_x2 < width)
				return true;
		}
		else
		{
			let m = (line2_y1 - line2_y2) / (line2_x1 - line2_x2);
			let b = line2_y1 - m * line2_x1;
			let m2 = Math.sqrt(m * m + 1);
			if (Math.abs((line1_y1 - line1_x1 * m - b) / m2) < width || Math.abs((line1_y2 - line1_x2 * m - b) / m2) < width)
				return true;
		}
	}

	let s = (line1_x1 - line1_x2) * (line2_y1 - line1_y1) - (line1_y1 - line1_y2) * (line2_x1 - line1_x1);
	let p = (line1_x1 - line1_x2) * (line2_y2 - line1_y1) - (line1_y1 - line1_y2) * (line2_x2 - line1_x1);

	if (s * p <= 0)
	{
		s = (line2_x1 - line2_x2) * (line1_y1 - line2_y1) - (line2_y1 - line2_y2) * (line1_x1 - line2_x1);
		p = (line2_x1 - line2_x2) * (line1_y2 - line2_y1) - (line2_y1 - line2_y2) * (line1_x2 - line2_x1);

		if (s * p <= 0)
			return true;
	}

	return false;
}

/**
 * Sorts the given x/y points so that the distance between neighboring point becomes minimal (mostly traveling salesman problem).
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
	let pointsToAdd = clone(points);
	for (let i = 0; i < 3; ++i)
	{
		order.push(i);
		pointsToAdd.shift(i);
		if (i)
			distances.push(getDistance(points[order[i]].x, points[order[i]].y, points[order[i - 1]].x, points[order[i - 1]].y));
	}

	distances.push(getDistance(
		points[order[0]].x,
		points[order[0]].y,
		points[order[order.length - 1]].x,
		points[order[order.length - 1]].y));

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
			let dist1 = getDistance(pointsToAdd[0].x, pointsToAdd[0].y, points[order[k]].x, points[order[k]].y);
			let dist2 = getDistance(pointsToAdd[0].x, pointsToAdd[0].y, points[order[(k + 1) % order.length]].x, points[order[(k + 1) % order.length]].y);
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
