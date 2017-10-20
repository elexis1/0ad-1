function diskArea(radius)
{
	return Math.PI * Math.square(radius);
}

function rotateCoordinates(x, z, angle, centerX = 0.5, centerZ = 0.5)
{
	let sin = Math.sin(angle);
	let cos = Math.cos(angle);

	return [
		cos * (x - centerX) - sin * (z - centerZ) + centerX,
		sin * (x - centerX) + cos * (z - centerZ) + centerZ
	];
}

function cubicInterpolation2(coords, v0, v1, v2, v3)
{
	let P = (v3 - v2) - (v0 - v1);
	let Q = (v0 - v1) - P;
	let R = v2 - v0;
	let S = v1;

	let interpolate = x => ((P * x + Q) * x + R) * x + S;

	if (Array.isArray(coords))
		return coords.map(interpolate);

	return interpolate(coords);
}
