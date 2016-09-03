/**
 * Close the trade window if it was opened by the observermode.
 */
var g_TradeTimer;

/**
 * Time after which the window is closed if the observermode has opened it.
 */
var g_TradeWindowTime = 3500;

function focusPlayerCommand(cmd, player)
{
	// For observers, focus the camera on units commanded by the selected player
	if (!g_FollowPlayer || player != g_ViewedPlayer)
		return;

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
	// Open the trade window for some seconds
	else if (cmd.type == "set-trading-goods")
	{
		let wasOpen = g_IsTradeOpen;
		openTrade();
		if (!wasOpen)
		{
			if (g_TradeTimer)
				clearTimeout(g_TradeTimer);

			g_ChatTimers.push(setTimeout(closeTrade, g_TradeWindowTime));
		}
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

	// Allow gaia in selection when gathering
	g_Selection.reset();
	g_Selection.addList(selection, false, cmd.type == "gather");
}
