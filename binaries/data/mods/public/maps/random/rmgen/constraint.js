///////////////////////////////////////////////////////////////////////////
//	NullConstraint
//
//	Class representing null constraint - always valid
//
///////////////////////////////////////////////////////////////////////////

function NullConstraint() {}

NullConstraint.prototype.allows = function(x, z)
{
	return true;
};

///////////////////////////////////////////////////////////////////////////
//	AndConstraint
//
//	Class representing a logical AND constraint
//
//	constraints: Array of contraint objects, all of which must be satisfied
//
///////////////////////////////////////////////////////////////////////////

function AndConstraint(constraints)
{
	this.constraints = constraints;
}

AndConstraint.prototype.allows = function(x, z)
{
	return this.constraints.every(constraint => constraint.allows(x, z));
};

///////////////////////////////////////////////////////////////////////////
//	AvoidAreaConstraint
//
//	Class representing avoid area constraint
//
//	area: Area object, containing points to be avoided
//
///////////////////////////////////////////////////////////////////////////
function AvoidAreaConstraint(area)
{
	this.area = area;
}

AvoidAreaConstraint.prototype.allows = function(x, z)
{
	return g_Map.area[x][z] != this.area.getID();
};

///////////////////////////////////////////////////////////////////////////
//	AvoidTextureConstraint
//
//	Class representing avoid texture constraint
//
//	textureID: ID of the texture to be avoided
//
///////////////////////////////////////////////////////////////////////////
function AvoidTextureConstraint(textureID)
{
	this.textureID = textureID;
}

AvoidTextureConstraint.prototype.allows = function(x, z)
{
	return g_Map.texture[x][z] != this.textureID;
};

///////////////////////////////////////////////////////////////////////////
//	AvoidTileClassConstraint
//
//	Class representing avoid TileClass constraint
//
//	tileClassID: ID of the TileClass to avoid
//	distance: distance by which it must be avoided
//
///////////////////////////////////////////////////////////////////////////
function AvoidTileClassConstraint(tileClassID, distance)
{
	this.tileClass = getTileClass(tileClassID);
	this.distance = distance;
}

AvoidTileClassConstraint.prototype.allows = function(x, z)
{
	return this.tileClass.countMembersInRadius(x, z, this.distance) == 0;
};

///////////////////////////////////////////////////////////////////////////
//	StayInTileClassConstraint
//
//	Class representing stay in TileClass constraint
//
//	tileClassID: ID of TileClass to stay within
//	distance: distance from test point to find matching TileClass
//
///////////////////////////////////////////////////////////////////////////
function StayInTileClassConstraint(tileClassID, distance)
{
	this.tileClass = getTileClass(tileClassID);
	this.distance = distance;
}

StayInTileClassConstraint.prototype.allows = function(x, z)
{
	return this.tileClass.countNonMembersInRadius(x, z, this.distance) == 0;
};

///////////////////////////////////////////////////////////////////////////
//	BorderTileClassConstraint
//
//	Class representing border TileClass constraint
//
//	tileClassID: ID of TileClass to border
//	distanceInside: Distance from test point to find other TileClass
//	distanceOutside: Distance from test point to find matching TileClass
//
///////////////////////////////////////////////////////////////////////////
function BorderTileClassConstraint(tileClassID, distanceInside, distanceOutside)
{
	this.tileClass = getTileClass(tileClassID);
	this.distanceInside = distanceInside;
	this.distanceOutside = distanceOutside;
}

BorderTileClassConstraint.prototype.allows = function(x, z)
{
	return this.tileClass.countMembersInRadius(x, z, this.distanceOutside) &&
	       this.tileClass.countNonMembersInRadius(x, z, this.distanceInside);
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
