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

		if (data.code != data.code.toLowerCase())
			warn("Resource codes should use lower case: " + data.code);

		this.resourceData.push(data);
		this.resourceCodes.push(data.code);
	}

	let resSort = (a, b) =>
		a.order < b.order ? -1 :
		a.order > b.order ? +1 : 0;

	this.resourceData.sort(resSort);
	this.resourceCodes.sort((a, b) => resSort(
		this.resourceData.find(resource => resource.code == a),
		this.resourceData.find(resource => resource.code == b)
	));
};

Resources.prototype.GetData = function()
{
	return this.resourceData;
};

Resources.prototype.GetResource = function(type)
{
	return this.resourceData.find(resource => resource.code == type);
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
	for (let res of this.resourceData)
	{
		names[res.code] = res.name;
		for (let subres in res.subtypes)
			names[subres] = res.subtypes[subres]
	}
	return names;
};
