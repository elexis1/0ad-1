const g_CinemaStart = 0;
Trigger.prototype.CounterMessage = function(data)
{
	this.DoAfterDelay(g_CinemaStart, "StartCutscene", {});
};

Trigger.prototype.StartCutscene = function(data)
{
	let cmpCinemaManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_CinemaManager);
	if (!cmpCinemaManager)
		return;
	cmpCinemaManager.AddCinemaPathToQueue("test");
	cmpCinemaManager.Play();
};

let cmpTrigger = Engine.QueryInterface(SYSTEM_ENTITY, IID_Trigger);
cmpTrigger.DoAfterDelay(0, "CounterMessage", {});
