var g_TermsPage = "";

function init(data)
{
	g_TermsPage = data.page;

	Engine.GetGUIObjectByName("title").caption = data.title;
	Engine.GetGUIObjectByName("mainText").caption = Engine.TranslateLines(Engine.ReadFile("gui/" + data.file + ".txt"));
}

function closeTerms(accepted)
{
	Engine.PopGuiPageCB({
		"page": g_TermsPage,
		"accepted": accepted
	});
}
