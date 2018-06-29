var g_ClientListLastUpdate = 0;

var g_SelectedClientGUID;

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

	g_ClientListLastUpdate = now;
	updateClientList();
}

function onClientSelection()
{
	let clientList = Engine.GetGUIObjectByName("clientList");
	g_SelectedClientGUID = clientList.list[clientList.selected] || undefined;
}

function updateClientList()
{
	let clientPerformance = Engine.GetNetworkClientPerformance();
	
	let clientList = Engine.GetGUIObjectByName("clientList");
	let guids = Object.keys(clientPerformance).filter(guid => g_PlayerAssignments[guid]).sort((guid1, guid2) =>
		clientList.selected_column_order *
		(clientList.selected_column == "name" ?
			g_PlayerAssignments[guid1].localeCompare(g_PlayerAssignments[guid2]) :
			clientPerformance[guid1][clientList.selected_column] - clientPerformance[guid2][clientList.selected_column]));

	// TODO: status

	// TODO: colorizePlayernameByGUID
	clientList.list_name = guids.map(guid => g_PlayerAssignments[guid].name);

	clientList.list_meanRTT = guids.map(guid => {
		let color = Math.round(Math.min(1, clientPerformance[guid].meanRTT / 500 / 1.2) * 255);
		return coloredText(sprintf(translateWithContext("network latency", "%(milliseconds)sms"), {
			"milliseconds": clientPerformance[guid].meanRTT
		}), color + " " + (255 - color) + " 50");
	});
	clientList.list_lastReceivedTime = guids.map(guid => clientPerformance[guid].lastReceivedTime);
	clientList.list = guids;

	clientList.selected = clientList.list.indexOf(g_SelectedClientGUID);

	for (let name of ["kickButton", "banButton"])
		Engine.GetGUIObjectByName(name).enabled = g_SelectedClientGUID && g_SelectedClientGUID != Engine.GetPlayerGUID();
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