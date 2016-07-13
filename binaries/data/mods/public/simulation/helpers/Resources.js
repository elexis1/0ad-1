
var Resources = {};

Resources.LoadData = function()
{
	this.resourceData = [];
	this.resourceCodes = [];

	let jsonFiles = Engine.FindJSONFiles("resources", false);
	for (let filename of jsonFiles)
	{
		let data = Engine.ReadJSONFile("resources/" + filename + ".json");
		if (!data)
			continue;

		data.subtypes = Object.keys(data.subtypes);

		this.resourceData.push(data);
		this.resourceCodes.push(data.code);
	}
};

Resources.GetData = function()
{
	if (!this.resourceData)
		this.LoadData();

	return this.resourceData;
};

Resources.GetResource = function(type)
{
	let lType = type.toLowerCase();
	return this.GetData().find(resource => resource.code == lType);
};

Resources.GetCodes = function()
{
	if (!this.resourceData)
		this.LoadData();

	return this.resourceCodes;
};

/**
 * Returns an object containing untranslated resource names mapped to
 * resource codes. Includes subtypes.
 */
Resources.GetNames = function()
{
	let names = {};
	for (let res of this.GetData())
	{
		names[res.code] = res.name;
		for (let subres of res.subtypes)
			names[subres] = res.subtypes[subres]
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
Resources.BuildSchema = function(datatype, additional = [], subtypes = false)
{
	if (!datatype)
		return "";

	if (!this.resourceData)
		this.LoadData();

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
Resources.BuildChoicesSchema = function(subtypes = false, treasure = false)
{
	if (!this.resourceData)
		this.LoadData();

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

Engine.RegisterGlobal("Resources", Resources);
