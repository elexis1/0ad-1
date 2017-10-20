function diskArea(radius)
{
	return Math.PI * Math.square(radius);
}

function getDistance(x1, z1, x2, z2)
{
	return Math.sqrt(getDistanceToSquared(x1, z1, x2, z2));
}

function getDistanceToSquared(x1, z1, x2, z2)
{
	return Math.square(x1 - x2) + Math.square(z1 - z2);
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
