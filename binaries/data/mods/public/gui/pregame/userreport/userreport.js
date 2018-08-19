var g_UserReportStatusFormat = {
	"disabled": data => translate("disabled"),
	"proxy": data => translate("connecting to server"),
	"waiting": data => translate("connecting to server"),
	"connecting": data => translate("connecting to server"),
	"sending": data => sprintf(translate("uploading (%f%%)"), Math.floor(100 * data[1])),
	"completed": data =>
		data[1] == 200 ?
			translate("upload succeeded") :
			sprintf(translate("upload failed (%(errorCode)s)"), {
				"errorCode": data[2]
			}),
	"failed": data => sprintf(translate("upload failed (%(errorMessage)s)"), {
		"errorMessage": data[1]
	})
};

function initUserReport()
{
	initTerms({
		"TermsAndConditions": {
			"title": translate("Terms"),
			"instruction": translate("Please read and accept the UserReporter Terms and Conditions"),
			"file": "pregame/userreport/Terms_and_Conditions",
			"config": "userreport.terms",
			"callback": data => {
				setUserReportEnabled(data.accepted);
				updateUserReportTermsFeedback();
			},
			"urlButtons": [
				{
					"caption": translate("Logfiles"),
					"url": "https://trac.wildfiregames.com/wiki/GameDataPaths"
				},
				{
					"caption": translate("Publications"),
					"url": Engine.ConfigDB_GetValue("user", "userreport.url_publication")
				}
			],
			"accepted": false
		}
	});

	loadTermsAcceptance();
	setUserReportEnabled(!checkTerms() && Engine.IsUserReportEnabled());
	updateUserReportTermsFeedback();
}

function updateUserReportTermsFeedback()
{
	let feedbackText = checkTerms();
	let userReportEnableButton = Engine.GetGUIObjectByName("userReportEnableButton")
	userReportEnableButton.enabled = !feedbackText;
	userReportEnableButton.tooltip = feedbackText;
}

function toggleUserReport()
{
	setUserReportEnabled(!Engine.IsUserReportEnabled());
}

function setUserReportEnabled(enabled)
{
	Engine.GetGUIObjectByName("userReportEnableButton").caption =
		enabled ? translate("Disable Feedback") : translate("Enable Feedback");

	Engine.SetUserReportEnabled(enabled);
}

function updateUserReporterStatus()
{
	let statusData = Engine.GetUserReportStatus().split(/:/, 3);

	Engine.GetGUIObjectByName("userReportText").caption =
		Engine.IsUserReportEnabled() ?
			'[font="sans-bold-16"]' + translate("Thank you for helping improve 0 A.D.!") + "[/font]\n\n" +
			translate("Feedback is currently enabled.") + "\n" +
			sprintf(translate("Status: %(status)s."), {
				"status": g_UserReportStatusFormat[statusData[0]] ? g_UserReportStatusFormat[statusData[0]](statusData) : translate("unknown")
			}) :
			'[font="sans-bold-16"]' + translate("Help improve 0 A.D.!") + "[/font]\n\n" +
			translate("You can automatically send us feedback that can help us fix bugs, and improve performance and compatibility.");
}
