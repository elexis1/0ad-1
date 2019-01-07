function ClientList(guiObjectName)
{
	this.clientList = Engine.GetGUIObjectByName(guiObjectName);
	this.updateInterval = 1000;
	this.lastUpdate = 0;
	this.countryFlags = new CountryFlags(14, 14, true);
	this.selectedGUID = undefined;
}

ClientList.prototype.OnTick = function(gameAttributes, playerAssignments)
{
	let now = Date.now();
	if (now <= this.lastUpdate + this.updateInterval)
		return false;

	this.UpdateList(gameAttributes, playerAssignments);
	this.lastUpdate = now;
	return true;
};

ClientList.prototype.UpdateList = function(gameAttributes, playerAssignments)
{
	let clientPerformance = Engine.GetNetworkClientPerformance();
	if (!clientPerformance)
		return;

	let guids = Object.keys(clientPerformance).filter(guid => !!playerAssignments[guid]).sort((guid1, guid2) =>
		this.clientList.selected_column_order *
		this.GetListEntryOrder(playerAssignments)[this.clientList.selected_column](guid1, guid2, clientPerformance));

	// TODO: It would be nicer and safer to exchange the entire table at a time
	let clientListEntries = prepareForDropdown(guids.map(guid => this.GetListEntry(gameAttributes, playerAssignments, guid, clientPerformance[guid])));

	let selectedGUID = this.SelectedGUID();

	for (let column in clientListEntries)
		//if (("list_" + column) in clientList) TODO: this shouldn't make it crash
		if (column != "Default")
			this.clientList["list_" + column] = clientListEntries[column];
	this.clientList.list = guids;
	this.clientList.selected = this.clientList.list.indexOf(selectedGUID);
};

ClientList.prototype.SelectedGUID = function()
{
	return this.clientList.list[this.clientList.selected] || undefined;
};

/**
 * Notice that the "this" keyword refers to a different object depending
 */
ClientList.prototype.GetListEntry = function(gameAttributes, playerAssignments, guid, clientPerformance)
{
	// TODO: this scope should not exist, but "this" references are difficult
	return {
		"country": (() => {
			let geoLite2 = GeoLite2(guid);
			return geoLite2 ?
				sprintf(translate("%(icon)s %(continent)s/%(country)s"), {
					"icon": iconTag(this.countryFlags.GetIconName(geoLite2.countryCode)),
					"continent": geoLite2.continent,
					"country": geoLite2.country
				}) :
				translateWithContext("unknown country", "?");
		})(),
		"name":
			setStringTags(playerAssignments[guid].name, {
				"color": (() => {
					let playerID = playerAssignments[guid].player - 1;
					return playerID > 0 ? rgbToGuiColor(gameAttributes.settings.PlayerData[playerID].Color) : "white";
				})()
			}),
		"status":
			getNetworkWarningText(
				getNetworkWarningString(guid == Engine.GetPlayerGUID(), clientPerformance),
				clientPerformance,
				playerAssignments[guid].name) || translate("Ok"),
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

ClientList.prototype.GetListEntryOrder = function(playerAssignments)
{
	return {
		"country": (guid1, guid2) => {
			let getCountryID = guid => {
				let geoLite2 = GeoLite2(guid);
				return geoLite2 ? geoLite2.continentCode + "/" + geoLite2.countryCode : "";
			};
			return getCountryID(guid1).localeCompare(getCountryID(guid2));
		},
		"name": (guid1, guid2) =>
			playerAssignments[guid1].name.localeCompare(
			playerAssignments[guid2].name),

		"status": (guid1, guid2, clientPerformance) =>
			getNetworkWarningString(guid1 == Engine.GetPlayerGUID(), clientPerformance[guid1]).localeCompare(
			getNetworkWarningString(guid2 == Engine.GetPlayerGUID(), clientPerformance[guid2])),

		"ipAddress": (guid1, guid2) =>
			Engine.IPv4ToNumber(Engine.GetClientIPAddress(guid1)) - Engine.IPv4ToNumber(Engine.GetClientIPAddress(guid2)),

		"hostname": (guid1, guid2) =>
			Engine.LookupClientHostname(guid1).localeCompare(Engine.LookupClientHostname(guid2)),

		"meanRTT": (guid1, guid2, clientPerformance) =>
			clientPerformance[guid1].meanRTT -
			clientPerformance[guid2].meanRTT,

		"packetLoss": (guid1, guid2, clientPerformance) =>
			clientPerformance[guid1].packetLoss -
			clientPerformance[guid2].packetLoss
	};
};
