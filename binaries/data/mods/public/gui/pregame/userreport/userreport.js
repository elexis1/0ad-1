var g_TermsUserReport = {
	"TermsAndConditions": {
		"file": "gui/userreport/Terms_and_Conditions.txt",
		"title": translate("Terms"),
		"instruction": translate("Please read and accept the UserReporter Terms and Conditions"),
		"config": "userreport.terms",
		"callback": data => {
			setUserReportEnabled(data.accepted);
		},
		"buttons": [
			{
				"caption": translate("Show Logfiles"),
				"messageBox": {
					"caption": translate("Logfiles"),
					"subject": sprintf(translate("You can find the most recent UserReport data at:\n%(logPath)s"), {
						"logPath": Engine.GetUserReportLogPath()
					}),
					"selectable": true
				}
			},
			{
				"caption": translate("Show UserReporterID"),
				"messageBox": {
					"caption": translate("UserReporterID"),
					"subject": sprintf(translate("You can find your UserReporterID in the config file at:\n%(configPath)s"), {
						"configPath": Engine.GetUserReportConfigPath()
					}),
					"selectable": true
				}
			},
			{
				"caption": translate("Show Publications"),
				"url": Engine.ConfigDB_GetValue("user", "userreport.url_publication")
			}
		],
		"accepted": false
	}
};

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
				"errorCode": data[1]
			}),
	"failed": data => sprintf(translate("upload failed (%(errorMessage)s)"), {
		"errorMessage": uneval(data[2])
	})
};

function initUserReport()
{
	initTerms(g_TermsUserReport);
	loadTermsAcceptance();

	setUserReportEnabled(!checkTerms() && Engine.IsUserReportEnabled());
}

function setUserReportEnabled(enabled)
{
	Engine.SetUserReportEnabled(enabled);
	updateUserReportButtons();
}

function updateUserReportButtons()
{
	let termsFeedback = checkTerms();

	let userReportEnableButton = Engine.GetGUIObjectByName("userReportEnableButton");
	userReportEnableButton.caption = Engine.IsUserReportEnabled() ? translate("Disable Feedback") : translate("Enable Feedback");
	userReportEnableButton.enabled = !termsFeedback;
	userReportEnableButton.tooltip = termsFeedback;
	userReportEnableButton.onPress = () => {
		setUserReportEnabled(!Engine.IsUserReportEnabled());
	};

	let userReportTermsButton = Engine.GetGUIObjectByName("userReportTermsButton");
	userReportTermsButton.caption = translate("Terms");
	userReportTermsButton.onPress = () => {
		openTerms("TermsAndConditions");
	};
}

function updateUserReportStatus()
{
	let statusData = Engine.GetUserReportStatus().split(/:/, 3);

	Engine.GetGUIObjectByName("userReportText").caption =
		Engine.IsUserReportEnabled() ?
			setStringTags(translate("Thank you for helping improve 0 A.D.!"), { "font": "sans-bold-16" }) + "\n\n" +
			translate("Feedback is currently enabled.") + "\n" +
			sprintf(translate("Status: %(status)s."), {
				"status": g_UserReportStatusFormat[statusData[0]] ? g_UserReportStatusFormat[statusData[0]](statusData) : translate("unknown")
			}) :
			setStringTags(translate("Help improve 0 A.D.!"), { "font": "sans-bold-16" }) + "\n\n" +
			translate("You can automatically send us feedback that can help us fix bugs, and improve performance and compatibility.");
}
