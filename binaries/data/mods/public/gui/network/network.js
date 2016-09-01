var g_PageData;
var g_ClientNames;

function init(data)
{
	g_PageData = data;

	// Remove gaia
	if (!g_PageData.playerData[0])
		g_PageData.playerData = g_PageData.playerData.splice(1);

	updateClientList();

	for (let button of ["kickButton", "banButton"])
		Engine.GetGUIObjectByName(button).hidden = !data.isController;
}

function updateClientList()
{
	let clients = [];

	// Add online clients
	for (let guid in g_PageData.playerAssignments)
	{
		let player = g_PageData.playerAssignments[guid];
		let name = player.name;

		let playerData = g_PageData.playerData[player.player-1];
		if (playerData)
			name = "[color=\"" + rgbToGuiColor(playerData.Color) + "\"]" + name + "[/color]";

		clients.push({
			"guid": guid,
			"name": player.name,
			"title": name,
			"player": player.player == -1 ? " " : player.player,
			"status": translate("Online"),
			"connection": 1
		});
	}

	// Add offline players
	if (g_PageData.players)
		for (let playerID in g_PageData.players)
		{
			let player = g_PageData.players[playerID];
			if (player.offline)
				clients.push({
					"guid": "",
					"player": playerID,
					"name": player.name,
					"title":
						"[color=\"" + rgbToGuiColor(player.color) + "\"]" +
							player.name + "[/color]",
					"status": translate("Offline"),
					"connection": 0
				});
		}

	// Sort by selected order
	let clientList = Engine.GetGUIObjectByName("clientList");
	clients = clients.sort((clientA, clientB) => {
		let smaller = 0;
		switch(clientList.selected_column)
		{
		case "name":
			smaller = clientA.name.toLowerCase() > clientB.name.toLowerCase();
			break;
		case "status":
			smaller = clientA.connection > clientB.connection;
			break;
		case "player":
		default:
			smaller = clientA.player > clientB.player;
		}
		return clientList.selected_column_order * (smaller ? 1 : -1);
	});

	// Send to the GUI
	clients = prepareForDropdown(clients);
	clientList.list_player = clients.player;
	clientList.list_name = clients.title;
	clientList.list_status = clients.status;
	g_ClientNames = clients.name;

	// Change these last, otherwise crash
	clientList.list = clients.guid;
	clientList.list_data = clients.guid;
}

function closeNetwork()
{
	Engine.PopGuiPageCB(false);
}

function getSelectedClientName()
{
	let clientList = Engine.GetGUIObjectByName("clientList");
	if (clientList.selected == -1)
		return undefined;

	return g_ClientNames[clientList.selected];
}

function kickButton(ban)
{
	Engine.KickPlayer(getSelectedClientName(), ban);
}
