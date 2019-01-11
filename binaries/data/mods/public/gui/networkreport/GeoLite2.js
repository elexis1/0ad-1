// TODO: Add a JS cache
function GeoLite2(ipAddress)
{
	this.data = Engine.GetGeoLite2(ipAddress);
}

GeoLite2.FromGUID = function(guid)
{
	return new GeoLite2(Engine.GetClientIPAddress(guid));
};

GeoLite2.prototype.GetData = function()
{
	return this.data;
};

GeoLite2.prototype.GetSortKey = function()
{
	return this.data ?
		this.data.continentCode + "/" + this.data.countryCode + "/" + (this.data.cityCode || "") :
		"";
};
