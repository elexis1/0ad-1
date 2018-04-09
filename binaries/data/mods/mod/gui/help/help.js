function init(data)
{
	Engine.GetGUIObjectByName("mainText").caption = Engine.TranslateLines(Engine.ReadFile("gui/help/help.txt"));
}
