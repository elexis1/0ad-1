function downloadModsButton()
{
	initTerms({
		"Disclaimer": {
			"title": translate("Disclaimer"),
			"file": "gui/modio/Disclaimer.txt",
			"config": "modio.disclaimer",
			"accepted": false,
			"callback": openModIo,
			"buttons": [
				{
					"caption": translate("Show mod.io Terms"),
					"url": "https://mod.io/terms"
				},
				{
					"caption": translate("Show mod.io Privacy Policy"),
					"url": "https://mod.io/privacy"
				},
				{
					"caption": translate("Show mod.io DMCA"),
					"url": "https://mod.io/report"
				}
			]
		}
	});

	openTerms("Disclaimer");
}

function openModIo(data)
{
	if (data.accepted)
		Engine.PushGuiPage("page_modio.xml", {
			"callback": "initMods"
		});
}
