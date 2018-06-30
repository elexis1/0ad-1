// TODO: display host
// TODO: allow giving host controls to clients
// TODO: allow muting clients
// TODO: display if clients are too slow with the simulation

var g_ClientListLastUpdate = 0;

var g_SelectedClientGUID;

// TODO: page needs to be reloaded in case of updates
var g_PlayerAssignments;

function init(data, hotloadData)
{
	g_PlayerAssignments = hotloadData ? hotloadData.playerAssignments : data.playerAssignments;
	updateClientList();
}

function getHotloadData()
{
	return {
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
		Engine.GetGUIObjectByName(name).enabled = g_SelectedClientGUID && g_SelectedClientGUID != Engine.GetPlayerGUID();
}

function updateClientList()
{
	let clientPerformance = Engine.GetNetworkClientPerformance();

	let clientList = Engine.GetGUIObjectByName("clientList");
	let guids = Object.keys(clientPerformance).filter(guid => g_PlayerAssignments[guid]).sort((guid1, guid2) =>
		clientList.selected_column_order *
		(clientList.selected_column == "name" ?
			g_PlayerAssignments[guid1].name.localeCompare(g_PlayerAssignments[guid2].name) :
		clientList.selected_column == "status" ?
			// TODO
			g_PlayerAssignments[guid1].name.localeCompare(g_PlayerAssignments[guid2].name) :
			clientPerformance[guid1][clientList.selected_column] - clientPerformance[guid2][clientList.selected_column]));

	// TODO: colorizePlayernameByGUID
	clientList.list_name = guids.map(guid => g_PlayerAssignments[guid].name);

	clientList.list_status = guids.map(guid =>
		getNetworkWarningText(
			getNetworkWarningString(guid == Engine.GetPlayerGUID(), clientPerformance[guid]),
			clientPerformance[guid],
			g_PlayerAssignments[guid].name) ||
		translate("Ok"));

	clientList.list_meanRTT = guids.map(guid =>
		coloredText(
			sprintf(translateWithContext("network latency", "%(milliseconds)sms"), {
				"milliseconds": clientPerformance[guid].meanRTT
			}),
			efficiencyToColor(1 - clientPerformance[guid].meanRTT / inefficientRTT)));

	clientList.list_packetLoss = guids.map(guid =>
		coloredText(
			sprintf(translateWithContext("network packet loss", "%(packetLossRatio)s%%"), {
				"packetLossRatio": (clientPerformance[guid].packetLoss * 100).toFixed(1)
			}),
			efficiencyToColor(1 - clientPerformance[guid].packetLoss / inefficientPacketLoss)));

	clientList.list = guids;

	clientList.selected = clientList.list.indexOf(g_SelectedClientGUID);
}

function selectedClient()
{
}

function askToKickSelectedClient()
{
}

function kickSelectedClient(ban)
{
	let name = "";
	kickPlayer(name, ban);
}