var currentLavaHeight = 0;

var lavaRiseStartTime = 1000;

var lavaRiseFrequency = 1000;

var lavaRiseIncrease = 1;

Trigger.prototype.RiseLava = function()
{
	currentLavaHeight += lavaRiseIncrease;

	Engine.QueryInterface(SYSTEM_ENTITY, IID_WaterManager).SetWaterLevel(currentLavaHeight);

	this.DoAfterDelay(lavaRiseFrequency, "RiseLava", {});
};


{
	let cmpTrigger = Engine.QueryInterface(SYSTEM_ENTITY, IID_Trigger);
	cmpTrigger.DoAfterDelay(lavaRiseStartTime, "RiseLava", {});
}
