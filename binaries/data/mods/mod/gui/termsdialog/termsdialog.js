var g_TermsPage = "";

function init(data)
{
	g_TermsPage = data.page;

	Engine.GetGUIObjectByName("title").caption = data.title;

	Engine.GetGUIObjectByName("mainText").caption =
		Engine.FileExists(data.file) ?
		Engine.TranslateLines(Engine.ReadFile(data.file)) :
		data.file;

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

function closeTerms(accepted)
{
	Engine.PopGuiPageCB({
		"page": g_TermsPage,
		"accepted": accepted
	});
}
