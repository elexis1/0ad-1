// TODO: cache?
function GeoLite2(guid)
{
	// geoname_id,locale_code,continent_code,continent_name,country_iso_code,country_name,is_in_european_union
	let geoLite2 = Engine.GeoLite2_LookupIPv4(Engine.GetClientIPAddress(guid));
	return geoLite2.length && {
		"continentCode": geoLite2[1],
		"continent": geoLite2[2].replace(/"/g, ""),
		"countryCode": geoLite2[3],
		"country": geoLite2[4].replace(/"/g, "")
	};
}
