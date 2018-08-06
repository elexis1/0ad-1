var g_Terms = {};

function initTerms(terms)
{
	g_Terms = terms;
}

function openTerms(terms)
{
	Engine.PushGuiPage("page_terms.xml", {
		"page": g_Terms[terms].file,
		"title": g_Terms[terms].title,
		"terms": terms,
		"callback": "acceptTerms"
	});
}

function acceptTerms(data)
{
	g_Terms[data.terms].accept = data.accept;
	saveSettingAndWriteToUserConfig(g_Terms[data.terms].config, data.accept ? getTermsHash(data.terms) : "0");
	updateTermsFeedback(data);

	if (g_Terms[data.terms].callback)
		g_Terms[data.terms].callback(data);
}

function checkTerms()
{
	for (let page in g_Terms)
		if (!g_Terms[page].accept)
			return g_Terms[page].instruction;

	return "";
}

function getTermsHash(page)
{
	return Engine.CalculateMD5(
		(g_Terms[page].hashPrefixObject ? Engine.GetGUIObjectByName(g_Terms[page].hashPrefixObject).caption : "") +
		Engine.ReadFile("gui/" + g_Terms[page].file + ".txt"));
}

function loadTermsAcceptance()
{
	for (let page in g_Terms)
		g_Terms[page].accept = Engine.ConfigDB_GetValue("user", g_Terms[page].config) == getTermsHash(page);
}
var g_Terms = {};

function initTerms(terms)
{
	g_Terms = terms;
}

function openTerms(terms)
{
	Engine.PushGuiPage("page_terms.xml", {
		"page": g_Terms[terms].file,
		"title": g_Terms[terms].title,
		"terms": terms,
		"callback": "acceptTerms"
	});
}

function acceptTerms(data)
{
	g_Terms[data.terms].accept = data.accept;
	saveSettingAndWriteToUserConfig(g_Terms[data.terms].config, data.accept ? getTermsHash(data.terms) : "0");
	updateTermsFeedback(data);

	if (g_Terms[data.terms].callback)
		g_Terms[data.terms].callback(data);
}

function checkTerms()
{
	for (let page in g_Terms)
		if (!g_Terms[page].accept)
			return g_Terms[page].instruction;

	return "";
}

function getTermsHash(page)
{
	return Engine.CalculateMD5(
		(g_Terms[page].hashPrefixObject ? Engine.GetGUIObjectByName(g_Terms[page].hashPrefixObject).caption : "") +
		Engine.ReadFile("gui/" + g_Terms[page].file + ".txt"));
}

function loadTermsAcceptance()
{
	for (let page in g_Terms)
		g_Terms[page].accept = Engine.ConfigDB_GetValue("user", g_Terms[page].config) == getTermsHash(page);
}
