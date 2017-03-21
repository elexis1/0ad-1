/**
 * Time in minutes when the players will be notified that the water level will rise.
 */
var waterRiseNotificationTime = 0*15;

/**
 * Time in minutes when the water level starts to rise.
 * Allow players to build up the economy and military for some time.
 */
var waterRiseStartTime = 0*randFloat(20 , 25);

/**
 * Time in milliseconds determining how often to increase the water level.
 */
var waterLevelIncreaseFrequency = 2000;

/**
 * How much height to increase each step.
 */
var waterLevelIncreaseHeight = 1;

/**
 * At which height to stop increasing the water level.
 * Since players can survive on ships, don't endlessly raise the water.
 */
var maxWaterLevel = 70;

Trigger.prototype.StartingRaisingWater = function()
{
	Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface).AddTimeNotification({
		"message": markForTranslation("The water keeps rising, we have to evacuate soon!"),
		"translateMessage": true
	});

	this.DoAfterDelay((waterRiseStartTime - waterRiseNotificationTime) * 60 * 1000, "RaiseWaterLevelStep", {});
};

Trigger.prototype.RaiseWaterLevelStep = function()
{
	let cmpWaterManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_WaterManager);
	let newLevel = cmpWaterManager.GetWaterLevel() + waterLevelIncreaseHeight;
	warn("Raising water level to " + Math.round(newLevel));

	var t2 = new Date().getTime();
	cmpWaterManager.SetWaterLevel(newLevel);
	warn("Raising water took " + (new Date().getTime() - t2));

	var t0 = new Date().getTime();
	for (let ent of Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager).GetEntitiesByPlayer(0))
	{
		let cmpPos = Engine.QueryInterface(ent, IID_Position);
		if (!cmpPos || !cmpPos.IsInWorld() || cmpPos.GetPosition().y >= newLevel)
			continue;

		ChangeEntityTemplate(ent, "actor|flora/trees/oak.xml");
	}
	warn("Checking gaia ents took " + (new Date().getTime() - t0));

	var t1 = new Date().getTime();
	for (let ent of Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager).GetNonGaiaEntities())
	{
		//let cmpIdentity = Engine.QueryInterface(ent, IID_Identity);
		//cmpIdentity && MatchesClassList(cmpIdentity.GetClassesList(), targetClasses);
		let cmpPos = Engine.QueryInterface(ent, IID_Position);
		if (!cmpPos || !cmpPos.IsInWorld() || cmpPos.GetPosition().y >= newLevel)
			continue;

		let cmpHealth = QueryMiragedInterface(ent, IID_Health);
		if (cmpHealth)
			cmpHealth.Kill();
		else
			Engine.DestroyEntity(ent);
	}

	warn("Checking player ents took " + (new Date().getTime() - t1));

	if (newLevel > maxWaterLevel)
		return;

	// if all players defeated, stop
	// maxWaterLevel
	this.DoAfterDelay(waterLevelIncreaseFrequency, "RaiseWaterLevelStep", {});
};


{
	let cmpTrigger = Engine.QueryInterface(SYSTEM_ENTITY, IID_Trigger);
	cmpTrigger.DoAfterDelay(waterRiseStartTime * 60 * 1000, "StartingRaisingWater", {});
}
