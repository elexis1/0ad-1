var g_TermsPage = "";
var g_TermsFile = "";

function init(data)
{
	g_TermsPage = data.page;
	g_TermsFile = data.file;

	Engine.GetGUIObjectByName("title").caption = data.title;

	initLanguageDropdown();
}

function initLanguageDropdown()
{
	let displayNames = Engine.GetSupportedLocaleDisplayNames();
	let baseNames = Engine.GetSupportedLocaleBaseNames();

	let languages = [
		// en-US
		{
			"title": displayNames[0],
			"localeDict": baseNames[0]
		}
	];

	let currentLocaleDict = Engine.GetFallbackToAvailableDictLocale(Engine.GetCurrentLocale());
	if (currentLocaleDict != languages[0].localeDict)
		languages.push({
			"title": displayNames[baseNames.indexOf(currentLocaleDict)] || "error",
			"localeDict": currentLocaleDict
		});

	let language = Engine.GetGUIObjectByName("language");
	languages = prepareForDropdown(languages);
	language.list = languages.title;
	language.list_data = languages.localeDict;
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
