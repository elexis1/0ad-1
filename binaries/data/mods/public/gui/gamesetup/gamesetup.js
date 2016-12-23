const g_MatchSettings_SP = "config/matchsettings.json";
const g_MatchSettings_MP = "config/matchsettings.mp.json";

const g_PlayerArray = Array(g_MaxPlayers).fill(0).map((v, i) => i + 1); // 1, 2, ..., MaxPlayers
const g_Ceasefire = prepareForDropdown(g_Settings && g_Settings.Ceasefire);
const g_GameSpeeds = prepareForDropdown(g_Settings && g_Settings.GameSpeeds.filter(speed => !speed.ReplayOnly));
const g_MapSizes = prepareForDropdown(g_Settings && g_Settings.MapSizes);
const g_MapTypes = prepareForDropdown(g_Settings && g_Settings.MapTypes);
const g_PopulationCapacities = prepareForDropdown(g_Settings && g_Settings.PopulationCapacities);
const g_StartingResources = prepareForDropdown(g_Settings && g_Settings.StartingResources);
const g_VictoryConditions = prepareForDropdown(g_Settings && g_Settings.VictoryConditions);
const g_WonderDurations = prepareForDropdown(g_Settings && g_Settings.WonderDurations);

/**
 * Highlight the "random" dropdownlist item.
 */
const g_ColorRandom = "orange";

const g_TeamsArray = prepareForDropdown([{
		"label": translateWithContext("team", "None"),
		"id": -1
	}].concat(
		Array(g_MaxTeams).fill(0).map((v, i) => ({
			"label": i + 1,
			"id": i
		}))
	)
);

/**
 * Offer users to select playable civs only.
 * Load unselectable civs as they could appear in scenario maps.
 */
const g_CivData = loadCivData();

const g_CivList = g_CivData && prepareForDropdown([{
		"name": '[color="' + g_ColorRandom + '"]' + translateWithContext("civilization", "Random") + '[/color]',
		"code": "random"
	}].concat(
		Object.keys(g_CivData).filter(
			civ => g_CivData[civ].SelectableInGameSetup
		).map(civ => ({
			"name": g_CivData[civ].Name,
			"code": civ
		})).sort(sortNameIgnoreCase)
	)
);

/**
 * All selectable playercolors except gaia.
 */
const g_PlayerColors = g_Settings && g_Settings.PlayerDefaults.slice(1).map(pData => pData.Color);

/**
 * Directory containing all maps of the given type.
 */
const g_MapPath = {
	"random": "maps/random/",
	"scenario": "maps/scenarios/",
	"skirmish": "maps/skirmishes/"
};

/**
 * Processes a CNetMessage (see NetMessage.h, NetMessages.h) sent by the CNetServer.
 */
var g_NetMessageTypes = {
	"netstatus": msg => handleNetStatusMessage(msg),
	"netwarn": msg => addNetworkWarning(msg),
	"gamesetup": msg => handleGamesetupMessage(msg),
	"players": msg => handlePlayerAssignmentMessage(msg),
	"ready": msg => handleReadyMessage(msg),
	"start": msg => handleGamestartMessage(msg),
	"kicked": msg => addChatMessage({
		"type": msg.banned ? "banned" : "kicked",
		"username": msg.username
	}),
	"chat": msg => addChatMessage({ "type": "chat", "guid": msg.guid, "text": msg.text }),
};

var g_FormatChatMessage = {
	"system": (msg, user) => systemMessage(msg.text),
	"settings": (msg, user) => systemMessage(translate('Game settings have been changed')),
	"connect": (msg, user) => systemMessage(sprintf(translate("%(username)s has joined"), { "username": user })),
	"disconnect": (msg, user) => systemMessage(sprintf(translate("%(username)s has left"), { "username": user })),
	"kicked": (msg, user) => systemMessage(sprintf(translate("%(username)s has been kicked"), { "username": user })),
	"banned": (msg, user) => systemMessage(sprintf(translate("%(username)s has been banned"), { "username": user })),
	"chat": (msg, user) => sprintf(translate("%(username)s %(message)s"), {
		"username": senderFont(sprintf(translate("<%(username)s>"), { "username": user })),
		"message": escapeText(msg.text || "")
	}),
	"ready": (msg, user) => sprintf(translate("* %(username)s is ready!"), {
		"username": user
	}),
	"not-ready": (msg, user) => sprintf(translate("* %(username)s is not ready."), {
		"username": user
	}),
	"clientlist": (msg, user) => getUsernameList(),
};

var g_MapFilters = prepareForDropdown([
	{
		"id": "default",
		"name": translateWithContext("map filter", "Default"),
		"filter": mapKeywords => mapKeywords.every(keyword => ["naval", "demo", "hidden"].indexOf(keyword) == -1),
		"Default": true
	},
	{
		"id": "naval",
		"name": translate("Naval Maps"),
		"filter": mapKeywords => mapKeywords.indexOf("naval") != -1
	},
	{
		"id": "demo",
		"name": translate("Demo Maps"),
		"filter": mapKeywords => mapKeywords.indexOf("demo") != -1
	},
	{
		"id": "new",
		"name": translate("New Maps"),
		"filter": mapKeywords => mapKeywords.indexOf("new") != -1
	},
	{
		"id": "trigger",
		"name": translate("Trigger Maps"),
		"filter": mapKeywords => mapKeywords.indexOf("trigger") != -1
	},
	{
		"id": "all",
		"name": translate("All Maps"),
		"filter": mapKeywords => true
	},
]);

/**
 * Used for generating the botnames.
 */
const g_RomanNumbers = [undefined, "I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

/**
 * Used for highlighting the sender of chat messages.
 */
const g_SenderFont = "sans-bold-13";

/**
 * Highlight AIs in the player-dropdownlist.
 */
const g_AIColor = "70 150 70";

/**
 * Color for "Unassigned"-placeholder item in the dropdownlist.
 */
const g_UnassignedColor = "140 140 140";

/**
 * Highlight observer players in the dropdownlist.
 */
const g_UnassignedPlayerColor = "170 170 250";

/**
 * Highlight ready players.
 */
const g_ReadyColor = "green";

/**
 * Whether this is a single- or multiplayer match.
 */
var g_IsNetworked;

/**
 * Is this user in control of game settings (i.e. singleplayer or host of a multiplayergame).
 */
var g_IsController;

/**
 * To report the game to the lobby bot.
 */
var g_ServerName;
var g_ServerPort;

/**
 * States whether the GUI is currently updated in response to network messages instead of user input
 * and therefore shouldn't send further messages to the network.
 */
var g_IsInGuiUpdate;

/**
 * Whether the current player is ready to start the game.
 */
var g_IsReady;

/**
 * Ignore duplicate ready commands on init.
 */
var g_ReadyInit = true;

/**
 * If noone has changed the ready status, we have no need to spam the settings changed message.
 *
 * <=0 - Suppressed settings message
 * 1 - Will show settings message
 * 2 - Host's initial ready, suppressed settings message
 */
var g_ReadyChanged = 2;

/**
 * Used to prevent calling resetReadyData when starting a game.
 */
var g_GameStarted = false;

var g_PlayerAssignments = {};

var g_DefaultPlayerData = [];

var g_GameAttributes = { "settings": {} };

var g_ChatMessages = [];

/**
 * Filename and translated title of all maps, given the currently selected
 * maptype and filter. Sorted by title, shown in the dropdown.
 */
var g_MapList = [];

/**
 * Cache containing the mapsettings. Just-in-time loading.
 */
var g_MapData = {};

/**
 * Wait one tick before initializing the GUI objects and
 * don't process netmessages prior to that.
 */
var g_LoadingState = 0;

/**
 * Only send a lobby update if something actually changed.
 */
var g_LastGameStanza;

/**
 * Remembers if the current player viewed the AI settings of some playerslot.
 */
var g_LastViewedAIPlayer = -1;

/**
 * Options in the "More Options" window will be shown in this order.
 * All valid options are required to appear here.
 */
var g_MoreOptionsOrder = {
	"Dropdown": [
		"gameSpeed",
		"victoryCondition",
		"wonderDuration",
		"populationCap",
		"startingResources",
		"ceasefire",
	],
	"Checkbox": [
		"revealMap",
		"exploreMap",
		"disableTreasures",
		"lockTeams",
		"lastManStanding",
		"enableCheats",
		"enableRating",
	],
};

/**
 * Contains the logic of all multiple-choice gamesettings.
 *
 * Hidden - If hidden, both the label and dropdown won't be visible.
 * Enabled - Only the label will be shown if it's disabled.
 * Default - Returns the index of the default value (not the value itself).
 * Tooltip - A description shown when hovering the option.
 *
 * NOTICE: The first three elements need to be initialized first.
 * If the map is changed, missing values are supplemented with defaults.
 * TODO: add "priority" property, to ensure init order?
 */
var g_Dropdowns = {
	"mapType": {
		"tooltip": () => translate("Select a map type."),
		"labels": () => g_MapTypes.Title,
		"ids": () => g_MapTypes.Name,
		"default": () => g_MapTypes.Default,
		"defined": () => g_GameAttributes.mapType !== undefined,
		"get": () => g_GameAttributes.mapType,
		"select": (idx) => {

			g_MapData = {};

			g_GameAttributes.mapType = g_MapTypes.Name[idx];
			g_GameAttributes.mapPath = g_MapPath[g_GameAttributes.mapType];
			delete g_GameAttributes.map;

			if (g_GameAttributes.mapType != "scenario")
				g_GameAttributes.settings = {
					"PlayerData": g_DefaultPlayerData.slice(0, 4)
				};

			reloadMapList();
			supplementDefaults();
		},
	},
	"mapFilter": {
		"tooltip": () => translate("Select a map filter."),
		"labels": () => g_MapFilters.name,
		"ids": () => g_MapFilters.id,
		"default": () => g_MapFilters.Default,
		"defined": () => g_GameAttributes.mapFilter !== undefined,
		"get": () => g_GameAttributes.mapFilter,
		"select": (idx) => {
			g_GameAttributes.mapFilter = g_MapFilters.id[idx];
			delete g_GameAttributes.map;
			reloadMapList();
			supplementDefaults();
		},
	},
	"mapSelection": {
		"tooltip": () => translate("Select a map to play on."),
		"labels": () => g_MapList.name,
		"ids": () => g_MapList.file,
		"default": () => 0,
		"defined": () => g_GameAttributes.map !== undefined,
		"get": () => g_GameAttributes.map,
		"select": (idx) => {
			selectMap(g_MapList.file[idx]);
			supplementDefaults();
		},
	},
	"mapSize": {
		"tooltip": () => translate("Select map size. (Larger sizes may reduce performance.)"),
		"labels": () => g_MapSizes.Name,
		"ids": () => g_MapSizes.Tiles,
		"default": () => g_MapSizes.Default,
		"defined": () => g_GameAttributes.settings.Size !== undefined,
		"get": () => g_GameAttributes.settings.Size,
		"select": (idx) => {
			g_GameAttributes.settings.Size = g_MapSizes.Tiles[idx];
		},
		"maps": ["random"],
	},
	"numPlayers": {
		"tooltip": () => translate("Select number of players."),
		"labels": () => g_PlayerArray,
		"ids": () => g_PlayerArray,
		"default": () => g_MaxPlayers - 1,
		"defined": () => g_GameAttributes.settings.PlayerData !== undefined,
		"get": () => g_GameAttributes.settings.PlayerData.length,
		"select": (idx) => {
			selectNumPlayers(idx + 1);
		},
		"maps": ["random"],
	},
	"populationCap": {
		"title": () => translate("Population cap"),
		"tooltip": () => translate("Select population cap."),
		"labels": () => g_PopulationCapacities.Title,
		"ids": () => g_PopulationCapacities.Population,
		"default": () => g_PopulationCapacities.Default,
		"defined": () => g_GameAttributes.settings.PopulationCap !== undefined,
		"get": () => g_GameAttributes.settings.PopulationCap,
		"select": (idx) => {
			g_GameAttributes.settings.PopulationCap = g_PopulationCapacities.Population[idx];
		},
		"maps": ["random", "skirmish"],
	},
	"startingResources": {
		"title": () => translate("Starting Resources"),
		"tooltip": () => translate("Select the game's starting resources."),
		"labels": () => g_StartingResources.Title,
		"ids": () => g_StartingResources.Resources,
		"default": () => g_StartingResources.Default,
		"defined": () => g_GameAttributes.settings.StartingResources !== undefined,
		"get": () => g_GameAttributes.settings.StartingResources,
		"select": (idx) => {
			g_GameAttributes.settings.StartingResources = g_StartingResources.Resources[idx];
		},
		"maps": ["random", "skirmish"],
	},
	"ceasefire": {
		"title": () => translate("Ceasefire"),
		"tooltip": () => translate("Set time where no attacks are possible."),
		"labels": () => g_Ceasefire.Title,
		"ids": () => g_Ceasefire.Duration,
		"default": () => g_Ceasefire.Default,
		"defined": () => g_GameAttributes.settings.Ceasefire !== undefined,
		"get": () => g_GameAttributes.settings.Ceasefire,
		"select": (idx) => {
			g_GameAttributes.settings.Ceasefire = g_Ceasefire.Duration[idx];
		},
		"maps": ["random", "skirmish"],
	},
	"victoryCondition": {
		"title": () => translate("Victory Condition"),
		"tooltip": () => translate("Select victory condition."),
		"labels": () => g_VictoryConditions.Title,
		"ids": () => g_VictoryConditions.Name,
		"default": () => g_VictoryConditions.Default,
		"defined": () => g_GameAttributes.settings.GameType !== undefined,
		"get": () => g_GameAttributes.settings.GameType,
		"select": (idx) => {
			g_GameAttributes.settings.GameType = g_VictoryConditions.Name[idx];
			g_GameAttributes.settings.VictoryScripts = g_VictoryConditions.Scripts[idx];
		},
		"maps": ["random", "skirmish"],
	},
	"wonderDuration": {
		"title": () => translate("Wonder Victory"),
		"tooltip": () => translate("Number of minutes that the player has to keep the wonder in order to win."),
		"labels": () => g_WonderDurations.Title,
		"ids": () => g_WonderDurations.Duration,
		"default": () => g_WonderDurations.Default,
		"defined": () => g_GameAttributes.settings.WonderDuration !== undefined,
		"get": () => g_GameAttributes.settings.WonderDuration,
		"select": (idx) => {
			g_GameAttributes.settings.WonderDuration = g_WonderDurations.Duration[idx];
		},
		"hidden": () => g_GameAttributes.settings.GameType != "wonder",
		"maps": ["random", "skirmish"],
	},
	"gameSpeed": {
		"title": () => translate("Game Speed"),
		"tooltip": () => translate("Select game speed."),
		"labels": () => g_GameSpeeds.Title,
		"ids": () => g_GameSpeeds.Speed,
		"default": () => g_GameSpeeds.Default,
		"defined": () => g_GameAttributes.gameSpeed !== undefined,
		"get": () => g_GameAttributes.gameSpeed,
		"select": (idx) => {
			g_GameAttributes.gameSpeed = g_GameSpeeds.Speed[idx];
		},
	},
};
var g_HostNameList = [];
var g_HostGUIDList = [];

/**
 * These dropdowns provide a setting that is repeated once for each player.
 */
var g_DropdownArrays = {
	"playerAssignment": {
		"labels": (idx) => g_HostNameList,
		"ids": (idx) => g_HostGUIDList,
		"default": (idx) => 0, // TODO: AI player
		"defined": (idx) => true,
		"get": (idx) => 0,// TODO
		"select": (idx, selectedIdx) => {

			// TODO: text had shown translate("Loading...") on init is that relevant?
			let guid = g_HostGUIDList[selectedIdx];
			if (!guid || guid.substr(0, 3) == "ai:")
			{
				if (g_IsNetworked)
					Engine.AssignNetworkPlayer(playerID, "");

				g_GameAttributes.settings.PlayerData[idx].AI = guid ? guid.substr(3) : "";
			}
			else
				swapPlayers(guid, idx);

			updateGameAttributes();
			updateReadyUI();
		},
	},
	"playerTeam": {
		"labels": (idx) => g_TeamsArray.label,
		"ids": (idx) => g_TeamsArray.id,
		"default": (idx) => 0,
		"defined": (idx) => g_GameAttributes.settings.PlayerData[idx].Team !== undefined,
		"get": (idx) => {
			warn(idx);
			return g_GameAttributes.settings.PlayerData[idx].Team;
		},
		"select": (idx, selectedIdx) => {
			g_GameAttributes.settings.PlayerData[idx].Team = selectedIdx - 1;
		},
		"maps": ["random", "skirmish"],
	},
	"playerCiv": {
		"labels": (idx) => g_CivList.name,
		"ids": (idx) => g_CivList.code,
		"default": (idx) => 0,
		"defined": (idx) => g_GameAttributes.settings.PlayerData[idx].Civ !== undefined,
		"get": (idx) => g_GameAttributes.settings.PlayerData[idx].Civ,
		"select": (idx, selectedIdx) => {
			g_GameAttributes.settings.PlayerData[idx].Civ = g_CivList.code[selectedIdx];
		},
		"maps": ["random", "skirmish"],
	},
	"playerColorPicker": {
		"labels": (idx) => g_PlayerColors.map(color => ' ' + '[color="' + rgbToGuiColor(color) + '"]■[/color]'),
		"ids": (idx) => g_PlayerColors.map((color, index) => index),
		"default": (idx) => idx,
		"defined": (idx) => g_GameAttributes.settings.PlayerData[idx].Color !== undefined,
		"get": (idx) => g_GameAttributes.settings.PlayerData[idx].Color,
		"select": (idx, selectedIdx) => {
			let playerData = g_GameAttributes.settings.PlayerData;

			// If someone else has that color, give that player the old color
			let pData = playerData.find(pData => sameColor(g_PlayerColors[selectedIdx], pData.Color));
			if (pData)
				pData.Color = playerData[idx].Color;

			playerData[idx].Color = g_PlayerColors[selectedIdx];
			ensureUniquePlayerColors(playerData);
		},
		"maps": ["random", "skirmish"],
	},
};

/**
 * Contains the logic of all boolean gamesettings.
 */
var g_Checkboxes = {
	"revealMap": {
		"title": () =>
			// Translation: Make sure to differentiate between the revealed map and explored map options!
			translate("Revealed Map"),
		"tooltip":
			// Translation: Make sure to differentiate between the revealed map and explored map options!
			() => translate("Toggle revealed map (see everything)."),
		"default": () => false,
		"defined": () => g_GameAttributes.settings.RevealMap !== undefined,
		"get": () => g_GameAttributes.settings.RevealMap,
		"set": checked => {
			g_GameAttributes.settings.RevealMap = checked;
		},
		"maps": ["random", "skirmish"],
	},
	"exploreMap": {
		"title":
			// Translation: Make sure to differentiate between the revealed map and explored map options!
			() => translate("Explored Map"),
		"tooltip":
			// Translation: Make sure to differentiate between the revealed map and explored map options!
			() => translate("Toggle explored map (see initial map)."),
		"default": () => false,
		"defined": () => g_GameAttributes.settings.ExploreMap !== undefined,
		"get": () => g_GameAttributes.settings.ExploreMap,
		"set": checked => {
			g_GameAttributes.settings.ExploreMap = checked;
		},
		"maps": ["random", "skirmish"],
	},
	"disableTreasures": {
		"title": () => translate("Disable Treasures"),
		"tooltip": () => translate("Disable all treasures on the map."),
		"default": () => false,
		"defined": () => g_GameAttributes.settings.DisableTreasures !== undefined,
		"get": () => g_GameAttributes.settings.DisableTreasures,
		"set": checked => {
			g_GameAttributes.settings.DisableTreasures = checked;
		},
		"maps": ["random", "skirmish"],
	},
	"lockTeams":  {
		"title": () => translate("Teams Locked"),
		"tooltip": () => translate("Toggle locked teams."),
		"default": () => Engine.HasXmppClient(),
		"defined": () => g_GameAttributes.settings.LockTeams !== undefined,
		"get": () => g_GameAttributes.settings.LockTeams,
		"set": checked => {
			g_GameAttributes.settings.LockTeams = checked;
			g_GameAttributes.settings.LastManStanding = false;
		},
		"maps": ["random", "skirmish"],
		"enabled": () => !g_GameAttributes.settings.RatingEnabled,
	},
	"lastManStanding":  {
		"title": () => translate("Last Man Standing"),
		"tooltip": () => translate("Toggle whether the last remaining player or the last remaining set of allies wins."),
		"default": () => false,
		"defined": () => g_GameAttributes.settings.LastManStanding !== undefined,
		"get": () => g_GameAttributes.settings.LastManStanding,
		"set": checked => {
			g_GameAttributes.settings.LastManStanding = checked;
		},
		"maps": ["random", "skirmish"],
		"enabled": () => !g_GameAttributes.settings.LockTeams,
	},
	"enableCheats":  {
		"title": () => translate("Cheats"),
		"tooltip": () => translate("Toggle the usability of cheats."),
		"default": () => !g_IsNetworked,
		"hidden": () => !g_IsNetworked,
		"defined": () => g_GameAttributes.settings.CheatsEnabled !== undefined,
		"get": () => g_GameAttributes.settings.CheatsEnabled,
		"set": checked => {
			g_GameAttributes.settings.CheatsEnabled = !g_IsNetworked ||
				checked && !g_GameAttributes.settings.RatingEnabled;
		},
		"enabled": () => !g_GameAttributes.settings.RatingEnabled,
	},
	"enableRating": {
		"title": () => translate("Rated Game"),
		"tooltip": () => translate("Toggle if this game will be rated for the leaderboard."),
		"default": () => Engine.HasXmppClient(),
		"hidden": () => !Engine.HasXmppClient(),
		"defined": () => g_GameAttributes.settings.RatingEnabled !== undefined,
		"get": () => !!g_GameAttributes.settings.RatingEnabled,
		"set": checked => {
			g_GameAttributes.settings.RatingEnabled = Engine.HasXmppClient() ? checked : undefined;
			Engine.SetRankedGame(!!g_GameAttributes.settings.RatingEnabled);
		},
	},
};

/**
 * For setting up arbitrary GUI objects.
 */
var g_MiscControls = {
	"chatPanel": {
		"hidden": () => !g_IsNetworked,
	},
	"chatInput": {
		"tooltip": () => colorizeAutocompleteHotkey(),
	},
	"cheatWarningText": {
		"hidden": () => !g_IsNetworked || !g_GameAttributes.settings.CheatsEnabled,
	},
	"mapSize": {
		"hidden": () => g_GameAttributes.mapType != "random" || !g_IsController,
	},
	"mapSizeText": {
		"hidden": () => g_GameAttributes.mapType != "random" || g_IsController,
	},
	"mapSizeDesc": {
		"hidden": () => g_GameAttributes.mapType != "random",
	},
	"cancelGame": {
		"tooltip": () =>
			Engine.HasXmppClient() ?
				translate("Return to the lobby.") :
				translate("Return to the main menu."),
	},
	"startGame": {
		// TODO: right align stuff
		"enabled": () => !g_IsController ||
		                 Object.keys(g_PlayerAssignments).every(guid => g_PlayerAssignments[guid].status ||
		                                                                g_PlayerAssignments[guid].player == -1),
		"hidden": () => {
			return !g_IsController && g_PlayerAssignments[Engine.GetPlayerGUID()].player == -1;
		},
		"tooltip": () => translate("Start a new game with the current settings."),
	},
	"civResetButton": {
		"hidden": () => g_GameAttributes.mapType == "scenario" || !g_IsController,
	},
	"teamResetButton": {
		"hidden": () => g_GameAttributes.mapType == "scenario" || !g_IsController,
	},
};

/**
 * Contains options that are repeated for every player.
 */
var g_MiscControlArrays = {
	"playerBox": {
		"size": (idx) => ({
			"left": 0,
			"right": "100%",
			"top": 32 * idx,
			"bottom": 32 * (idx + 1),
		}),
	},
	"playerName": {
		"caption": (idx) => {
			// TODO if (g_PlayerAssignments[message.guid].status) green
			return translate(g_DefaultPlayerData[idx].Name);
		},
	},
	"playerColor": {
		"sprite": (idx) => "color:" + rgbToGuiColor(g_GameAttributes.settings.PlayerData[idx].Color) + " 100",
	},
	"playerConfig": {
		"hidden": (idx) => g_GameAttributes.settings.PlayerData[idx].AI != "",
		"onPress": (idx) => {
			openAIConfig(idx);
		},
	},
};

/**
 * Initializes some globals without touching the GUI.
 *
 * @param {Object} attribs - context data sent by the lobby / mainmenu
 */
function init(attribs)
{
	if (!g_Settings)
	{
		cancelSetup();
		return;
	}

	if (["offline", "server", "client"].indexOf(attribs.type) == -1)
	{
		error("Unexpected 'type' in gamesetup init: " + attribs.type);
		cancelSetup();
		return;
	}

	g_IsNetworked = attribs.type != "offline";
	g_IsController = attribs.type != "client";
	g_ServerName = attribs.serverName;
	g_ServerPort = attribs.serverPort;

	// Replace empty playername when entering a singleplayermatch for the first time
	if (!g_IsNetworked)
	{
		Engine.ConfigDB_CreateValue("user", "playername.singleplayer", singleplayerName());
		Engine.ConfigDB_WriteValueToFile("user", "playername.singleplayer", singleplayerName(), "config/user.cfg");
	}

	initDefaults();
	supplementDefaults();

	setTimeout(displayGamestateNotifications, 1000);
}

function initDefaults()
{
	// Remove gaia from both arrays
	g_DefaultPlayerData = g_Settings.PlayerDefaults;
	g_DefaultPlayerData.shift();

	for (let i in g_DefaultPlayerData)
		g_DefaultPlayerData[i].Civ = "random";
}

/**
 * Sets default values for all g_GameAttribute settings which don't have a value set.
 */
function supplementDefaults()
{
	for (let dropdown in g_Dropdowns)
		if (!g_Dropdowns[dropdown].defined())
			g_Dropdowns[dropdown].select(g_Dropdowns[dropdown].default());

	for (let checkbox in g_Checkboxes)
		if (!g_Checkboxes[checkbox].defined())
			g_Checkboxes[checkbox].set(g_Checkboxes[checkbox].default());

	for (let dropdown in g_DropdownArrays)
		for (let i = 0; i < g_GameAttributes.settings.PlayerData.length; ++i)
			if (!g_DropdownArrays[dropdown].defined(i))
				g_DropdownArrays[dropdown].select(g_DropdownArrays[dropdown].default(i));
}

/**
 * Called after the first tick.
 */
function initGUIObjects()
{
	for (let dropdown in g_Dropdowns)
		initDropdown(dropdown);

	for (let checkbox in g_Checkboxes)
		initCheckbox(checkbox);

	for (let dropdown in g_DropdownArrays)
		initDropdownArray(dropdown);

	resizeMoreOptionsWindow();

	if (g_IsController)
	{
		// TODO: move to init
		loadPersistMatchSettings();
		if (g_IsInGuiUpdate)
			warn("initGUIObjects() called while in GUI update");
		updateGameAttributes();
	}

	Engine.GetGUIObjectByName("loadingWindow").hidden = true;
	Engine.GetGUIObjectByName("setupWindow").hidden = false;

	if (g_IsNetworked)
		Engine.GetGUIObjectByName("chatInput").focus();
}

/**
 * The main options (like map selection) and dropdownArrays have a specific name.
 * Options in the "More Options" dialog use a generic name.
 */
function getGUIObjectNameFromSetting(name)
{
	for (let type in g_MoreOptionsOrder)
	{
		let idx = g_MoreOptionsOrder[type].indexOf(name);
		if (idx != -1)
			return ["option" + type, "[" + idx + "]"]
	}

	// Assume there is a GUI object with exactly that setting name
	return [name, ""];
}

function initDropdown(name, idx)
{
	let [guiName, guiIdx] = getGUIObjectNameFromSetting(name);
	let idxName = idx === undefined ? "": "[" + idx + "]";
	let data = (idx === undefined ? g_Dropdowns : g_DropdownArrays)[name];

	let dropdown = Engine.GetGUIObjectByName(guiName + guiIdx + idxName);
	dropdown.list = data.labels(idx);
	dropdown.list_data = data.ids(idx);

	dropdown.onSelectionChange = function() {

		if (!g_IsController ||
		    g_IsInGuiUpdate ||
		    !this.list_data[this.selected] ||
		    data.hidden && data.hidden(idx) ||
		    data.enabled && !data.enabled(idx) ||
		    data.maps && data.maps.indexOf(g_GameAttributes.mapType) == -1)
			return;

		data.select(this.selected);
		updateGameAttributes();
	};
}

function initDropdownArray(name)
{
	for (let i = 0; i < g_MaxPlayers; ++i)
		initDropdown(name, i);
}

function initCheckbox(name)
{
	let [guiName, guiIdx] = getGUIObjectNameFromSetting(name);
	Engine.GetGUIObjectByName(guiName + guiIdx).onPress = function() {

		let obj = g_Checkboxes[name];

		if (!g_IsController ||
		    g_IsInGuiUpdate ||
		    obj.enabled && !obj.enabled() ||
		    obj.hidden && obj.hidden())
			return;

		obj.set(this.checked);
		updateGameAttributes();
	};
}

/**
 * Remove empty space in case of hidden options (like cheats, rating or wonder duration)
 */
function resizeMoreOptionsWindow()
{
	const elementHeight = 30;

	let moreOptions = Engine.GetGUIObjectByName("moreOptions");
	let yPos = undefined;

	for (let guiOption of moreOptions.children)
	{
		if (guiOption.name == "moreOptionsLabel")
			continue;

		let gSize = guiOption.size;
		yPos = yPos || gSize.top;

		if (guiOption.hidden)
			continue;

		gSize.top = yPos;
		gSize.bottom = yPos + elementHeight - 2;
		guiOption.size = gSize;

		yPos += elementHeight;
	}

	// Resize the vertically centered window containing the options
	let mSize = moreOptions.size;
	mSize.bottom = mSize.top + yPos + 20;
	moreOptions.size = mSize;
}

/**
 * Called when the client disconnects.
 * The other cases from NetClient should never occur in the gamesetup.
 * @param {Object} message
 */
function handleNetStatusMessage(message)
{
	if (message.status != "disconnected")
	{
		error("Unrecognised netstatus type " + message.status);
		return;
	}

	cancelSetup();
	reportDisconnect(message.reason, true);
}

/**
 * Called whenever a client clicks on ready (or not ready).
 * @param {Object} message
 */
function handleReadyMessage(message)
{
	--g_ReadyChanged;

	if (g_ReadyChanged < 1 && g_PlayerAssignments[message.guid].player != -1)
		addChatMessage({
			"type": message.status == 1 ? "ready" : "not-ready",
			"guid": message.guid
		});

	if (!g_IsController)
		return;

	g_PlayerAssignments[message.guid].status = +message.status == 1;
	updateReadyUI();
}

/**
 * Called after every player is ready and the host decided to finally start the game.
 * @param {Object} message
 */
function handleGamestartMessage(message)
{
	// Immediately inform the lobby server instead of waiting for the load to finish
	if (g_IsController && Engine.HasXmppClient())
	{
		let clients = formatClientsForStanza();
		Engine.SendChangeStateGame(clients.connectedPlayers, clients.list);
	}

	Engine.SwitchGuiPage("page_loading.xml", {
		"attribs": g_GameAttributes,
		"isNetworked" : g_IsNetworked,
		"playerAssignments": g_PlayerAssignments,
		"isController": g_IsController
	});
}

/**
 * Called whenever the host changed any setting.
 * @param {Object} message
 */
function handleGamesetupMessage(message)
{
	if (!message.data)
		return;

	g_GameAttributes = message.data;

	if (!!g_GameAttributes.settings.RatingEnabled)
	{
		g_GameAttributes.settings.CheatsEnabled = false;
		g_GameAttributes.settings.LockTeams = true;
		g_GameAttributes.settings.LastManStanding = false;
	}

	Engine.SetRankedGame(!!g_GameAttributes.settings.RatingEnabled);

	updateGUIObjects();
}

/**
 * Called whenever a client joins/leaves or any gamesetting is changed.
 * @param {Object} message
 */
function handlePlayerAssignmentMessage(message)
{
	for (let guid in message.newAssignments)
		if (!g_PlayerAssignments[guid])
			onClientJoin(guid, message.newAssignments);

	for (let guid in g_PlayerAssignments)
		if (!message.newAssignments[guid])
			onClientLeave(guid);

	g_PlayerAssignments = message.newAssignments;

	updatePlayerList();
	updateReadyUI();
	sendRegisterGameStanza();
}

function onClientJoin(newGUID, newAssignments)
{
	addChatMessage({
		"type": "connect",
		"guid": newGUID,
		"username": newAssignments[newGUID].name
	});

	// Assign joining observers to unused player numbers
	if (!g_IsController || newAssignments[newGUID].player != -1)
		return;

	let freeSlot = g_GameAttributes.settings.PlayerData.findIndex((v,i) =>
		Object.keys(g_PlayerAssignments).every(guid => g_PlayerAssignments[guid].player != i+1)
	);

	if (freeSlot == -1)
		return;

	Engine.AssignNetworkPlayer(freeSlot + 1, newGUID);
	resetReadyData();
}

function onClientLeave(guid)
{
	addChatMessage({
		"type": "disconnect",
		"guid": guid
	});

	if (g_PlayerAssignments[guid].player != -1)
		resetReadyData();
}

/**
 * Doesn't translate, so that lobby clients can do that locally
 * (even if they don't have that map).
 */
function getMapDisplayName(map)
{
	if (map == "random")
		return map;

	let mapData = loadMapData(map);
	if (!mapData || !mapData.settings || !mapData.settings.Name)
		return map;

	return mapData.settings.Name;
}

function getMapPreview(map)
{
	let mapData = loadMapData(map);
	if (!mapData || !mapData.settings || !mapData.settings.Preview)
		return "nopreview.png";

	return mapData.settings.Preview;
}

/**
 * Get a playersetting or return the default if it wasn't set.
 */
function getSetting(settings, defaults, property)
{
	if (settings && (property in settings))
		return settings[property];

	if (defaults && (property in defaults))
		return defaults[property];

	return undefined;
}

/**
 * Initialize the dropdown containing all maps for the selected maptype and mapfilter.
 */
function reloadMapList()
{
	if (!g_MapPath[g_GameAttributes.mapType])
	{
		error("Unexpected map type: " + g_GameAttributes.mapType);
		return;
	}

	let mapFiles = g_GameAttributes.mapType == "random" ?
		getJSONFileList(g_GameAttributes.mapPath) :
		getXMLFileList(g_GameAttributes.mapPath);

	// Apply map filter, if any defined
	let mapList = [];
	if (g_GameAttributes.mapType == "random")
		mapList.push({
			"file": "random",
			"name": '[color="' + g_ColorRandom + '"]' + translateWithContext("map type", "Random") + "[/color]"
		});

	// TODO: Should verify these are valid maps before adding to list
	for (let mapFile of mapFiles)
	{
		let file = g_GameAttributes.mapPath + mapFile;
		let mapData = loadMapData(file);
		let filterID = g_MapFilters.id.find(filter => filter == g_GameAttributes.mapFilter);
		let mapFilter = g_MapFilters.filter[filterID] || undefined;

		if (!mapData.settings || mapFilter && !mapFilter(mapData.settings.Keywords || []))
			continue;

		mapList.push({
			"file": file,
			"name": translate(getMapDisplayName(file))
		});
	}

	g_MapList = prepareForDropdown(mapList.sort(sortNameIgnoreCase));
	initDropdown("mapSelection")
}

function loadMapData(name)
{
	if (!name || !g_MapPath[g_GameAttributes.mapType])
		return undefined;

	if (name == "random")
		return { "settings": { "Name": "", "Description": "" } };

	if (!g_MapData[name])
		g_MapData[name] = g_GameAttributes.mapType == "random" ?
			Engine.ReadJSONFile(name + ".json") :
			Engine.LoadMapSettings(name);

	return g_MapData[name];
}

/**
 * Sets the gameattributes the way they were the last time the user left the gamesetup.
 */
function loadPersistMatchSettings()
{
	if (Engine.ConfigDB_GetValue("user", "persistmatchsettings") != "true")
		return;

	let settingsFile = g_IsNetworked ? g_MatchSettings_MP : g_MatchSettings_SP;
	if (!Engine.FileExists(settingsFile))
		return;

	let attrs = Engine.ReadJSONFile(settingsFile);
	if (!attrs || !attrs.settings)
		return;

	g_IsInGuiUpdate = true;

	let mapName = attrs.map || "";
	let mapSettings = attrs.settings;

	g_GameAttributes = attrs;

	if (!g_IsNetworked)
		mapSettings.CheatsEnabled = true;

	// Replace unselectable civs with random civ
	let playerData = mapSettings.PlayerData;
	if (playerData && g_GameAttributes.mapType != "scenario")
		for (let i in playerData)
			if (!g_CivData[playerData[i].Civ] || !g_CivData[playerData[i].Civ].SelectableInGameSetup)
				playerData[i].Civ = "random";

	// Apply map settings
	let newMapData = loadMapData(mapName);
	if (newMapData && newMapData.settings)
	{
		for (let prop in newMapData.settings)
			mapSettings[prop] = newMapData.settings[prop];

		if (playerData)
			mapSettings.PlayerData = playerData;
	}

	if (mapSettings.PlayerData)
		sanitizePlayerData(mapSettings.PlayerData);

	// Reload, as the maptype or mapfilter might have changed
	reloadMapList();

	g_GameAttributes.settings.RatingEnabled = Engine.HasXmppClient();
	Engine.SetRankedGame(g_GameAttributes.settings.RatingEnabled);

	supplementDefaults();

	updateGUIObjects();
}

function savePersistMatchSettings()
{
	let attributes = Engine.ConfigDB_GetValue("user", "persistmatchsettings") == "true" ? g_GameAttributes : {};
	Engine.WriteJSONFile(g_IsNetworked ? g_MatchSettings_MP : g_MatchSettings_SP, attributes);
}

function sanitizePlayerData(playerData)
{
	// Remove gaia
	if (playerData.length && !playerData[0])
		playerData.shift();

	playerData.forEach((pData, index) => {
		pData.Color = pData.Color || g_PlayerColors[index];
		pData.Civ = pData.Civ || "random";

		// Use default AI if the map doesn't specify any explicitly
		if (!("AI" in pData))
			pData.AI = g_DefaultPlayerData[index].AI;

		if (!("AIDiff" in pData))
			pData.AIDiff = g_DefaultPlayerData[index].AIDiff;
	});

	// Replace colors with the best matching color of PlayerDefaults
	if (g_GameAttributes.mapType != "scenario")
	{
		playerData.forEach((pData, index) => {
			let colorDistances = g_PlayerColors.map(color => colorDistance(color, pData.Color));
			let smallestDistance = colorDistances.find(distance => colorDistances.every(distance2 => (distance2 >= distance)));
			pData.Color = g_PlayerColors.find(color => colorDistance(color, pData.Color) == smallestDistance);
		});
	}

	ensureUniquePlayerColors(playerData);
}

function cancelSetup()
{
	if (g_IsController)
		savePersistMatchSettings();

	Engine.DisconnectNetworkGame();

	if (Engine.HasXmppClient())
	{
		Engine.LobbySetPlayerPresence("available");

		if (g_IsController)
			Engine.SendUnregisterGame();

		Engine.SwitchGuiPage("page_lobby.xml");
	}
	else
		Engine.SwitchGuiPage("page_pregame.xml");
}

/**
 * Can't init the GUI before the first tick.
 * Process netmessages afterwards.
 */
function onTick()
{
	if (!g_Settings)
		return;

	// First tick happens before first render, so don't load yet
	if (g_LoadingState == 0)
		++g_LoadingState;
	else if (g_LoadingState == 1)
	{
		initGUIObjects();
		++g_LoadingState;
	}
	else if (g_LoadingState == 2)
		handleNetMessages();

	updateTimers();
}

/**
 * Handles all pending messages sent by the net client.
 */
function handleNetMessages()
{
	while (g_IsNetworked)
	{
		let message = Engine.PollNetworkClient();
		if (!message)
			break;

		log("Net message: " + uneval(message));

		if (g_NetMessageTypes[message.type])
			g_NetMessageTypes[message.type](message);
		else
			error("Unrecognised net message type " + message.type);
	}
}

/**
 * Called when the map or the number of players changes.
 */
function unassignInvalidPlayers(maxPlayers)
{
	if (g_IsNetworked)
	{
		// Remove invalid playerIDs from the servers playerassignments copy
		for (let playerID = +maxPlayers + 1; playerID <= g_MaxPlayers; ++playerID)
			Engine.AssignNetworkPlayer(playerID, "");
	}
	else if (!g_PlayerAssignments.local ||
	         g_PlayerAssignments.local.player > maxPlayers)
		g_PlayerAssignments = {
			"local": {
				"name": singleplayerName(),
				"player": 1
			}
		};
}

/**
 * Called when the host choses the number of players on a random map.
 * @param {Number} num
 */
function selectNumPlayers(num)
{
	if (g_GameAttributes.mapType != "random")
		return;

	let pData = g_GameAttributes.settings.PlayerData;
	g_GameAttributes.settings.PlayerData =
		num > pData.length ?
			pData.concat(g_DefaultPlayerData.slice(pData.length, num)) :
			pData.slice(0, num);

	unassignInvalidPlayers(num);

	sanitizePlayerData(g_GameAttributes.settings.PlayerData);

	supplementDefaults();
}

function ensureUniquePlayerColors(playerData)
{
	for (let i = playerData.length - 1; i >= 0; --i)
		// If someone else has that color, assign an unused color
		if (playerData.some((pData, j) => i != j && sameColor(playerData[i].Color, pData.Color)))
			playerData[i].Color = g_PlayerColors.find(color => playerData.every(pData => !sameColor(color, pData.Color)));
}

function selectMap(name)
{
	// Reset some map specific properties which are not necessarily redefined on each map
	for (let prop of ["TriggerScripts", "CircularMap", "Garrison"])
		g_GameAttributes.settings[prop] = undefined;

	let mapData = loadMapData(name);
	let mapSettings = mapData && mapData.settings ? deepcopy(mapData.settings) : {};

	// Reset victory conditions
	if (g_GameAttributes.mapType != "random")
	{
		let victoryIdx = g_VictoryConditions.Name.indexOf(mapSettings.GameType || "") != -1 ? g_VictoryConditions.Name.indexOf(mapSettings.GameType) : g_VictoryConditions.Default;
		g_GameAttributes.settings.GameType = g_VictoryConditions.Name[victoryIdx];
		g_GameAttributes.settings.VictoryScripts = g_VictoryConditions.Scripts[victoryIdx];
	}

	if (g_GameAttributes.mapType == "scenario")
	{
		delete g_GameAttributes.settings.WonderDuration;
		delete g_GameAttributes.settings.LastManStanding;
	}

	if (mapSettings.PlayerData)
		sanitizePlayerData(mapSettings.PlayerData);

	// Copy any new settings
	g_GameAttributes.map = name;
	g_GameAttributes.script = mapSettings.Script;
	if (g_GameAttributes.map !== "random")
		for (let prop in mapSettings)
			g_GameAttributes.settings[prop] = mapSettings[prop];

	unassignInvalidPlayers(g_GameAttributes.settings.PlayerData.length);
	supplementDefaults();
}

/**
 * Check can be moved to hidden() once it's not identical for all control-arrays anymore
 */
function isControlArrayElementHidden(idx)
{
	return idx !== undefined && idx >= g_GameAttributes.settings.PlayerData.length;
}

/**
 * @param name - Name of the setting to be changed (not the one of the dropdown)
 * @param idx - Only specified for dropdown arrays.
 */
function updateGUIDropdown(name, idx = undefined)
{
	let [guiName, guiIdx] = getGUIObjectNameFromSetting(name);
	let idxName = idx === undefined ? "": "[" + idx + "]";

	let dropdown = Engine.GetGUIObjectByName(guiName + guiIdx + idxName);
	let label = Engine.GetGUIObjectByName(guiName + "Text" + guiIdx + idxName);
	let frame = Engine.GetGUIObjectByName(guiName + "Frame" + guiIdx + idxName);
	let title = Engine.GetGUIObjectByName(guiName + "Title" + guiIdx);

	let indexHidden = isControlArrayElementHidden(idx);
	let obj = (idx === undefined ? g_Dropdowns : g_DropdownArrays)[name];
	let selected = indexHidden ? -1 : dropdown.list_data.indexOf(String(obj.get(idx)));
	let enabled = !indexHidden && (!obj.enabled || obj.enabled(idx));
	let hidden = indexHidden || obj.hidden && obj.hidden(idx);

	dropdown.hidden = !g_IsController || !enabled || hidden;
	dropdown.selected = selected;
	dropdown.tooltip = obj.tooltip ? obj.tooltip() : "";

	if (frame)
		frame.hidden = hidden;

	if (title && obj.title)
		title.caption = obj.title();

	if (label)
	{
		label.hidden = g_IsController && enabled || hidden;
		label.caption = selected == -1 ? translateWithContext("option value", "Unknown") : dropdown.list[selected];
	}
}

/**
 * Not used for the player assignments, so checkboxArrays are not implemented,
 * hence no index.
 */
function updateGUICheckbox(name)
{
	let obj = g_Checkboxes[name];

	let checked = obj.get();
	let hidden = obj.hidden && obj.hidden();
	let enabled = !obj.enabled || obj.enabled();

	let [guiName, guiIdx] = getGUIObjectNameFromSetting(name);
	let checkbox = Engine.GetGUIObjectByName(guiName + guiIdx);
	let label = Engine.GetGUIObjectByName(guiName + "Text" + guiIdx);
	let frame = Engine.GetGUIObjectByName(guiName + "Frame" + guiIdx);
	let title = Engine.GetGUIObjectByName(guiName + "Title" + guiIdx);

	checkbox.checked = checked;
	checkbox.enabled = enabled;
	checkbox.hidden = hidden || !g_IsController;
	checkbox.tooltip = obj.tooltip ? obj.tooltip() : "";

	label.caption = checked ? translate("Yes") : translate("No");
	label.hidden = hidden || g_IsController;

	if (frame)
		frame.hidden = hidden;

	if (title && obj.title)
		title.caption = obj.title();
}

function updateGUIMiscControl(name, idx)
{
	let idxName = idx === undefined ? "": "[" + idx + "]";

	let obj = g_MiscControls[name];
	let control = Engine.GetGUIObjectByName(name + idxName);

	for (let property in obj)
		control[property] = obj[property]();

	if (isControlArrayElementHidden(idx))
		control.hidden = true;
}

function launchGame()
{
	if (!g_IsController)
	{
		error("Only host can start game");
		return;
	}

	if (!g_GameAttributes.map)
		return;

	savePersistMatchSettings();

	// Select random map
	if (g_GameAttributes.map == "random")
	{
		let victoryScriptsSelected = g_GameAttributes.settings.VictoryScripts;
		let gameTypeSelected = g_GameAttributes.settings.GameType;
		selectMap(Engine.GetGUIObjectByName("mapSelection").list_data[Math.floor(Math.random() *
			(Engine.GetGUIObjectByName("mapSelection").list.length - 1)) + 1]);
		g_GameAttributes.settings.VictoryScripts = victoryScriptsSelected;
		g_GameAttributes.settings.GameType = gameTypeSelected;
	}

	g_GameAttributes.settings.TriggerScripts = g_GameAttributes.settings.VictoryScripts.concat(g_GameAttributes.settings.TriggerScripts || []);

	// Prevent reseting the readystate
	g_GameStarted = true;

	g_GameAttributes.settings.mapType = g_GameAttributes.mapType;

	// Get a unique array of selectable cultures
	let cultures = Object.keys(g_CivData).filter(civ => g_CivData[civ].SelectableInGameSetup).map(civ => g_CivData[civ].Culture);
	cultures = cultures.filter((culture, index) => cultures.indexOf(culture) === index);

	// Determine random civs and botnames
	for (let i in g_GameAttributes.settings.PlayerData)
	{
		// Pick a random civ of a random culture
		let chosenCiv = g_GameAttributes.settings.PlayerData[i].Civ || "random";
		if (chosenCiv == "random")
		{
			let culture = cultures[Math.floor(Math.random() * cultures.length)];
			let civs = Object.keys(g_CivData).filter(civ => g_CivData[civ].Culture == culture);
			chosenCiv = civs[Math.floor(Math.random() * civs.length)];
		}
		g_GameAttributes.settings.PlayerData[i].Civ = chosenCiv;

		// Pick one of the available botnames for the chosen civ
		if (g_GameAttributes.mapType === "scenario" || !g_GameAttributes.settings.PlayerData[i].AI)
			continue;

		let chosenName = g_CivData[chosenCiv].AINames[Math.floor(Math.random() * g_CivData[chosenCiv].AINames.length)];

		if (!g_IsNetworked)
			chosenName = translate(chosenName);

		// Count how many players use the chosenName
		let usedName = g_GameAttributes.settings.PlayerData.filter(pData => pData.Name && pData.Name.indexOf(chosenName) !== -1).length;

		g_GameAttributes.settings.PlayerData[i].Name = !usedName ? chosenName : sprintf(translate("%(playerName)s %(romanNumber)s"), { "playerName": chosenName, "romanNumber": g_RomanNumbers[usedName+1] });
	}

	// Copy playernames for the purpose of replays
	for (let guid in g_PlayerAssignments)
	{
		let player = g_PlayerAssignments[guid];
		if (player.player > 0)	// not observer or GAIA
			g_GameAttributes.settings.PlayerData[player.player - 1].Name = player.name;
	}

	// Seed used for both map generation and simulation
	g_GameAttributes.settings.Seed = Math.floor(Math.random() * Math.pow(2, 32));
	g_GameAttributes.settings.AISeed = Math.floor(Math.random() * Math.pow(2, 32));

	// Used for identifying rated game reports for the lobby
	g_GameAttributes.matchID = Engine.GetMatchID();

	if (g_IsNetworked)
	{
		Engine.SetNetworkGameAttributes(g_GameAttributes);
		Engine.StartNetworkGame();
	}
	else
	{
		// Find the player ID which the user has been assigned to
		let playerID = -1;
		for (let i in g_GameAttributes.settings.PlayerData)
		{
			let assignBox = Engine.GetGUIObjectByName("playerAssignment["+i+"]");
			if (assignBox.list_data[assignBox.selected] == "local")
				playerID = +i+1;
		}

		Engine.StartGame(g_GameAttributes, playerID);
		Engine.SwitchGuiPage("page_loading.xml", {
			"attribs": g_GameAttributes,
			"isNetworked" : g_IsNetworked,
			"playerAssignments": g_PlayerAssignments
		});
	}
}

/**
 * Don't set any attributes here, just show the changes in the GUI.
 *
 * Unless the mapsettings don't specify a property and the user didn't set it in g_GameAttributes previously.
 */
function updateGUIObjects()
{
	g_IsInGuiUpdate = true;

	// Hide exceeding dropdowns and checkboxes
	for (let child of Engine.GetGUIObjectByName("moreOptions").children)
		if (child.name != "moreOptionsLabel" && child.name != "hideMoreOptions")
			child.hidden = true;

	// Show the relevant ones
	for (let name in g_Dropdowns)
		updateGUIDropdown(name);

	for (let name in g_Checkboxes)
		updateGUICheckbox(name);

	for (let i = 0; i < g_MaxPlayers; ++i)
	{
		for (let name in g_DropdownArrays)
			updateGUIDropdown(name, i);

		for (let name in g_MiscControlArrays)
			updateGUIMiscControl(name, i);
	}

	for (let name in g_MiscControls)
		updateGUIMiscControl(name);

	updateGameDescription();
	resizeMoreOptionsWindow();

	g_IsInGuiUpdate = false;

	// Game attributes include AI settings, so update the player list
	updatePlayerList();

	resetReadyData();

	// Refresh AI config page
	if (g_LastViewedAIPlayer != -1)
	{
		Engine.PopGuiPage();
		openAIConfig(g_LastViewedAIPlayer);
	}
}

function updateGameDescription()
{
	setMapPreviewImage("mapPreview", getMapPreview(g_GameAttributes.map));

	Engine.GetGUIObjectByName("mapInfoName").caption =
		translateMapTitle(getMapDisplayName(g_GameAttributes.map));

	Engine.GetGUIObjectByName("mapInfoDescription").caption = getGameDescription();
}

/**
 * Broadcast the changed settings to all clients and the lobbybot.
 */
function updateGameAttributes()
{
	if (g_IsInGuiUpdate || !g_IsController)
		return;

	if (g_IsNetworked)
	{
		Engine.SetNetworkGameAttributes(g_GameAttributes);
		if (g_LoadingState >= 2)
			sendRegisterGameStanza();
	}
	else
		updateGUIObjects();
}

function openAIConfig(playerSlot)
{
	g_LastViewedAIPlayer = playerSlot;

	Engine.PushGuiPage("page_aiconfig.xml", {
		"callback": "AIConfigCallback",
		"isController": g_IsController,
		"playerSlot": playerSlot,
		"id": g_GameAttributes.settings.PlayerData[playerSlot].AI,
		"difficulty": g_GameAttributes.settings.PlayerData[playerSlot].AIDiff
	});
}

/**
 * Called after closing the dialog.
 */
function AIConfigCallback(ai)
{
	g_LastViewedAIPlayer = -1;

	if (!ai.save || !g_IsController)
		return;

	g_GameAttributes.settings.PlayerData[ai.playerSlot].AI = ai.id;
	g_GameAttributes.settings.PlayerData[ai.playerSlot].AIDiff = ai.difficulty;

	updateGameAttributes();
}

/**
 * TODO: delete
 */
var g_PlayerAssignmentChoices;
function updatePlayerList()
{
	g_IsInGuiUpdate = true;

	let playerChoices = sortGUIDsByPlayerID().map(guid => ({
		"id": "guid:" + guid,
		"label":
			g_PlayerAssignments[guid].player == -1 ?
			"[color=\""+ g_UnassignedPlayerColor + "\"]" + g_PlayerAssignments[guid].name + "[/color]" :
			g_PlayerAssignments[guid].name
	}));

	let aiChoices = g_Settings.AIDescriptions
		.filter(ai => !ai.data.hidden || !!g_GameAttributes.settings.PlayerData.every(pData => pData.AI != ai.id))
		.map(ai => ({
			"id": "ai:" + ai.id,
			"label": "[color=\""+ g_AIColor + "\"]" +
			          sprintf(translate("AI: %(ai)s"), {
			              "ai": translate(ai.data.name)
			          }) + "[/color]"
	}));

	let unassignedSlot = [{
		"id": "",
		"label": "[color=\""+ g_UnassignedColor + "\"]" + translate("Unassigned") + "[/color]",
	}];
	g_PlayerAssignmentChoices = playerChoices.concat(aiChoices).concat(unassignedSlot);

	let assignments = [];
	let aiAssignments = {};
	for (let guid of sortGUIDsByPlayerID())
		assignments[g_PlayerAssignments[guid].player] = g_HostNameList.length - 1;

	initDropdownArray("playerAssignment");

	g_IsInGuiUpdate = false;
}

function swapPlayers(guid, newSlot)
{
	// Player slots are indexed from 0 as Gaia is omitted.
	let newPlayerID = newSlot + 1;
	let playerID = g_PlayerAssignments[guid].player;

	// Attempt to swap the player or AI occupying the target slot,
	// if any, into the slot this player is currently in.
	if (playerID != -1)
	{
		for (let guid in g_PlayerAssignments)
		{
			// Move the player in the destination slot into the current slot.
			if (g_PlayerAssignments[guid].player != newPlayerID)
				continue;

			if (g_IsNetworked)
				Engine.AssignNetworkPlayer(playerID, guid);
			else
				g_PlayerAssignments[guid].player = playerID;
			break;
		}

		// Transfer the AI from the target slot to the current slot.
		g_GameAttributes.settings.PlayerData[playerID - 1].AI = g_GameAttributes.settings.PlayerData[newSlot].AI;

		// Swap civilizations if they aren't fixed
		if (g_GameAttributes.mapType != "scenario")
		{
			[g_GameAttributes.settings.PlayerData[playerID - 1].Civ, g_GameAttributes.settings.PlayerData[newSlot].Civ] =
				[g_GameAttributes.settings.PlayerData[newSlot].Civ, g_GameAttributes.settings.PlayerData[playerID - 1].Civ];
		}
	}

	if (g_IsNetworked)
		Engine.AssignNetworkPlayer(newPlayerID, guid);
	else
		g_PlayerAssignments[guid].player = newPlayerID;

	g_GameAttributes.settings.PlayerData[newSlot].AI = "";
}

function submitChatInput()
{
	let input = Engine.GetGUIObjectByName("chatInput");
	let text = input.caption;
	if (!text.length)
		return;

	input.caption = "";

	if (executeNetworkCommand(text))
		return;

	Engine.SendNetworkChat(text);
}

function senderFont(text)
{
	return '[font="' + g_SenderFont + '"]' + text + '[/font]';
}

function systemMessage(message)
{
	return senderFont(sprintf(translate("== %(message)s"), { "message": message }));
}

function colorizePlayernameByGUID(guid, username = "")
{
	// TODO: Maybe the host should have the moderator-prefix?
	if (!username)
		username = g_PlayerAssignments[guid] ? escapeText(g_PlayerAssignments[guid].name) : translate("Unknown Player");
	let playerID = g_PlayerAssignments[guid] ? g_PlayerAssignments[guid].player : -1;

	let color = "white";
	if (playerID > 0)
	{
		color = g_GameAttributes.settings.PlayerData[playerID - 1].Color;

		// Enlighten playercolor to improve readability
		let [h, s, l] = rgbToHsl(color.r, color.g, color.b);
		let [r, g, b] = hslToRgb(h, s, Math.max(0.6, l));

		color = rgbToGuiColor({ "r": r, "g": g, "b": b });
	}

	return '[color="'+ color +'"]' + username + '[/color]';
}

function addChatMessage(msg)
{
	if (msg.type != "system" && msg.text)
	{
		let userName = g_PlayerAssignments[Engine.GetPlayerGUID() || "local"].name;

		if (userName != g_PlayerAssignments[msg.guid].name)
			notifyUser(userName, msg.text);
	}

	if (!g_FormatChatMessage[msg.type])
		return;

	let user = colorizePlayernameByGUID(msg.guid || -1, msg.username || "");

	let text = g_FormatChatMessage[msg.type](msg, user);

	if (Engine.ConfigDB_GetValue("user", "chat.timestamp") == "true")
		text = sprintf(translate("%(time)s %(message)s"), {
			"time": sprintf(translate("\\[%(time)s]"), {
				"time": Engine.FormatMillisecondsIntoDateString(new Date().getTime(), translate("HH:mm"))
			}),
			"message": text
		});

	g_ChatMessages.push(text);

	Engine.GetGUIObjectByName("chatText").caption = g_ChatMessages.join("\n");
}

function showMoreOptions(show)
{
	Engine.GetGUIObjectByName("moreOptionsFade").hidden = !show;
	Engine.GetGUIObjectByName("moreOptions").hidden = !show;
}

function resetCivilizations()
{
	for (let i in g_GameAttributes.settings.PlayerData)
		g_GameAttributes.settings.PlayerData[i].Civ = "random";

	updateGameAttributes();
}

function resetTeams()
{
	for (let i in g_GameAttributes.settings.PlayerData)
		g_GameAttributes.settings.PlayerData[i].Team = -1;

	updateGameAttributes();
}

function toggleReady()
{
	setReady(!g_IsReady);
}

function setReady(ready, sendMessage = true)
{
	g_IsReady = ready;

	if (sendMessage)
		Engine.SendNetworkReady(+g_IsReady);

	if (g_IsController)
		return;

	let button = Engine.GetGUIObjectByName("startGame");

	button.caption = g_IsReady ?
		translate("I'm not ready!") :
		translate("I'm ready");

	button.tooltip = g_IsReady ?
		translate("State that you are not ready to play.") :
		translate("State that you are ready to play!");
}

function updateReadyUI()
{
	if (!g_IsNetworked)
		return;

	let isAI = new Array(g_MaxPlayers + 1).fill(true);
	let allReady = true;
	for (let guid in g_PlayerAssignments)
	{
		// We don't really care whether observers are ready.
		if (g_PlayerAssignments[guid].player == -1 || !g_GameAttributes.settings.PlayerData[g_PlayerAssignments[guid].player - 1])
			continue;
		let pData = g_GameAttributes.settings.PlayerData ? g_GameAttributes.settings.PlayerData[g_PlayerAssignments[guid].player - 1] : {};
		let pDefs = g_DefaultPlayerData ? g_DefaultPlayerData[g_PlayerAssignments[guid].player - 1] : {};
		isAI[g_PlayerAssignments[guid].player] = false;
		if (g_PlayerAssignments[guid].status || !g_IsNetworked)
			Engine.GetGUIObjectByName("playerName[" + (g_PlayerAssignments[guid].player - 1) + "]").caption = '[color="' + g_ReadyColor + '"]' + translate(getSetting(pData, pDefs, "Name")) + '[/color]';
		else
		{
			Engine.GetGUIObjectByName("playerName[" + (g_PlayerAssignments[guid].player - 1) + "]").caption = translate(getSetting(pData, pDefs, "Name"));
			allReady = false;
		}
	}

	// AIs are always ready.
	for (let playerid = 0; playerid < g_MaxPlayers; ++playerid)
	{
		if (!g_GameAttributes.settings.PlayerData[playerid])
			continue;
		let pData = g_GameAttributes.settings.PlayerData ? g_GameAttributes.settings.PlayerData[playerid] : {};
		let pDefs = g_DefaultPlayerData ? g_DefaultPlayerData[playerid] : {};
		if (isAI[playerid + 1])
			Engine.GetGUIObjectByName("playerName[" + playerid + "]").caption = '[color="' + g_ReadyColor + '"]' + translate(getSetting(pData, pDefs, "Name")) + '[/color]';
	}

	// The host is not allowed to start until everyone is ready.
	if (g_IsNetworked && g_IsController)
	{
		let startGameButton = Engine.GetGUIObjectByName("startGame");

		// Add a explanation on to the tooltip if disabled.
		let disabledIndex = startGameButton.tooltip.indexOf('Disabled');
		if (disabledIndex != -1 && allReady)
			startGameButton.tooltip = startGameButton.tooltip.substring(0, disabledIndex - 2);
		else if (disabledIndex == -1 && !allReady)
			startGameButton.tooltip = startGameButton.tooltip + " (Disabled until all players are ready)";
	}
}

function resetReadyData()
{
	if (g_GameStarted)
		return;

	if (g_ReadyChanged < 1)
		addChatMessage({ "type": "settings" });
	else if (g_ReadyChanged == 2 && !g_ReadyInit)
		return; // duplicate calls on init
	else
		g_ReadyInit = false;

	g_ReadyChanged = 2;
	if (!g_IsNetworked)
		g_IsReady = true;
	else if (g_IsController)
	{
		Engine.ClearAllPlayerReady();
		setReady(true);
	}
	else
		setReady(false, false);
}

/**
 * Send a list of playernames and distinct between players and observers.
 * Don't send teams, AIs or anything else until the game was started.
 * The playerData format from g_GameAttributes is kept to reuse the GUI function presenting the data.
 */
function formatClientsForStanza()
{
	let connectedPlayers = 0;
	let playerData = [];

	for (let guid in g_PlayerAssignments)
	{
		let pData = { "Name": g_PlayerAssignments[guid].name };

		if (g_GameAttributes.settings.PlayerData[g_PlayerAssignments[guid].player - 1])
			++connectedPlayers;
		else
			pData.Team = "observer";

		playerData.push(pData);
	}

	return {
		"list": playerDataToStringifiedTeamList(playerData),
		"connectedPlayers": connectedPlayers
	};
}

/**
 * Send the relevant gamesettings to the lobbybot.
 */
function sendRegisterGameStanza()
{
	if (!g_IsController || !Engine.HasXmppClient())
		return;

	let clients = formatClientsForStanza();

	let stanza = {
		"name": g_ServerName,
		"port": g_ServerPort,
		"mapName": g_GameAttributes.map,
		"niceMapName": getMapDisplayName(g_GameAttributes.map),
		// TODO: once persist-matchsettings aren't bugging anymore, this should become g_GameAttributes.settings.Size || 0
		"mapSize": g_GameAttributes.mapType == "random" ? g_GameAttributes.settings.Size : "Default",
		"mapType": g_GameAttributes.mapType,
		"victoryCondition": g_VictoryConditions.Title[g_VictoryConditions.Name.indexOf(g_GameAttributes.settings.GameType)],
		"nbp": clients.connectedPlayers,
		"maxnbp": g_GameAttributes.settings.PlayerData.length,
		"players": clients.list,
	};

	// Only send the stanza if the relevant settings actually changed
	if (g_LastGameStanza && Object.keys(stanza).every(prop => g_LastGameStanza[prop] == stanza[prop]))
		return;

	g_LastGameStanza = stanza;
	Engine.SendRegisterGame(stanza);
}

function getChatAutocompleteEntries()
{
	// TODO: autocomplete civ names
	return Object.keys(g_PlayerAssignments).map(guid => g_PlayerAssignments.name);
}
