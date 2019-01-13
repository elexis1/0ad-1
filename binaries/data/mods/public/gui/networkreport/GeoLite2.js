function GeoLite2Cache()
{
	this.geoLite2 = {};
}

GeoLite2Cache.prototype.GetByIP = function(ipAddress)
{
	// Also cache undefined return value
	if (!(ipAddress in this.geoLite2))
	{
		this.geoLite2[ipAddress] = Engine.GetGeoLite2(ipAddress);

		if (this.geoLite2[ipAddress])
			deepfreeze(this.geoLite2[ipAddress]);
	}

	return this.geoLite2[ipAddress];
};

GeoLite2Cache.prototype.GetByGUID = function(guid)
{
	return this.GetByIP(Engine.GetClientIPAddress(guid));
};
