/**
 * A Constraint decides if a tile satisfies a condition defined by the class.
 */

/**
 * The NullConstraint is always satisfied.
 */
function NullConstraint() {}

NullConstraint.prototype.allows = function(x, z)
{
	return true;
};

/**
 * The AndConstraint is met if every given Constraint is satisfied by the tile.
 */
function AndConstraint(constraints)
{
	this.constraints = constraints;
}

AndConstraint.prototype.allows = function(x, z)
{
	return this.constraints.every(constraint => constraint.allows(x, z));
};

/**
 * The AvoidAreaConstraint is met if the tile is not part of the given Area.
 */
function AvoidAreaConstraint(area)
{
	this.area = area;
}

AvoidAreaConstraint.prototype.allows = function(x, z)
{
	return g_Map.area[x][z] != this.area.getID();
};

/**
 * The AvoidTextureConstraint is met if the terrain texture of the tile is different from the given texture.
 */
function AvoidTextureConstraint(textureID)
{
	this.textureID = textureID;
}

AvoidTextureConstraint.prototype.allows = function(x, z)
{
	return g_Map.texture[x][z] != this.textureID;
};

/**
 * The AvoidTileClassConstraint is met if there are no tiles marked with the given TileClass within the given radius of the tile.
 */
function AvoidTileClassConstraint(tileClassID, distance)
{
	this.tileClass = getTileClass(tileClassID);
	this.distance = distance;
}

AvoidTileClassConstraint.prototype.allows = function(x, z)
{
	return this.tileClass.countMembersInRadius(x, z, this.distance) == 0;
};

/**
 * The StayInTileClassConstraint is met if every tile within the given radius of the tile is marked with the given TileClass.
 */
function StayInTileClassConstraint(tileClassID, distance)
{
	this.tileClass = getTileClass(tileClassID);
	this.distance = distance;
}

StayInTileClassConstraint.prototype.allows = function(x, z)
{
	return this.tileClass.countNonMembersInRadius(x, z, this.distance) == 0;
};

/**
 * The BorderTileClassConstraint is met if there are
 * tiles not marked with the given TileClass within distanceInside of the tile and
 * tiles marked with the given TileClass within distanceOutside of the tile.
 */
function BorderTileClassConstraint(tileClassID, distanceInside, distanceOutside)
{
	this.tileClass = getTileClass(tileClassID);
	this.distanceInside = distanceInside;
	this.distanceOutside = distanceOutside;
}

BorderTileClassConstraint.prototype.allows = function(x, z)
{
	return this.tileClass.countMembersInRadius(x, z, this.distanceOutside) > 0 &&
	       this.tileClass.countNonMembersInRadius(x, z, this.distanceInside) > 0;
};

/**
 * Create an avoid constraint for the given classes by the given distances
 */
function avoidClasses(/*class1, dist1, class2, dist2, etc*/)
{
	let ar = [];
	for (let i = 0; i < arguments.length / 2; ++i)
		ar.push(new AvoidTileClassConstraint(arguments[2 * i], arguments[2 * i + 1]));

	if (ar.length == 1)
		return ar[0];

	return new AndConstraint(ar);
}

/**
 * Create a stay constraint for the given classes by the given distances
 */
function stayClasses(/*class1, dist1, class2, dist2, etc*/)
{
	let ar = [];
	for (let i = 0; i < arguments.length / 2; ++i)
		ar.push(new StayInTileClassConstraint(arguments[2 * i], arguments[2 * i + 1]));

	if (ar.length == 1)
		return ar[0];

	return new AndConstraint(ar);
}

/**
 * Create a border constraint for the given classes by the given distances
 */
function borderClasses(/*class1, idist1, odist1, class2, idist2, odist2, etc*/)
{
	let ar = [];
	for (let i = 0; i < arguments.length / 3; ++i)
		ar.push(new BorderTileClassConstraint(arguments[3 * i], arguments[3 * i + 1], arguments[3 * i + 2]));

	if (ar.length == 1)
		return ar[0];

	return new AndConstraint(ar);
}
