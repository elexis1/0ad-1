var debugLog = false;

var debugWaterRise = false;

/**
 * Time in minutes when the players will be notified that the water level will rise.
 */
var waterRiseNotificationTime = [20, 22];

/**
 * Time in minutes when the water level starts to rise.
 * Allow players to build up the economy and military for some time.
 */
var waterRiseStartTime = [23, 26];

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
var waterIncreaseTime = [1.25, 1.75];

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

	if (newLevel < maxWaterLevel)
		this.DoAfterDelay((debugWaterRise ? 10 : randFloat(...waterIncreaseTime) * 60) * 1000, "RaiseWaterLevelStep", {});
	else
		this.debugLog("Water reached final level");

	let actorTemplates = {};
	let killedTemplates = {};

	let cmpRangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
	for (let ent of [...cmpRangeManager.GetEntitiesByPlayer(0), ...cmpRangeManager.GetNonGaiaEntities()])
	{
		let cmpPos = Engine.QueryInterface(ent, IID_Position);
		if (!cmpPos || !cmpPos.IsInWorld() || cmpPos.GetPosition().y >= newLevel)
			continue;

		let cmpVisualActor = Engine.QueryInterface(ent, IID_Visual);
		if (!cmpVisualActor)
			continue;

		let cmpIdentity = Engine.QueryInterface(ent, IID_Identity);
		if (!cmpIdentity)
			continue;

		let cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);
		let templateName = cmpTemplateManager.GetCurrentTemplateName(ent);

		// Animals and units drown
		let cmpHealth = Engine.QueryInterface(ent, IID_Health);
		if (cmpHealth && cmpIdentity.HasClass("Unit"))
		{
			cmpHealth.Kill();

			if (debugLog)
				killedTemplates[templateName] = (killedTemplates[templateName] || 0) + 1;

			continue;
		}

		// Resources and buildings become actors
		// Do not use ChangeEntityTemplate for performance and
		// because we don't need nor want the effects of MT_EntityRenamed

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

		if (debugLog)
			actorTemplates[templateName] = (actorTemplates[templateName] || 0) + 1;
	}

	this.debugLog("Checking entities took " + (new Date().getTime() - time));
	this.debugLog("Killed: " + uneval(killedTemplates));
	this.debugLog("Converted to actors: " + uneval(actorTemplates));
};


{
	let cmpTrigger = Engine.QueryInterface(SYSTEM_ENTITY, IID_Trigger);
	cmpTrigger.DoAfterDelay(randFloat(...waterRiseNotificationTime) * 60 * 1000, "RaisingWaterNotification", {});
	cmpTrigger.DoAfterDelay(debugWaterRise ? 0 : randFloat(...waterRiseStartTime) * 60 * 1000, "RaiseWaterLevelStep", {});
}
