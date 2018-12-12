// TODO: this should show whether the client is rejoining at the moment

var g_IsController;

// TODO: page needs to be reloaded in case of updates
var g_PlayerAssignments;
var g_GameAttributes;

// TODO: display host
// TODO: allow giving host controls to clients
// TODO: allow muting clients
// TODO: display if clients are too slow with the simulation

var g_ClientListLastUpdate = 0;

var g_SelectedClientGUID;

function init(data, hotloadData)
{
	g_PlayerAssignments = hotloadData ? hotloadData.playerAssignments : data.playerAssignments;
	g_GameAttributes = hotloadData ? hotloadData.gameAttributes : data.gameAttributes;
	g_IsController = hotloadData ? hotloadData.isController : data.isController;
	updateClientList();
}

function getHotloadData()
{
	return {
		"isController": g_IsController,
		"gameAttributes": g_GameAttributes,
		"playerAssignments": g_PlayerAssignments
	};
}

function onTick()
{
	let now = Date.now();

	if (now <= g_ClientListLastUpdate + 1000)
		return;

	pollNetworkWarnings();
	g_ClientListLastUpdate = now;
	updateClientList();
}

function onClientSelection()
{
	let clientList = Engine.GetGUIObjectByName("clientList");
	g_SelectedClientGUID = clientList.list[clientList.selected] || undefined;

	for (let name of ["kickButton", "banButton"])
	{
		let button = Engine.GetGUIObjectByName(name);
		button.hidden = !g_IsController;
		button.enabled = g_SelectedClientGUID && g_SelectedClientGUID != Engine.GetPlayerGUID();
	}
}

function updateClientList()
{
	let clientPerformance = Engine.GetNetworkClientPerformance();

	let clientList = Engine.GetGUIObjectByName("clientList");
	let guids = Object.keys(clientPerformance).filter(guid => !!g_PlayerAssignments[guid]).sort((guid1, guid2) =>
		clientList.selected_column_order *
		(clientList.selected_column == "name" ?
			g_PlayerAssignments[guid1].name.localeCompare(g_PlayerAssignments[guid2].name) :
		clientList.selected_column == "status" ?
			// TODO
			g_PlayerAssignments[guid1].name.localeCompare(g_PlayerAssignments[guid2].name) :
			clientPerformance[guid1][clientList.selected_column] - clientPerformance[guid2][clientList.selected_column]));

	clientList.list_name = guids.map(guid => setStringTags(g_PlayerAssignments[guid].name, {
		"color": g_GameAttributes.settings.PlayerData[g_PlayerAssignments[guid].player] ?
				rgbToGuiColor(g_GameAttributes.settings.PlayerData[g_PlayerAssignments[guid].player].Color) :
		        "white"
	}));

	clientList.list_status = guids.map(guid =>
		getNetworkWarningText(
			getNetworkWarningString(guid == Engine.GetPlayerGUID(), clientPerformance[guid]),
			clientPerformance[guid],
			g_PlayerAssignments[guid].name) ||
		translate("Ok"));

	clientList.list_meanRTT = guids.map(guid =>	{
		let lastReceivedTime = clientPerformance[guid].lastReceivedTime > 3000 ? clientPerformance[guid].lastReceivedTime : 0;
		let meanRTT = Math.max(clientPerformance[guid].meanRTT, lastReceivedTime);
		return meanRTT == 0 ?
			translateWithContext("unknown mean roundtriptime", "?") :
			coloredText(
				sprintf(translateWithContext("network latency", "%(milliseconds)sms"), {
					"milliseconds": meanRTT
				}),
				efficiencyToColor(1 - meanRTT / inefficientRTT))
	});

	clientList.list_packetLoss = guids.map(guid =>
		clientPerformance[guid].packetLoss == 0 ?
			translateWithContext("unknown packet loss ratio", "?") :
			coloredText(
				sprintf(translateWithContext("network packet loss", "%(packetLossRatio)s%%"), {
					"packetLossRatio": (clientPerformance[guid].packetLoss * 100).toFixed(1)
				}),
				efficiencyToColor(1 - clientPerformance[guid].packetLoss / inefficientPacketLoss)));

	clientList.list = guids;

	clientList.selected = clientList.list.indexOf(g_SelectedClientGUID);
}

function askToKickSelectedClient()
{
}

function kickSelectedClient(ban)
{
	kickPlayer(g_PlayerAssignments[g_SelectedClientGUID].name, ban);
}
