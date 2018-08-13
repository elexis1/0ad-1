var g_TermsButtonHeight = 40;

function initLobbyTerms()
{
	let terms = {
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
		},
		"Privacy": {
			"title": translate("Privacy Policy"),
			"instruction": translate("Please read and accept the Privacy Policy."),
			"file": "prelobby/common/terms/Privacy_Policy",
			"config": "lobby.privacy_policy",
			"accepted": false,
			"callback": updateFeedback
		}
	};

	Object.keys(terms).forEach((page, i) => {

		let button = Engine.GetGUIObjectByName("termsButton[" + i + "]");

		button.caption = terms[page].title;

		button.onPress = () => {
			openTerms(page);
		};

		let size = button.size;
		size.top = i * g_TermsButtonHeight;
		size.bottom = i * g_TermsButtonHeight + 28;
		button.size = size;
	});

	initTerms(terms);
}
