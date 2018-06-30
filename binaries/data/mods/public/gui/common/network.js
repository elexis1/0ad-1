/**
 * Latency at which the game performance becomes impaired.
 */
const inefficientRTT = Engine.GetTurnLength();

/**
 * Ratio at which the game performance becomes impaired.
 */
const inefficientPacketLoss = 0.25;

/**
 * Number of milliseconds to display network warnings.
 */
var g_NetworkWarningTimeout = 3000;

/**
 * Currently displayed network reports. At most one message per user.
 */
var g_NetworkWarnings = {};

var g_NetworkCommands = {
	"/kick": argument => kickPlayer(argument, false),
	"/ban": argument => kickPlayer(argument, true),
	"/kickspecs": argument => kickObservers(false),
	"/banspecs": argument => kickObservers(true),
	"/list": argument => addChatMessage({ "type": "clientlist" }),
	"/clear": argument => clearChatMessages()
};

var g_ValidPorts = { "min": 1, "max": 65535 };

function getValidPort(port)
{
	if (isNaN(+port) || +port < g_ValidPorts.min || +port > g_ValidPorts.max)
		return Engine.GetDefaultPort();

	return +port;
}

/**
 * Must be kept in sync with source/network/NetHost.h
 */
function getDisconnectReason(id, wasConnected)
{
	switch (id)
	{
	case 0: return wasConnected ?
		translateWithContext("network disconnect", "Unknown reason") :
		translate("This is often caused by UDP port 20595 not being forwarded on the host side, by a firewall, or anti-virus software");
	case 1: return translate("The host has ended the game");
	case 2: return translate("Incorrect network protocol version");
	case 3: return translate("Game is loading, please try again later");
	case 4: return translate("Game has already started, no observers allowed");
	case 5: return translate("You have been kicked");
	case 6: return translate("You have been banned");
	case 7: return translate("Playername in use. If you were disconnected, retry in few seconds");
	case 8: return translate("Server full");
	case 9: return translate("Secure lobby authentication failed. Join via lobby");
	default:
		warn("Unknown disconnect-reason ID received: " + id);
		return sprintf(translate("\\[Invalid value %(id)s]"), { "id": id });
	}
}

/**
 * @param {bool} isLocal - Whether this is a remote client or our connection.
 * @param {Object} performance - The performance data of a remote client passed by the NetClient.
 * @returns the String
 */
function getNetworkWarningString(isLocal, performance)
{
	if (performance.lastReceivedTime > 3000)
		return isLocal ?
			translate("Losing connection to server (%(seconds)ss)") :
			translate("%(player)s losing connection (%(seconds)ss)");

	if (performance.meanRTT > inefficientRTT)
		return isLocal ?
			translate("Bad connection to server (%(milliseconds)sms)") :
			translate("Bad connection to %(player)s (%(milliseconds)sms)");

	if (performance.packetLoss > inefficientPacketLoss)
		return isLocal ?
			translate("Bad connection to server (%(packetLossRatio)s%% packet loss)") :
			translate("Bad connection to %(player)s (%(packetLossRatio)s%% packet loss)");

	return "";
}

function getNetworkWarningText(string, performance, username)
{
	return sprintf(string, {
		"player": username,
		"seconds": Math.ceil(performance.lastReceivedTime / 1000),
		"milliseconds": performance.meanRTT,
		"packetLossRatio": (performance.packetLoss * 100).toFixed(1)
	})
}


/**
 * Show the disconnect reason in a message box.
 *
 * @param {number} reason
 */
function reportDisconnect(reason, wasConnected)
{
	// Translation: States the reason why the client disconnected from the server.
	let reasonText = sprintf(translate("Reason: %(reason)s."), { "reason": getDisconnectReason(reason, wasConnected) });

	messageBox(
		400, 200,
		(wasConnected ?
			translate("Lost connection to the server.") :
			translate("Failed to connect to the server.")
		) + "\n\n" + reasonText,
		translate("Disconnected")
	);
}

function kickError()
{
	addChatMessage({
		"type": "system",
		"text": translate("Only the host can kick clients!")
	});
}

function kickPlayer(username, ban)
{
	if (g_IsController)
		Engine.KickPlayer(username, ban);
	else
		kickError();
}

function kickObservers(ban)
{
	if (!g_IsController)
	{
		kickError();
		return;
	}

	for (let guid in g_PlayerAssignments)
		if (g_PlayerAssignments[guid].player == -1)
			Engine.KickPlayer(g_PlayerAssignments[guid].name, ban);
}

/**
 * Sort GUIDs of connected users sorted by playerindex, observers last.
 * Requires g_PlayerAssignments.
 */
function sortGUIDsByPlayerID()
{
	return Object.keys(g_PlayerAssignments).sort((guidA, guidB) => {

		let playerIdA = g_PlayerAssignments[guidA].player;
		let playerIdB = g_PlayerAssignments[guidB].player;

		if (playerIdA == -1) return +1;
		if (playerIdB == -1) return -1;

		return playerIdA - playerIdB;
	});
}

/**
 * Get a colorized list of usernames sorted by player slot, observers last.
 * Requires g_PlayerAssignments and colorizePlayernameByGUID.
 *
 * @returns {string}
 */
function getUsernameList()
{
	let usernames = sortGUIDsByPlayerID().map(guid => colorizePlayernameByGUID(guid));

	// Translation: Number of currently connected players/observers and their names
	return sprintf(translate("Users (%(num)s): %(users)s"), {
		"users": usernames.join(translate(", ")),
		"num": usernames.length
	});
}

/**
 * Execute a command locally. Requires addChatMessage.
 *
 * @param {string} input
 * @returns {Boolean} whether a command was executed
 */
function executeNetworkCommand(input)
{
	if (input.indexOf("/") != 0)
		return false;

	let command = input.split(" ", 1)[0];
	let argument = input.substr(command.length + 1);

	if (g_NetworkCommands[command])
		g_NetworkCommands[command](argument);

	return !!g_NetworkCommands[command];
}

/**
 * Creates a report for each network client with a critically bad network connection to be displayed for some duration.
 */
function pollNetworkWarnings()
{
	if (Engine.ConfigDB_GetValue("user", "overlay.netwarnings") != "true")
		return;

	let clientPerformance = Engine.GetNetworkClientPerformance();
	if (!clientPerformance)
		return;

	for (let guid in clientPerformance)
	{
		let string = getNetworkWarningString(guid == Engine.GetPlayerGUID(), clientPerformance[guid]);

		if (string)
			g_NetworkWarnings[guid] = {
				"added": Date.now(),
				"string": string,
				"performance":  clientPerformance[guid]
			};
	}
}

/**
 * Colorizes and concatenates all network warnings.
 * Returns text and textWidth.
 */
function getNetworkWarnings()
{
	if (Engine.ConfigDB_GetValue("user", "overlay.netwarnings") != "true")
		return {
			"messages": [],
			"maxTextWidth": 0
		};

	// Remove outdated messages
	for (let guid in g_NetworkWarnings)
		if (Date.now() > g_NetworkWarnings[guid].added + g_NetworkWarningTimeout || !g_PlayerAssignments[guid])
			delete g_NetworkWarnings[guid];

	// Show local messages first
	let guids = Object.keys(g_NetworkWarnings).sort(guid => guid != Engine.GetPlayerGUID());

	let font = Engine.GetGUIObjectByName("gameStateNotifications").font;

	let messages = [];
	let maxTextWidth = 0;

	for (let guid of guids)
	{
		// Add formatted text
		messages.push(getNetworkWarningText(g_NetworkWarnings[guid].string, g_NetworkWarnings[guid].performance, colorizePlayernameByGUID(guid)));

		// Add width of unformatted text
		let textWidth = Engine.GetTextWidth(font, getNetworkWarningText(g_NetworkWarnings[guid].string, g_NetworkWarnings[guid].performance, g_PlayerAssignments[guid].name));
		maxTextWidth = Math.max(textWidth, maxTextWidth);
	}

	return {
		"messages": messages,
		"maxTextWidth": maxTextWidth
	};
}
