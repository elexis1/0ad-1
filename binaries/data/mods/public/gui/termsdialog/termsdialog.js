var g_TermsPage = "";

function init(data)
{
	g_TermsPage = data.page;

	Engine.GetGUIObjectByName("title").caption = data.title;

	let language = Engine.GetGUIObjectByName("language");
	language.list = Engine.GetSupportedLocaleDisplayNames();
	language.list_data = Engine.GetSupportedLocaleDisplayNames();

	selectLanguage(data.file);
}

function selectLanguage(file)
{
	Engine.GetGUIObjectByName("mainText").caption = Engine.TranslateLines(Engine.ReadFile("gui/" + file + ".txt"));
}

function closeTerms(accepted)
{
	Engine.PopGuiPageCB({
		"page": g_TermsPage,
		"accepted": accepted
	});
}
