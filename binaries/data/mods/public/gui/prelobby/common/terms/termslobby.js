function initLobbyTerms()
{
	initTerms({
		"Service": {
			"title": translate("Terms of Service"),
			"instruction": translate("Please read and accept the Terms of Service."),
			"file": "prelobby/common/terms/Terms_of_Service",
			"config": "lobby.terms_of_service",
			"salt": () => Engine.GetGUIObjectByName("username").caption,
			"accepted": false,
			"callback": updateFeedback
		},
		"Use": {
			"title": translate("Terms of Use"),
			"instruction": translate("Please read and accept the Terms of Use."),
			"file": "prelobby/common/terms/Terms_of_Use",
			"config": "lobby.terms_of_use",
			"salt": () => Engine.GetGUIObjectByName("username").caption,
			"accepted": false,
			"callback": updateFeedback
		}
	});
}
