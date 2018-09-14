function init()
{
	Engine.GetGUIObjectByName("mainText").caption = Engine.TranslateLines(Engine.ReadFile("gui/modmod/help/help.txt"));

	let moddingGuideButton = Engine.GetGUIObjectByName("moddingGuideButton");
	moddingGuideButton.caption = translate("Modding Guide");
	moddingGuideButton.onPress = () => {
		Engine.OpenURL("https://trac.wildfiregames.com/wiki/Modding_Guide");
	};

	let closeButton = Engine.GetGUIObjectByName("closeButton");
	closeButton.caption = translate("Close");
	closeButton.onPress = () => {
		Engine.PopGuiPage();
	};
}
