var debugLog = true;

var debugWaterRise = false;

/**
 * Time in minutes when the players will be notified that the water level will rise.
 */
var waterRiseNotificationTime = [20, 22];

/**
 * Time in minutes when the water level starts to rise.
 * Allow players to build up the economy and military for some time.
 */
var waterRiseStartTime = [25, 30];

/**
 * Time in minutes determining how often to increase the water level.
 * If the water rises too fast, the hills are of no strategic importance,
 * building structures would be pointless.
 *
 * At height 27, most trees are not gatherable anymore and enemies not reachable.
 * At height 37 most hills are barely usable.
 *
 * At min 30 stuff at the ground level should not be gatherable anymore.
 * At min 60 CC should be destroyed.
 *
 * Notice regular and military docks will raise with the water!
 */
var waterIncreaseTime = [2, 3];

/**
 * How much height to increase each step.
 * Each time the water level is changed, the pathfinder grids have to be recomputed.
 * Therefore raising the level should occur as rarely as possible, i.e. have the value
 * as big as possible, but as small as needed to keep it visually authentic.
 */
var waterLevelIncreaseHeight = 1;

/**
 * At which height to stop increasing the water level.
 * Since players can survive on ships, don't endlessly raise the water.
 */
var maxWaterLevel = 70;

Trigger.prototype.RaisingWaterNotification = function()
{
	Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface).AddTimeNotification({
		"message": markForTranslation("The water keeps rising, we have to evacuate soon!"),
		"translateMessage": true
	});
};

Trigger.prototype.debugLog = function(txt)
{
	if (!debugLog)
		return;

	let time = Math.round(Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer).GetTime() / 60 / 1000);
	print("DEBUG [" + time + "] " + txt + "\n");
};

Trigger.prototype.RaiseWaterLevelStep = function()
{
	let time = new Date().getTime();
	let cmpWaterManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_WaterManager);
	let newLevel = cmpWaterManager.GetWaterLevel() + waterLevelIncreaseHeight;
	cmpWaterManager.SetWaterLevel(newLevel);
	this.debugLog("Raising water level to " + Math.round(newLevel) + " took " + (new Date().getTime() - time));

	time = new Date().getTime();
	let debugTemplates = {};
	let cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);
	for (let ent of Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager).GetEntitiesByPlayer(0))
	{
		let cmpPos = Engine.QueryInterface(ent, IID_Position);
		if (!cmpPos || !cmpPos.IsInWorld() || cmpPos.GetPosition().y >= newLevel)
			continue;

		let templateName = cmpTemplateManager.GetCurrentTemplateName(ent);
		if (!templateName)
			return false;

		let cmpVisualActor = Engine.QueryInterface(ent, IID_Visual);
		if (!cmpVisualActor)
			continue;

		// Animals drown
		let cmpIdentity = QueryMiragedInterface(ent, IID_Identity);
		let cmpHealth = QueryMiragedInterface(ent, IID_Health);
		if (cmpHealth && cmpIdentity.HasClass("Unit"))
		{
			cmpHealth.Kill();
			continue;
		}

		// Resources become actors
		// Do not use ChangeEntityTemplate for performance and
		// because we don't need nor want the effects of MT_EntityRenamed
		// For example not having the new (unselectable) entity selected

		let pos = cmpPos.GetPosition2D();
		let height = cmpPos.GetHeightOffset();
		let rot = cmpPos.GetRotation();
		let template = cmpTemplateManager.GetTemplate(templateName);
		let actorTemplate = template.VisualActor.Actor;
		let seed = cmpVisualActor.GetActorSeed();
		Engine.DestroyEntity(ent);

		let newEnt = Engine.AddEntity("actor|" + actorTemplate);
		Engine.QueryInterface(newEnt, IID_Visual).SetActorSeed(seed);

		let cmpNewPos = Engine.QueryInterface(newEnt, IID_Position);
		cmpNewPos.JumpTo(pos.x, pos.y);
		cmpNewPos.SetHeightOffset(height);
		cmpNewPos.SetXZRotation(rot.x, rot.z);
		cmpNewPos.SetYRotation(rot.y);

		debugTemplates[actorTemplate] = (debugTemplates[actorTemplate] || 0) + 1;
	}

	this.debugLog("Changing gaia entities to actors took " + (new Date().getTime() - time));
	this.debugLog("Changed the following entities: " + uneval(debugTemplates));

	// Destroy all player entities below the water
	// Men only once they are fully submerged (because they don't drown when their ankles get wet)
	debugTemplates = {};
	time = new Date().getTime();
	for (let ent of Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager).GetNonGaiaEntities())
	{
		let cmpPos = Engine.QueryInterface(ent, IID_Position);
		if (!cmpPos || !cmpPos.IsInWorld() || cmpPos.GetPosition().y >= newLevel)
			continue;

		let templateName = cmpTemplateManager.GetCurrentTemplateName(ent);
		debugTemplates[templateName] = (debugTemplates[templateName] || 0) + 1;

		let cmpHealth = QueryMiragedInterface(ent, IID_Health);
		if (cmpHealth)
			cmpHealth.Kill();
		else
			Engine.DestroyEntity(ent);
	}

	this.debugLog("Checking player entities took " + (new Date().getTime() - time));
	this.debugLog("Destroyed the following player entities: " + uneval(debugTemplates));

	if (newLevel > maxWaterLevel)
		return;

	this.DoAfterDelay((debugWaterRise ? 10 : randFloat(...waterIncreaseTime) * 60) * 1000, "RaiseWaterLevelStep", {});
};


{
	let cmpTrigger = Engine.QueryInterface(SYSTEM_ENTITY, IID_Trigger);
	cmpTrigger.DoAfterDelay(randFloat(...waterRiseNotificationTime) * 60 * 1000, "RaisingWaterNotification", {});
	cmpTrigger.DoAfterDelay(debugWaterRise ? 0 : randFloat(...waterRiseStartTime) * 60 * 1000, "RaiseWaterLevelStep", {});
}
