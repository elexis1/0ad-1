// TODO: ERROR: Net client: Error running FSM update (type=19 state=2)
// TODO: remember selected columns
// TODO: sort players first
// TODO: this should show whether the client is rejoining at the moment
// TODO: page needs to be reloaded in case of updates
// TODO: display host
// TODO: allow giving host controls to clients
// TODO: allow muting clients
// TODO: display if clients are too slow with the simulation

function NetworkDialog(gameAttributes, playerAssignments)
{
	this.playerAssignments = playerAssignments;
	this.gameAttributes = gameAttributes;

	this.isController = Engine.HasNetServer();
	this.clientListLastUpdate = 0;
	this.selectedGUID = undefined;

	this.UpdateGUIObjects();
}

NetworkDialog.prototype.GetHotloadData = function()
{
	return {
		"gameAttributes": this.gameAttributes,
		"playerAssignments": this.playerAssignments
	}
};

NetworkDialog.prototype.UpdateGameData = function(data)
{
	this.gameAttributes = data.gameAttributes;
	this.playerAssignments = data.playerAssignments;

	this.UpdateGUIObjects();
};

/**
 * Notice that the "this" keyword refers to a different object depending
 */
NetworkDialog.prototype.GetClientListEntry = function(guid, clientPerformance)
{
	// TODO: this scope should not exist, but "this" references are difficult
	return {
		"country": (() => {
			let geoLite2 = Engine.GeoLite2_LookupIPv4(Engine.GetClientIPAddress(guid));
			if (!geoLite2.length)
				return translateWithContext("unknown country", "?");

			return sprintf(translate("%(continent)s/%(country)s"), {
				"continent": geoLite2[2],
				"country": geoLite2[4]
			});
		})(),
		"name":
			setStringTags(this.playerAssignments[guid].name, {
				"color": (() => {
					let playerID = this.playerAssignments[guid].player - 1;
					return playerID > 0 ? rgbToGuiColor(this.gameAttributes.settings.PlayerData[playerID].Color) : "white";
				})()
			}),
		"status":
			getNetworkWarningText(
				getNetworkWarningString(guid == Engine.GetPlayerGUID(), clientPerformance),
				clientPerformance,
				this.playerAssignments[guid].name) || translate("Ok"),
		"ipAddress": Engine.GetClientIPAddress(guid),
		"hostname": Engine.LookupClientHostname(guid),
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
		};
};

NetworkDialog.prototype.GetClientListOrder = function()
{
	// country sorting not implemented
	return {
		"country": (guid1, guid2, clientPerformance) => guid1.localeCompare(guid2),
		"name": (guid1, guid2, clientPerformance) =>
			this.playerAssignments[guid1].name.localeCompare(
			this.playerAssignments[guid2].name),
		"status": (guid1, guid2, clientPerformance) =>
			getNetworkWarningString(guid1 == Engine.GetPlayerGUID(), clientPerformance[guid1]).localeCompare(
			getNetworkWarningString(guid2 == Engine.GetPlayerGUID(), clientPerformance[guid2])),
		"ipAddress": (guid1, guid2) => Engine.IPv4ToNumber(Engine.GetClientIPAddress(guid1)) - Engine.IPv4ToNumber(Engine.GetClientIPAddress(guid2)),
		"hostname": (guid1, guid2) => Engine.LookupClientHostname(guid1).localeCompare(Engine.LookupClientHostname(guid2)),
		"meanRTT": (guid1, guid2, clientPerformance) =>
			clientPerformance[guid1].meanRTT -
			clientPerformance[guid2].meanRTT,
		"packetLoss": (guid1, guid2, clientPerformance) =>
			clientPerformance[guid1].packetLoss -
			clientPerformance[guid2].packetLoss
	}
};

NetworkDialog.prototype.GetGUIProperties = function()
{
	return {
		"clientList": {
			"onSelectionColumnChange": () => {
				this.UpdateGUIObjects();
			},
			"onSelectionChange": () => {
				// onSelectionChange may not call updateClientList, otherwise infinite loop
				let clientList = Engine.GetGUIObjectByName("clientList");
				this.selectedGUID = clientList.list[clientList.selected] || undefined;
				this.UpdateGUIProperties();
			},
			// TODO: Support skip confirmation hotkey
			"onMouseLeftDoubleClickItem": () => {
				if (this.isController)
					Engine.GetGUIObjectByName("kickButton").onPress();
			},
			"onTick": () => {
				let now = Date.now();

				if (now <= this.clientListLastUpdate + 1000)
					return;

				pollNetworkWarnings();
				this.clientListLastUpdate = now;
				this.UpdateGUIObjects();
			}
		},
		"kickButton": {
			"caption": translate("Kick"),
			"tooltip": translate("Disconnect this player immediately."),
			"hidden": !this.isController,
			"enabled":  this.selectedGUID && this.selectedGUID != Engine.GetPlayerGUID(),
			"onPress": () => {
				kickPlayer(this.playerAssignments[this.selectedGUID].name, false);
			}
		},
		"banButton": {
			"caption": translate("Ban"),
			"tooltip": translate("Disconnect this player immediately and deny any request to rejoin."),
			"hidden": !this.isController,
			"enabled": this.selectedGUID && this.selectedGUID != Engine.GetPlayerGUID(),
			"onPress": () => {
				kickPlayer(this.playerAssignments[this.selectedGUID].name, true);
			}
		},
		"closeButton": {
			"caption": translate("Close"),
			"onPress": () => {
				Engine.PopGuiPageCB();
			}
		}
	};
};

NetworkDialog.prototype.UpdateGUIObjects = function()
{
	this.UpdateClientList();
	this.UpdateGUIProperties();
};

NetworkDialog.prototype.UpdateGUIProperties = function()
{
	let guiProperties = this.GetGUIProperties();
	for (let objectName in guiProperties)
		for (let propertyName in guiProperties[objectName])
			Engine.GetGUIObjectByName(objectName)[propertyName] = guiProperties[objectName][propertyName];
};

NetworkDialog.prototype.UpdateClientList = function()
{
	let clientPerformance = Engine.GetNetworkClientPerformance();
	if (!clientPerformance)
		return;

	let clientList = Engine.GetGUIObjectByName("clientList");

	let guids = Object.keys(clientPerformance).filter(guid => !!this.playerAssignments[guid]).sort((guid1, guid2) =>
		clientList.selected_column_order * this.GetClientListOrder()[clientList.selected_column](guid1, guid2, clientPerformance));

	// TODO: It would be nicer and safer to exchange the entire table at a time
	let clientListEntries = prepareForDropdown(guids.map(guid => this.GetClientListEntry(guid, clientPerformance[guid])));

	for (let column in clientListEntries)
		//if (("list_" + column) in clientList) TODO: this shouldn't make it crash
		if (column != "Default")
			clientList["list_" + column] = clientListEntries[column];
	clientList.list = guids;
	clientList.selected = clientList.list.indexOf(this.selectedGUID);
};

