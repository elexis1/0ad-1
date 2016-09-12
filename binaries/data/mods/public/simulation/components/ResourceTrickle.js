function ResourceTrickle() {}

ResourceTrickle.prototype.Schema = 
	"<a:help>Controls the resource trickle ability of the unit.</a:help>" +
	"<element name='Rates' a:help='Trickle Rates'>" +
		Resources.BuildSchema("nonNegativeDecimal") +
	"</element>" +
	"<element name='Interval' a:help='Number of miliseconds must pass for the player to gain the next trickle.'>" +
		"<ref name='nonNegativeDecimal'/>" +
	"</element>";

ResourceTrickle.prototype.Init = function()
{
	// Call the timer
	var cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
 	cmpTimer.SetInterval(this.entity, IID_ResourceTrickle, "Trickle", this.GetTimer(), this.GetTimer(), undefined);
};

ResourceTrickle.prototype.GetTimer = function()
{
	var interval = +this.template.Interval;
	return interval;
};

ResourceTrickle.prototype.GetRates = function()
{
	let rates = {};
	let resCodes = Resources.GetCodes();
	for (let resource in this.template.Rates)
	{
		if (resCodes.indexOf(resource) == -1)
			continue;
		rates[resource] = ApplyValueModificationsToEntity("ResourceTrickle/Rates/"+resource, +this.template.Rates[resource], this.entity);
	}

	return rates;
};

// Do the actual work here
ResourceTrickle.prototype.Trickle = function(data, lateness)
{
	let cmpPlayer = QueryOwnerInterface(this.entity, IID_Player);
	if (cmpPlayer)
		cmpPlayer.AddResources(this.GetRates());
};

Engine.RegisterComponentType(IID_ResourceTrickle, "ResourceTrickle", ResourceTrickle);
