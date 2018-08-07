var g_TermsPage = "";
var g_TermsFile = "";

function init(data)
{
	g_TermsPage = data.page;
	g_TermsFile = data.file;

	Engine.GetGUIObjectByName("title").caption = data.title;
	initButtons(data);
	initLanguageDropdown();
}

function initButtons(data)
{
	for (let i = 0; i <= 1; ++i)
	{
		let button = Engine.GetGUIObjectByName("button" + i);
		let buttonData = data.buttons && data.buttons[i];

		button.hidden = !buttonData;
		if (buttonData)
		{
			button.caption = buttonData.caption;
			button.tooltip = sprintf(translate("Open %(url)s in the browser."), {
				"url": buttonData.url
			});
			button.onPress = () => {
				Engine.OpenURL(buttonData.url);
			}
		}
	}
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
