function init(data)
{
	Engine.GetGUIObjectByName("mainText").caption = Engine.TranslateLines(data.data.text);
	Engine.GetGUIObjectByName("displaySplashScreen").checked = Engine.ConfigDB_GetValue("user", "splashscreendisable") !== "true";

	Engine.ConfigDB_CreateValue("user", "splashscreenversion", data.data.hash);
	Engine.ConfigDB_WriteValueToFile("user", "splashscreenversion", data.data.hash, "config/user.cfg");
}

function closeSplashScreen()
{
	let disabled = String(!Engine.GetGUIObjectByName("displaySplashScreen").checked);
	Engine.ConfigDB_CreateValue("user", "splashscreendisable", disabled);
	Engine.ConfigDB_WriteValueToFile("user", "splashscreendisable", disabled, "config/user.cfg");
	Engine.PopGuiPageCB();
}
