function GeoLite2(ipAddress)
{
	let data = Engine.GetGeoLite2(ipAddress);
	this.data = data.length && this.ParseData(data[0], data[1]);
}

GeoLite2.FromGUID = function(guid)
{
	return new GeoLite2(Engine.GetClientIPAddress(guid));
};

GeoLite2.prototype.Headers = {
	"Blocks": {
		"Country":
			// For example: "92.222.251.176/28,3017382,3017382,,0,0"
			"network,geoname_id,registered_country_geoname_id,represented_country_geoname_id,is_anonymous_proxy,is_satellite_provider",

		"City":
			// For example: "38.88.98.0/23,6075357,6252001,,0,0,L5J,43.5102,-79.6296,500"
			"network,geoname_id,registered_country_geoname_id,represented_country_geoname_id,is_anonymous_proxy,is_satellite_provider,postal_code,latitude,longitude,accuracy_radius"
	},
	"Locations": {
		"Country":
			// For example: "2264397,en,EU,Europe,PT,Portugal,1"
			"geoname_id,locale_code,continent_code,continent_name,country_iso_code,country_name,is_in_european_union",
		"City":
			// For example: "11696023,en,NA,"North America",CA,Canada,QC,Quebec,,,Sainte-Claire,,America/Toronto,0"
			"geoname_id,locale_code,continent_code,continent_name,country_iso_code,country_name,subdivision_1_iso_code,subdivision_1_name,subdivision_2_iso_code,subdivision_2_name,city_name,metro_code,time_zone,is_in_european_union"
	}
};

GeoLite2.prototype.GetData = function()
{
	return this.data;
};

GeoLite2.prototype.ParseData = function(block, location)
{
	let hasCity = location.length > 11; // TODO: Decide by header matchings

	let formatName = name => name.replace(/"/g, "");

	return Object.assign(
		// Blocks data
		{
			// For example: 0
			"isAnonymousProxy": block[3],
			// For example: 1
			"isSatelliteProvider": block[4]
		},
		hasCity ?
			{
				// For example: L5J
				"postalCode": block[5],
				// For example: 43.5102
				"latitude": block[6],
				// For example: -79.6296
				"longitude": block[7],
				// For example: 500
				"accuracyRadius": block[8]
			} :
			{},
		// Location data
		{
			// For example "EU"
			"continentCode": location[1],
			// For example "Europe"
			"continentName": formatName(location[2]),
			// For example: "PT"
			"countryCode": location[3],
			// For example "Portugal"
			"countryName": formatName(location[4])
		},
		hasCity ?
			{
				// For example: "QC"
				"subdivision1Code": location[5],
				// For example: "Quebec"
				"subdivision1Name": formatName(location[6]),
				// For example:
				"subdivision2Code": location[7],
				// For example:
				"subdivision2Name": formatName(location[8]),
				// For example: "Sainte-Claire"
				"cityName": formatName(location[9]),
				// For example:
				"metroCode": location[10],
				// For example: "America/Toronto"
				"timezone": location[11]
			} :
			{},
		{
			// For example: 0
			"is_in_european_union": hasCity ? location[5] : location[12]
		});
};

GeoLite2.prototype.GetSortKey = function()
{
	if (!this.data)
		return "";

	return this.data.continentCode + "/" + this.data.countryCode + "/" + (this.data.cityCode || "");
};
