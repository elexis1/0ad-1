var g_TermsPage;
var g_TermsFile;
var g_TermsSprintf;

function init(data)
{
	g_TermsPage = data.page;
	g_TermsFile = data.file;
	g_TermsSprintf = data.sprintf;

	Engine.GetGUIObjectByName("title").caption = data.title;
	initLanguageDropdown();
	initURLButtons(data.urlButtons);
}

function initURLButtons(urlButtons, selectableTexts)
{
	urlButtons.forEach((urlButton, i) => {

		let button = Engine.GetGUIObjectByName("button[" + i + "]");
		button.caption = urlButton.caption;
		button.hidden = false;
		button.tooltip = sprintf(translate("Open %(url)s in the browser."), {
			"url": urlButton.url
		});
		button.onPress = () => {
			openURL(urlButton.url);
		};
	});
}

function initLanguageDropdown()
{
	let displayNames = Engine.GetSupportedLocaleDisplayNames();
	let baseNames = Engine.GetSupportedLocaleBaseNames();

	// en-US
	let languages_list = [displayNames[0]];
	let languages_list_data = [baseNames[0]];

	// current locale
	let currentLocaleDict = Engine.GetFallbackToAvailableDictLocale(Engine.GetCurrentLocale());
	if (currentLocaleDict != languages_list_data[0])
	{
		languages_list.push(displayNames[baseNames.indexOf(currentLocaleDict)]);
		languages_list_data.push(currentLocaleDict);
	}

	let language = Engine.GetGUIObjectByName("language");
	language.list = languages_list;
	language.list_data = languages_list;
	language.selected = language.list.length - 1;
}

function selectLanguage()
{
	let useTranslation = Engine.GetGUIObjectByName("language").selected == 1;

	Engine.GetGUIObjectByName("mainText").caption =
		sprintf(
			Engine.GetGUIObjectByName("language").selected == 1 ?
				Engine.TranslateLines(Engine.ReadFile(g_TermsFile)) :
				Engine.ReadFile(g_TermsFile),
			g_TermsSprintf);

	Engine.GetGUIObjectByName("connectButton").onPress = () => {

		if (useTranslation)
			messageBox(
					400, 200,
					translate("The translation may contain translation errors. TODO: Wildfire Games shall suffer no damage, but you who accepts a potentially broken translation if it comes to that... Still accept the translation?"),
					translate("Confirmation"),
					[translate("No"), translate("Yes")],
					[
						undefined,
						() => {
							closeTerms(true);
						}
					]);
		else
			closeTerms(true);
	};
}

function closeTerms(accepted)
{
	Engine.PopGuiPageCB({
		"page": g_TermsPage,
		"accepted": accepted
	});
}
