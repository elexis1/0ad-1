/**
 * Close the diplomacy/trade window if it was opened by the observermode.
 */
var g_ObserverWindowTimer;

/**
 * Time after which the window is closed if the observermode has opened it.
 */
var g_ObserverWindowTime = 3000;

function focusPlayerCommand(notification, player)
{
	// For observers, focus the camera on units commanded by the selected player
	if (!g_FollowPlayer || player != g_ViewedPlayer)
		return;

	let cmd = notification.cmd;

	// Ignore boring animals
	let entState = cmd.entities && cmd.entities[0] && GetEntityState(cmd.entities[0]);
	if (entState && entState.identity && entState.identity.classes &&
			entState.identity.classes.indexOf("Animal") != -1)
		return;

	// Focus the building to construct
	if (cmd.type == "repair")
	{
		let targetState = GetEntityState(cmd.target);
		if (targetState)
			Engine.CameraMoveTo(targetState.position.x, targetState.position.z);
	}
	else if (cmd.type == "delete-entities")
	{
		Engine.CameraMoveTo(notification.position.x, notification.position.y);
	}
	else if (cmd.type == "diplomacy" || cmd.type == "set-trading-goods")
	{
		openObserverWindow(cmd.type == "diplomacy");
	}
	// Focus commanded entities, but don't lose previous focus when training units
	else if (cmd.type != "train" && cmd.type != "research" && entState)
		setCameraFollow(cmd.entities[0]);

	// Select units affected by that command
	let selection = [];
	if (cmd.entities)
		selection = cmd.entities;
	if (cmd.target)
		selection.push(cmd.target);

	g_Selection.reset();
	g_Selection.addList(selection, false, true);
}

function openObserverWindow(diplomacy = false)
{
	let wasOpen = diplomacy ? g_IsDiplomacyOpen : g_IsTradeOpen;

	diplomacy ? openDiplomacy() : openTrade();

	if (g_ObserverWindowTimer)
		clearTimeout(g_ObserverWindowTimer);

	if (!wasOpen)
		g_ObserverWindowTimer = setTimeout(diplomacy ? closeDiplomacy : closeTrade, g_ObserverWindowTime);
}
