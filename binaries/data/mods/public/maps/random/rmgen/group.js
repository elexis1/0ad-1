/**
 * Places all of the given objects.
 *
 * @param objects - Array of Objects.
 * @param avoidSelf - Objects will not overlap.
 * @param tileClass - Optional tile class to add with these objects.
 * @param x, z - Optional tile coordinates of center of placer.
 */
function SimpleGroup(objects, avoidSelf = false, tileClass = undefined, x = -1, z = -1)
{
	this.objects = objects;
	this.tileClass = tileClass;
	this.avoidSelf = avoidSelf;
	this.x = x;
	this.z = z;
}

SimpleGroup.prototype.place = function(player, constraint)
{
	let resultObjs = [];

	// Try placement
	for (let element of this.objects)
	{
		let objs = element.place(this.x, this.z, player, this.avoidSelf, constraint);

		if (objs === undefined)
			return undefined;

		resultObjs = resultObjs.concat(objs);
	}

	// Add placed objects to map
	for (let obj of resultObjs)
	{
		let x = obj.position.x / CELL_SIZE;
		let z = obj.position.z / CELL_SIZE;

		if (g_Map.validT(x, z))
			g_Map.addObject(obj);

		if (this.tileClass !== undefined)
			getTileClass(this.tileClass).add(Math.floor(x), Math.floor(z));
	}

	return resultObjs;
};

/**
 * Places one of the given SimpleObjects.
 */
function RandomGroup(objects, avoidSelf = false, tileClass = undefined, x = -1, z = -1)
{
	this.group = new SimpleGroup([pickRandom(objects)], avoidSelf, tileClass, x, z);
}

RandomGroup.prototype.place = function(player, constraint)
{
	return this.group.place(player, constraint);
};

