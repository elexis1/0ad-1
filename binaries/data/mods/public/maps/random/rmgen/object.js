/**
 * An Object holds entity specifications and finding a location for them without actually placing them.
 */
function SimpleObject(templateName, minCount, maxCount, minDistance, maxDistance, minAngle = 0, maxAngle = 2 * Math.PI)
{
	this.templateName = templateName;
	this.minCount = minCount;
	this.maxCount = maxCount;
	this.minDistance = minDistance;
	this.maxDistance = maxDistance;
	this.minAngle = minAngle;
	this.maxAngle = maxAngle;

	if (minCount > maxCount)
		warn("SimpleObject: minCount should be less than or equal to maxCount");

	if (minDistance > maxDistance)
		warn("SimpleObject: minDistance should be less than or equal to maxDistance");

	if (minAngle > maxAngle)
		warn("SimpleObject: minAngle should be less than or equal to maxAngle");
}

SimpleObject.prototype.place = function(cx, cz, player, avoidSelf, constraint, maxFailCount = 20)
{
	let resultObjs = [];
	let failCount = 0;

	for (let i = 0; i < randIntInclusive(this.minCount, this.maxCount); ++i)
		while (true)
		{
			let distance = randFloat(this.minDistance, this.maxDistance);
			let direction = randFloat(0, 2 * Math.PI);

			let x = cx + 0.5 + distance * Math.cos(direction);
			let z = cz + 0.5 + distance * Math.sin(direction);
			let fail = false;

			if (!g_Map.validT(x, z))
				fail = true;
			else
			{
				if (avoidSelf)
					for (let obj of resultObjs)
						if (getDistanceToSquared(x, z, obj.position.x, obj.position.z) < 1)
						{
							fail = true;
							break;
						}

				if (!fail)
				{
					if (!constraint.allows(Math.floor(x), Math.floor(z)))
						fail = true;
					else
					{
						resultObjs.push(new Entity(this.templateName, player, x, z, randFloat(this.minAngle, this.maxAngle)));
						break;
					}
				}
			}

			if (fail)
			{
				++failCount;
				if (failCount > maxFailCount)
					return undefined;
			}
		}

	return resultObjs;
};

/**
 * Same as SimpleObject, but choses one of the given templateNames at random.
 */
function RandomObject(templateNames, minCount, maxCount, minDistance, maxDistance, minAngle, maxAngle)
{
	this.object = new SimpleObject(pickRandom(this.templateNames), minCount, maxCount, minDistance, maxDistance, minAngle, maxAngle);
}

RandomObject.prototype.place = function(cx, cz, player, avoidSelf, constraint, maxFailCount = 20)
{
	this.object.place(cx, cz, player, avoidSelf, constraint, maxFailCount);
};
