Trigger.prototype.StartCutscene = function(data)
{
    var cmpCinemaManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_CinemaManager);
    if (!cmpCinemaManager)
        return;
    cmpCinemaManager.AddCinemaPathToQueue("test");
    cmpCinemaManager.Play();
};

Trigger.prototype.CinemaPathEndedAction = function(data)
{
    warn('Cinema path has ended.');
    warn('Path name: ' + data['name'] + ' skipped: ' + data['skipped']);
};

var cmpTrigger = Engine.QueryInterface(SYSTEM_ENTITY, IID_Trigger);
var data = {"enabled": true};
cmpTrigger.RegisterTrigger("OnCinemaPathEnded", "CinemaPathEndedAction", data);
cmpTrigger.DoAfterDelay(40, "StartCutscene", {});