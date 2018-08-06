var g_TermsName = "";

function init(data)
{
	g_TermsName = data.terms;
	Engine.GetGUIObjectByName("mainText").caption = Engine.TranslateLines(Engine.ReadFile("gui/" + data.page + ".txt"));
	if (data.title)
		Engine.GetGUIObjectByName("title").caption = data.title;
}

function closeTerms(accept)
{
	Engine.PopGuiPageCB({ "terms": g_TermsName, "accept": accept });
}
