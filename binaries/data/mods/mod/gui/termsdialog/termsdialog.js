var g_TermsPage = "";
var g_TermsFile = "";

function init(data)
{
	g_TermsPage = data.page;
	g_TermsFile = data.file;

	Engine.GetGUIObjectByName("title").caption = data.title;
	initURLButtons(data);
	initLanguageDropdown();
}

function initURLButtons(data)
{
	for (let i = 0; i <= 1; ++i)
	{
		let urlButton = Engine.GetGUIObjectByName("urlButton" + i);
		let urlButtonData = data.urlButtons && data.urlButtons[i];

		urlButton.hidden = !urlButtonData;
		if (urlButtonData)
		{
			urlButton.caption = urlButtonData.caption;
			urlButton.tooltip = sprintf(translate("Open %(url)s in the browser."), {
				"url": urlButtonData.url
			});
			urlButton.onPress = () => {
				Engine.OpenURL(urlButtonData.url);
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
