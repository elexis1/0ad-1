/**
 * Resources Global
 *
 * - `Engine.FindJSONFiles` only exists within the session context
 * - `Engine.BuildDirEntList` only exists within the gui context
 * - The AI and test contexts have no access to any JSON file access functions
 *   -- Therefore the AI gets passed an object containing the information it
 *     requires from `GuiInterface.js::GetSimulationState()`
 *   -- And the test environment... improvises.
 */
function Resources()
{
	let jsonFiles = [];
	if (Engine.FindJSONFiles)
	{
		jsonFiles = Engine.FindJSONFiles("resources", false);
		for (let file in jsonFiles)
			jsonFiles[file] = "resources/" + jsonFiles[file] + ".json";
	}
	else if (Engine.BuildDirEntList)
		jsonFiles = Engine.BuildDirEntList("simulation/data/resources/", "*.json", false);
	else
	{
		warn("Resources: No JSON access functions are unavailable");
		return;
	}

	this.resourceData = [];
	this.resourceCodes = [];

	for (let filename of jsonFiles)
	{
		let data = Engine.ReadJSONFile(filename);
		if (!data)
			continue;

		this.resourceData.push(data);
		if (data.enabled)
			this.resourceCodes.push(data.code);
	}
};

Resources.prototype.GetData = function()
{
	return this.resourceData.filter(resource => resource.enabled);
};

Resources.prototype.GetResource = function(type)
{
	let lType = type.toLowerCase();
	return this.GetData().find(resource => resource.code == lType);
};

Resources.prototype.GetCodes = function()
{
	return this.resourceCodes;
};

/**
 * Returns an object containing untranslated resource names mapped to
 * resource codes. Includes subtypes.
 */
Resources.prototype.GetNames = function()
{
	let names = {};
	for (let res of this.GetData())
	{
		names[res.code] = res.name;
		for (let subres in res.subtypes)
			names[subres] = res.subtypes[subres]
	}
	return names;
};
