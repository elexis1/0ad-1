
/**
 * Resources Global
 *
 * Engine.FindJSONFiles only exists within the session context
 * Engine.BuildDirEntList only exists within the gui context
 * The AI and test contexts have no access to any JSON file access functions
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

		data.subtypeNames = data.subtypes;
		data.subtypes = Object.keys(data.subtypes);

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
		for (let subres of res.subtypes)
			names[subres] = res.subtypeNames[subres]
	}
	return names;
};

/**
 * Builds a RelaxRNG schema based on currently valid elements.
 *
 * To prevent validation errors, disabled resources are included in the schema.
 *
 * @param datatype The datatype of the element
 * @param additional Array of additional data elements. Time, xp, treasure, etc.
 * @param subtypes If true, resource subtypes will be included as well.
 * @return RelaxNG schema string
 */
Resources.prototype.BuildSchema = function(datatype, additional = [], subtypes = false)
{
	if (!datatype)
		return "";

	switch (datatype)
	{
	case "decimal":
	case "nonNegativeDecimal":
	case "positiveDecimal":
		datatype = "<ref name='" + datatype + "'/>";
		break;

	default:
		datatype = "<data type='" + datatype + "'/>";
	}

	let resCodes = this.resourceData.map(resource => resource.code);
	let schema = "<interleave>";
	for (let res of resCodes.concat(additional))
		schema +=
			"<optional>" +
				"<element name='" + res + "'>" +
					datatype +
				"</element>" +
			"</optional>";

	if (!subtypes)
		return schema + "</interleave>";

	for (let res of this.resourceData)
		for (let subtype of res.subtypes)
			schema +=
				"<optional>" +
					"<element name='" + res.code + "." + subtype + "'>" +
						datatype +
					"</element>" +
				"</optional>";

	if (additional.indexOf("treasure") !== -1)
		for (let res of resCodes)
			schema +=
				"<optional>" +
					"<element name='" + "treasure." + res + "'>" +
						datatype +
					"</element>" +
				"</optional>";

	return schema + "</interleave>";
}

/**
 * Builds the value choices for a RelaxNG `<choice></choice>` object, based on currently valid resources.
 *
 * @oaram subtypes If set to true, the choices returned will be resource subtypes, rather than main types
 * @param treasure If set to true, the pseudo resource 'treasure' (or its subtypes) will be included
 * @return String of RelaxNG Schema `<choice/>` values.
 */
Resources.prototype.BuildChoicesSchema = function(subtypes = false, treasure = false)
{
	let schema = "<choice>";

	if (!subtypes)
	{
		let resCodes = this.resourceData.map(resource => resource.code);
		for (let res of resCodes.concat(treasure ? [ "treasure" ] : []))
			schema += "<value>" + res + "</value>";
	}
	else
		for (let res of this.resourceData)
		{
			for (let subtype of res.subtypes)
				schema += "<value>" + res.code + "." + subtype + "</value>";
			if (treasure)
				schema += "<value>" + "treasure." + res.code + "</value>";
		}

	return schema + "</choice>";
}
