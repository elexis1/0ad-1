var g_TermsPage = "";
var g_TermsFile = "";

function init(data)
{
	g_TermsPage = data.page;
	g_TermsFile = data.file;

	Engine.GetGUIObjectByName("title").caption = data.title;
	initLanguageDropdown();
	initCustomButtons(data.buttons);
}

function initCustomButtons(buttonsData)
{
	let buttonHeight = 30;

	buttonsData.forEach((buttonData, i) => {

		let button = Engine.GetGUIObjectByName("button[" + i + "]");
		if (buttonData.url)
		{
			button.tooltip = sprintf(translate("Open %(url)s in the browser."), {
				"url": buttonData.url
			});
			button.onPress = () => {
				openURL(buttonData.url);
			};
		}
		else if (buttonData.messageBox)
			button.onPress = () => {
				messageBox(
					400, 200,
					buttonData.messageBox.subject,
					buttonData.messageBox.caption,
					undefined,
					undefined,
					undefined,
					buttonData.messageBox.selectable);
			};

		let size = button.size;
		size.top = -buttonHeight * (buttonsData.length - i);
		size.bottom = -buttonHeight * (buttonsData.length - i - 1);
		size.right = Engine.GetTextWidth(button.font, buttonData.caption) + 10;
		button.size = size;

		button.caption = buttonData.caption;
		button.hidden = false;
	});

	let mainTextPanel = Engine.GetGUIObjectByName("mainTextPanel");
	let size = mainTextPanel.size;
	size.bottom = -Math.max(buttonsData.length, 1) * buttonHeight;
	mainTextPanel.size = size;
}

function initLanguageDropdown()
{
	let displayNames = Engine.GetSupportedLocaleDisplayNames();
	let baseNames = Engine.GetSupportedLocaleBaseNames();

	// en-US
	let languages_list = [displayNames[0]];
	let languages_list_data = [baseNames[0]];

	let currentLocaleDict = Engine.GetFallbackToAvailableDictLocale(Engine.GetCurrentLocale());
	if (currentLocaleDict != languages_list_data[0])
	{
		languages_list.push(displayNames[baseNames.indexOf(currentLocaleDict)]);
		languages_list_data.push(currentLocaleDict);
	}

	let language = Engine.GetGUIObjectByName("language");
	language.list = languages_list;
	language.list_data = languages_list;
	language.selected = 0;
}

function selectLanguage()
{
	let txt = Engine.ReadFile("gui/" + g_TermsFile + ".txt");

	if (Engine.GetGUIObjectByName("language").selected == 1)
		txt = Engine.TranslateLines(txt);

	Engine.GetGUIObjectByName("mainText").caption = txt;
}

function closeTerms(accepted)
{
	Engine.PopGuiPageCB({
		"page": g_TermsPage,
		"accepted": accepted
	});
}
