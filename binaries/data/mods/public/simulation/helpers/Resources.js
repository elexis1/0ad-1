/**
 * Resource handling helper script
 *
 */

var Resources = {};

/**
 * Returns an object containing all readable resource data
 */
Resources.LoadData = function()
{
	this.resourceData = [];
	let jsonFiles = Engine.FindJSONFiles("resources", false);
	
	for (let filename of jsonFiles)
	{
		let data = Engine.ReadJSONFile("resources/"+filename+".json");
		if (!data)
			continue;

		this.resourceData.push(data);
	}
	return this.resourceData;
};

/**
 * Returns resource data as an Array
 * 
 * @param allResources If false, will only return "enabled" resources
 */
Resources.GetData = function(allResources = false)
{
	if (!this.resourceData)
		this.LoadData();

	return this.resourceData.filter((resource) => { return allResources || resource.enabled });
};

/**
 * Returns resource data as an Object
 * 
 * @param allResources If false, will only return "enabled" resources
 */
Resources.GetDataAsObj = function(allResources = false)
{
	let resourceObject = {};
	for (let res of this.GetData(allResources))
		resourceObject[res.code] = res;
	return resourceObject;
};

/**
 * Returns data of a single resource. Only returns data about valid and enabled resources.
 * 
 * @param type Resource generic type
 * @return The resource data if found, else false
 */
Resources.GetResource = function(type)
{
	let data = this.GetData();
	type = type.toLowerCase();

	return data.find((resource) => { return resource.code == type; }) || false;
};

/**
 * Returns an array of codes belonging to the resources
 * 
 * @param allResources If false, will only return "enabled" resources
 * @return Array of generic resource type codes
 */
Resources.GetCodes = function(allResources = false)
{
	return this.GetData(allResources).map((resource) => { return resource.code });
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

	let schema = "<interleave>";
	for (let res of this.GetCodes(true).concat(additional))
		schema +=
			"<optional>" +
				"<element name='" + res + "'>" +
					datatype +
				"</element>" +
			"</optional>";

	if (!subtypes)
		return schema + "</interleave>";

	for (let res of this.GetData(true))
		for (let subtype of res.subtypes)
			schema +=
				"<optional>" +
					"<element name='" + res.code + "." + subtype + "'>" +
						datatype +
					"</element>" +
				"</optional>";

	if (additional.indexOf("treasure") !== -1)
		for (let res of this.GetCodes(true))
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
Resources.BuildChoicesSchema = function(subtypes=false, treasure = false)
{
	let schema = "<choice>";

	if (!subtypes)
	{
		treasure = treasure ? [ "treasure" ] : [];
		for (let res of Resources.GetCodes(true).concat(treasure))
			schema += "<value>" + res + "</value>";
	}
	else
		for (let res of Resources.GetData(true))
		{
			for (let subtype of res.subtypes)
				schema += "<value>" + res.code + "." + subtype + "</value>";
			if (treasure)
				schema += "<value>" + "treasure." + res.code + "</value>";
		}

	return schema + "</choice>";
}

Engine.RegisterGlobal("Resources", Resources);
