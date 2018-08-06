function initUserReport()
{
	g_Terms = {
		"Privacy": {
			"title": translate("Privacy Policy"),
			"instruction": translate("Please read and accept the Privacy Policy"),
			"file": "pregame/userreport/Privacy_Policy",
			"config": "userreport.privacy_policy",
			"callback": (data) => {
				enableUserReport(data.accepted);
				updateTermsFeedback();
			},
			"accepted": false
		}
	};

	loadTermsAcceptance();
	enableUserReport(!checkTerms() && Engine.IsUserReportEnabled());
	updateTermsFeedback();
}

function formatUserReportStatus(status)
{
	let d = status.split(/:/, 3);

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

function enableUserReport(enabled)
{
	Engine.GetGUIObjectByName("userReportDisableButton").hidden = !enabled;
	Engine.GetGUIObjectByName("userReportEnableButton").hidden = enabled;
	Engine.SetUserReportEnabled(enabled);
}

function updateTermsFeedback()
{
	let feedbackText = checkTerms();
	let userReportEnableButton = Engine.GetGUIObjectByName("userReportEnableButton")
	userReportEnableButton.enabled = !feedbackText;
	userReportEnableButton.tooltip = feedbackText;
}
