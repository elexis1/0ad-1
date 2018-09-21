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
	let buttonWidth = 100 + buttonsData.reduce((maxWidth, buttonData, i) =>
		Math.max(maxWidth, Engine.GetTextWidth(Engine.GetGUIObjectByName("button[" + i + "]").font, buttonData.caption)),
		0);

	buttonsData.forEach((buttonData, i) => {

		let button = Engine.GetGUIObjectByName("button[" + i + "]");
		button.caption = buttonData.caption;

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
		size.right = buttonWidth;
		button.size = size;
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
		Engine.GetGUIObjectByName("language").selected == 1 ?
			Engine.TranslateLines(Engine.ReadFile(g_TermsFile)) :
			Engine.ReadFile(g_TermsFile);

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
