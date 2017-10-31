/**
 * A Terrain is a class that modifies an arbitrary property of a given tile.
 */

/**
 * SimpleTerrain paints the given texture on the terrain.
 *
 * Optionally it places an entity on the affected tiles and
 * replaces prior entities added by SimpleTerrain on the same tile.
 */
function SimpleTerrain(texture, templateName = undefined)
{
	if (texture === undefined)
		throw new Error("SimpleTerrain: texture not defined");

	this.texture = texture;
	this.templateName = templateName;
}

SimpleTerrain.prototype.place = function(x, z)
{
	if (g_Map.validT(x, z))
		g_Map.terrainObjects[x][z] = this.templateName ? new Entity(this.templateName, 0, x + 0.5, z + 0.5, randFloat(0, 2 * Math.PI)) : undefined;

	g_Map.texture[x][z] = g_Map.getTextureID(this.texture);
};

/**
 * RandomTerrain places one of the given Terrains on the tile.
 * It choses a random Terrain each tile.
 * This is commonly used to create heterogeneous forests.
 */
function RandomTerrain(terrains)
{
	if (!(terrains instanceof Array) || !terrains.length)
		throw new Error("RandomTerrain: Invalid terrains array");

	this.terrains = terrains;
}

RandomTerrain.prototype.place = function(x, z)
{
	pickRandom(this.terrains).place(x, z);
};


function createTerrain(terrain)
{
	if (!(terrain instanceof Array))
		return createSimpleTerrain(terrain);

	return new RandomTerrain(terrain.map(t => createTerrain(t)));
}

function createSimpleTerrain(terrain)
{
	if (typeof terrain != "string")
		throw new Error("createSimpleTerrain expects string as input, received " + uneval(terrain));

	// Split string by pipe | character, this allows specifying terrain + tree type in single string
	let params = terrain.split(TERRAIN_SEPARATOR, 2);

	if (params.length != 2)
		return new SimpleTerrain(terrain);

	return new SimpleTerrain(params[0], params[1]);
}

function placeTerrain(x, z, terrain)
{
	createTerrain(terrain).place(x, z);
}

function initTerrain(terrainNames)
{
	let terrain = createTerrain(terrainNames);

	for (let x = 0; x < getMapSize(); ++x)
		for (let z = 0; z < getMapSize(); ++z)
			terrain.place(x, z);
}
