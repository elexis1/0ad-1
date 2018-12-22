// TODO: this should show whether the client is rejoining at the moment

const g_IsController = Engine.HasNetServer();

// TODO: page needs to be reloaded in case of updates
var g_PlayerAssignments;
var g_GameAttributes;

// TODO: display host
// TODO: allow giving host controls to clients
// TODO: allow muting clients
// TODO: display if clients are too slow with the simulation

var g_ClientListLastUpdate = 0;

var g_SelectedClientGUID;

var g_ClientListEntry = (guid, clientPerformance) => ({
	"name":
		setStringTags(g_PlayerAssignments[guid].name, {
			"color":
				g_GameAttributes.settings.PlayerData[g_PlayerAssignments[guid].player - 1] ?
					rgbToGuiColor(g_GameAttributes.settings.PlayerData[g_PlayerAssignments[guid].player - 1].Color) :
					"white"
	}),
	"status":
		getNetworkWarningText(
			getNetworkWarningString(guid == Engine.GetPlayerGUID(), clientPerformance),
			clientPerformance,
			g_PlayerAssignments[guid].name) || translate("Ok"),
	"meanRTT": (() => {
		let lastReceivedTime = clientPerformance.lastReceivedTime > 3000 ? clientPerformance.lastReceivedTime : 0;
		let meanRTT = Math.max(clientPerformance.meanRTT, lastReceivedTime);
		return meanRTT == 0 ?
			translateWithContext("unknown mean roundtriptime", "?") :
			coloredText(
				sprintf(translateWithContext("network latency", "%(milliseconds)sms"), {
					"milliseconds": meanRTT
				}),
				efficiencyToColor(1 - meanRTT / inefficientRTT));
	})(),
	"packetLoss":
		// TODO: 0 can also mean perfect connection, for example localhost.
		clientPerformance.packetLoss == 0 ?
			translateWithContext("unknown packet loss ratio", "?") :
			coloredText(
				sprintf(translateWithContext("network packet loss", "%(packetLossRatio)s%%"), {
					"packetLossRatio": (clientPerformance.packetLoss * 100).toFixed(1)
				}),
				efficiencyToColor(1 - clientPerformance.packetLoss / inefficientPacketLoss))
});

var g_ClientListOrder = {
	"name": (guid1, guid2, clientPerformance) =>
		g_PlayerAssignments[guid1].name.localeCompare(
		g_PlayerAssignments[guid2].name),
	"status": (guid1, guid2, clientPerformance) =>
		getNetworkWarningString(guid1 == Engine.GetPlayerGUID(), clientPerformance[guid1]).localeCompare(
		getNetworkWarningString(guid2 == Engine.GetPlayerGUID(), clientPerformance[guid2])),
	"meanRTT": (guid1, guid2, clientPerformance) =>
		clientPerformance[guid1].meanRTT -
		clientPerformance[guid2].meanRTT,
	"packetLoss": (guid1, guid2, clientPerformance) =>
		clientPerformance[guid1].packetLoss -
		clientPerformance[guid2].packetLoss
};

var g_GUIProperties = {
	"clientList": {
		"onSelectionColumnChange": () => function() {
			updateGUIObjects();
		},
		"onSelectionChange": () => function() {
			// onSelectionChange may not call updateClientList, otherwise infinite loop
			let clientList = Engine.GetGUIObjectByName("clientList");
			g_SelectedClientGUID = clientList.list[clientList.selected] || undefined;
			updateGUIProperties();
		},
		"onMouseLeftDoubleClickItem": () => function() {
			if (g_IsController)
				Engine.GetGUIObjectByName("kickButton").onPress();
			// TODO: Support skip confirmation hotkey
		}
	},
	"kickButton": {
		"caption": () => translate("Kick"),
		"tooltip": () => translate("Disconnect this player immediately."),
		"hidden": () => !g_IsController,
		"enabled": () =>  g_SelectedClientGUID && g_SelectedClientGUID != Engine.GetPlayerGUID(),
		"onPress": () => function() {
			kickPlayer(g_PlayerAssignments[g_SelectedClientGUID].name, false);
		}
	},
	"banButton": {
		"caption": () => translate("Ban"),
		"tooltip": () => translate("Disconnect this player immediately and deny any request to rejoin."),
		"hidden": () => !g_IsController,
		"enabled": () => g_SelectedClientGUID && g_SelectedClientGUID != Engine.GetPlayerGUID(),
		"onPress": () => function() {
			kickPlayer(g_PlayerAssignments[g_SelectedClientGUID].name, true);
		}
	},
	"closeButton": {
		"caption": () => translate("Close"),
		"onPress": () => function() {
			Engine.PopGuiPageCB();
		}
	}
};

function init(data, hotloadData)
{
	g_PlayerAssignments = hotloadData ? hotloadData.playerAssignments : data.playerAssignments;
	g_GameAttributes = hotloadData ? hotloadData.gameAttributes : data.gameAttributes;
	updateGUIObjects();
}

function getHotloadData()
{
	return {
		"gameAttributes": g_GameAttributes,
		"playerAssignments": g_PlayerAssignments
	};
}

function updatePage(data)
{
	g_PlayerAssignments = data.playerAssignments;
	g_GameAttributes = data.gameAttributes;
	updateGUIObjects();
}

function onTick()
{
	let now = Date.now();

	if (now <= g_ClientListLastUpdate + 1000)
		return;

	pollNetworkWarnings();
	g_ClientListLastUpdate = now;
	updateGUIObjects();
}

function updateGUIObjects()
{
	updateClientList();
	updateGUIProperties();
}

function updateGUIProperties()
{
	for (let objectName in g_GUIProperties)
		for (let propertyName in g_GUIProperties[objectName])
			Engine.GetGUIObjectByName(objectName)[propertyName] = g_GUIProperties[objectName][propertyName]();
}

function updateClientList()
{
	let clientPerformance = Engine.GetNetworkClientPerformance();
	if (!clientPerformance)
		return;

	let clientList = Engine.GetGUIObjectByName("clientList");

	let guids = Object.keys(clientPerformance).filter(guid => !!g_PlayerAssignments[guid]).sort((guid1, guid2) =>
		clientList.selected_column_order * g_ClientListOrder[clientList.selected_column](guid1, guid2, clientPerformance));

	let clientListEntries = prepareForDropdown(guids.map(guid => g_ClientListEntry(guid, clientPerformance[guid])));

	// TODO: It would be nicer and safer to exchange the entire table at a time
	for (let column in clientListEntries)
		//if (("list_" + column) in clientList) TODO: this shouldn't make it crash
		if (column != "Default")
			clientList["list_" + column] = clientListEntries[column];
	clientList.list = guids;
	clientList.selected = clientList.list.indexOf(g_SelectedClientGUID);
}
