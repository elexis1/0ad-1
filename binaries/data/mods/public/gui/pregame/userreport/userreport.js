function initUserReport()
{
	initTerms({
		"Disclaimer": {
			"title": translate("Disclaimer"),
			"instruction": translate("Please read and accept the Disclaimer"),
			"file": "pregame/userreport/Disclaimer",
			"config": "userreport.disclaimer",
			"callback": (data) => {
				setUserReportEnabled(data.accepted);
				updateUserReportTermsFeedback();
			},
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
	Engine.GetGUIObjectByName("userReportText").caption =
		Engine.IsUserReportEnabled() ?
			'[font="sans-bold-16"]' + translate("Thank you for helping improve 0 A.D.!") + "[/font]\n\n" +
			translate("Feedback is currently enabled.") + "\n" +
			sprintf(translate("Status: %(status)s."), {
				"status": formatUserReportStatus()
			}) :
			'[font="sans-bold-16"]' + translate("Help improve 0 A.D.!") + "[/font]\n\n" +
			translate("You can automatically send us feedback that can help us fix bugs, and improve performance and compatibility.");
}

function formatUserReportStatus()
{
	let d = Engine.GetUserReportStatus().split(/:/, 3);

	if (d[0] == "disabled")
		return translate("disabled");

	if (d[0] == "connecting")
		return translate("connecting to server");

	if (d[0] == "sending")
		return sprintf(translate("uploading (%f%%)"), Math.floor(100 * d[1]));

	if (d[0] == "completed")
	{
		let httpCode = d[1];
		if (httpCode == 200)
			return translate("upload succeeded");

		return sprintf(translate("upload failed (%(errorCode)s)"), { "errorCode": httpCode });
	}

	if (d[0] == "failed")
		return sprintf(translate("upload failed (%(errorMessage)s)"), { "errorMessage": d[2] });

	return translate("unknown");
}
