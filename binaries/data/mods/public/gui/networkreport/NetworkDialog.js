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
	this.clientList = new ClientList("clientList");

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

NetworkDialog.prototype.GetGUIProperties = function()
{
	return {
		"networkreport": {
			"onTick": () => {
				pollNetworkWarnings();
			}
		},
		"clientList": {
			"onSelectionColumnChange": () => {
				this.UpdateGUIObjects();
			},
			"onSelectionChange": () => {
				// onSelectionChange may not call UpdateList, otherwise infinite loop
				this.UpdateGUIProperties();
			},
			// TODO: Support skip confirmation hotkey
			"onMouseLeftDoubleClickItem": () => {
				if (this.isController)
					Engine.GetGUIObjectByName("kickButton").onPress();
			},
			"onTick": () => {
				if (this.clientList.OnTick(this.gameAttributes, this.playerAssignments))
					this.UpdateGUIProperties();
			}
		},
		"kickButton": {
			"caption": translate("Kick"),
			"tooltip": translate("Disconnect this player immediately."),
			"hidden": !this.isController,
			"enabled":  this.clientList.SelectedGUID() && this.clientList.SelectedGUID() != Engine.GetPlayerGUID(),
			"onPress": () => {
				kickPlayer(this.playerAssignments[this.clientList.SelectedGUID()].name, false);
			}
		},
		"banButton": {
			"caption": translate("Ban"),
			"tooltip": translate("Disconnect this player immediately and deny any request to rejoin."),
			"hidden": !this.isController,
			"enabled": this.clientList.SelectedGUID() && this.clientList.SelectedGUID() != Engine.GetPlayerGUID(),
			"onPress": () => {
				kickPlayer(this.playerAssignments[this.clientList.SelectedGUID()].name, true);
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
	this.clientList.UpdateList(this.gameAttributes, this.playerAssignments);
	this.UpdateGUIProperties();
};

NetworkDialog.prototype.UpdateGUIProperties = function()
{
	let guiProperties = this.GetGUIProperties();
	for (let objectName in guiProperties)
		for (let propertyName in guiProperties[objectName])
			Engine.GetGUIObjectByName(objectName)[propertyName] = guiProperties[objectName][propertyName];
};
