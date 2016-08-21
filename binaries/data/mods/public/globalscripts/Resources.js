/**
 * Since the AI context can't access JSON functions, it gets passed an object
 * containing the information from `GuiInterface.js::GetSimulationState()`.
 */
function Resources()
{
	let jsonFiles = [];
	// Simulation context
	if (Engine.FindJSONFiles)
	{
		jsonFiles = Engine.FindJSONFiles("resources", false);
		for (let file in jsonFiles)
			jsonFiles[file] = "resources/" + jsonFiles[file] + ".json";
	}
	// GUI context
	else if (Engine.BuildDirEntList)
		jsonFiles = Engine.BuildDirEntList("simulation/data/resources/", "*.json", false);
	else
	{
		error("Resources: JSON functions are not available");
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
