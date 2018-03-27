var g_ModsAvailableOnline = [];

/**
 * Indicates if we have encountered an error in one of the network-interaction attempts.
 *
 * We use a global so we don't get multiple messageBoxes appearing (one for each "tick").
 *
 * Set to `true` by showErrorMessageBox()
 * Set to `false` by init(), updateModList(), downloadFile(), and cancelRequest()
 */
var g_Failure;

function init()
{
	progressDialog(
		translate("Initializing mod.io interface."),
		translate("Initializing"), false,
		translate("Cancel"), () => closePage()
	);

	g_Failure = false;
	Engine.ModIoStartGetGameId();
}

function filesizeToString(filesize)
{
	let suffixes = ["B", "KiB", "MiB", "GiB"]; // Bigger values are currently unlikely to occur here...
	let i = 0;
	while (i < suffixes.length - 1)
	{
		if (filesize < 1024)
			break;
		filesize /= 1024;
		++i;
	}

	return {
		"filesize": filesize.toFixed(i == 0 ? 0 : 1),
		"suffix": suffixes[i]
	};
}

function generateModsList(mods)
{
	let [keys, names, name_ids, versions, filesizes, dependencies] = [[], [], [], [], [], []];

	let i = 0;
	for (let mod of mods)
	{
		keys.push(i++);
		names.push(mod.name);
		name_ids.push(mod.name_id);
		versions.push(mod.version);
		// Translation: File size with suffix (ie. 123.4 KiB)
		filesizes.push(sprintf(translate("%(filesize)s %(suffix)s"), filesizeToString(mod.filesize)));
		dependencies.push((mod.dependencies || []).join(" "));
	}

	let obj = Engine.GetGUIObjectByName("modsAvailableList");
	obj.list_name = names;
	obj.list_modVersion = versions;
	obj.list_modname_id = name_ids;
	obj.list_modfilesize = filesizes;
	obj.list_dependencies = dependencies;

	obj.list = keys;
}

function showModDescription()
{
	Engine.GetGUIObjectByName("downloadButton").enabled = true;
	let listObject = Engine.GetGUIObjectByName("modsAvailableList");
	if (listObject.selected != -1)
		Engine.GetGUIObjectByName("modDescription").caption = g_ModsAvailableOnline[listObject.selected].summary;
}

function updateModList()
{
	g_ModsAvailableOnline = [];

	Engine.GetGUIObjectByName("refreshButton").enabled = false;

	progressDialog(
		translate("Fetching and updating list of available mods."),
		translate("Updating"), false,
		translate("Cancel Update"), () => cancelRequest()
	);

	g_Failure = false;
	Engine.ModIoStartListMods();
}

function downloadMod()
{
	let listObject = Engine.GetGUIObjectByName("modsAvailableList");
	if (listObject.selected == -1)
	{
		warn("Select something first.");
		return;
	}

	progressDialog(
		sprintf(translate("Downloading “%(modname)s”"), {
			"modname": g_ModsAvailableOnline[listObject.selected].name
		}),
		translate("Downloading"), true,
		translate("Cancel Download"), () => cancelRequest()
	);
	Engine.GetGUIObjectByName("downloadButton").enabled = false;

	g_Failure = false;
	Engine.ModIoStartDownloadMod(+listObject.list[listObject.selected]);
}

function cancelRequest()
{
	g_Failure = false;
	Engine.ModIoCancelRequest();
	hideDialog();
}

function onTick()
{
	let progressData = Engine.ModIoGetDownloadProgress();

	switch (progressData.status)
	{

	/**
	 * Finished status indicators
	 */
	case "ready": // GameID acquired, ready to fetch mod list
		updateModList();
		return;

	case "listed": // List of available mods acquired
		if (!g_ModsAvailableOnline.length) // Only run this once (for each update).
		{
			hideDialog();
			Engine.GetGUIObjectByName("refreshButton").enabled = true;
			g_ModsAvailableOnline = Engine.ModIoGetMods();
			generateModsList(g_ModsAvailableOnline);
		}
		return;

	case "success": // Successfully acquired a mod file
		hideDialog();
		Engine.GetGUIObjectByName("downloadButton").enabled = true;
		return;

	/**
	 * In-progress status indicators.
	 */
	case "gameid": // Acquiring GameID from mod.io
	case "listing": // Acquiring list of available mods from mod.io
		break;

	case "downloading": // Downloading a mod file
	{
		let progressPercent = Math.ceil(progressData.progress * 100);
		Engine.GetGUIObjectByName("downloadDialog_progressBar").caption = progressPercent;

		let listObject = Engine.GetGUIObjectByName("modsAvailableList");
		let fileSize = g_ModsAvailableOnline[+listObject.list[listObject.selected]].filesize;
		let currentSize = filesizeToString(progressData.progress * fileSize);
		fileSize = filesizeToString(fileSize);

		// Translation: Mod file download indicator. Current download size over expected final size, with percentage complete.
		Engine.GetGUIObjectByName("downloadDialog_progressText").caption = sprintf(translate("%(current)s / %(total)s (%(percent)s%%)"), {
			// Translation: File size with suffix (ie. 123.4 KiB)
			"current": currentSize.suffix == fileSize.suffix ? currentSize.filesize : sprintf(translate("%(filesize)s %(suffix)s"), currentSize),
			// Translation: File size with suffix (ie. 123.4 KiB)
			"total": sprintf(translate("%(filesize)s %(suffix)s"), fileSize),
			"percent": progressPercent
		});
		break;
	}

	/**
	 * Error/Failure status indicators.
	 */
	case "failed_gameid": // Game ID couldn't be retrieved
		if (!g_Failure)
			showErrorMessageBox(
				sprintf(translateWithContext("mod.io error message", "Game ID could not be retrieved.\n\n%(technicalDetails)s"), {
					"technicalDetails": progressData.error || "-"
				}),
				translateWithContext("mod.io error message", "Initialization Error"),
				[translate("Abort"), translate("Retry")],
				[() => closePage(), () => init()]
			);
		return;

	case "failed_listing": // Mod list couldn't be retrieved
		if (!g_Failure)
			showErrorMessageBox(
				sprintf(translateWithContext("mod.io error message", "Mod List could not be retrieved.\n\n%(technicalDetails)s"), {
					"technicalDetails": progressData.error || "-"
				}),
				translateWithContext("mod.io error message", "Fetch Error"),
				[translate("Abort"), translate("Retry")],
				[() => cancelRequest(), () => updateModList()]
			);
		return;

	case "failed_downloading": // File couldn't be retrieved
		if (!g_Failure)
			showErrorMessageBox(
				sprintf(translateWithContext("mod.io error message", "File download failed.\n\n%(technicalDetails)s"), {
					"technicalDetails": progressData.error || "-"
				}),
				translateWithContext("mod.io error message", "Download Error"),
				[translate("Abort"), translate("Retry")],
				[() => cancelRequest(), () => downloadMod()]
			);
		return;

	case "failed_filecheck": // The file is corrupted
		if (!g_Failure)
			showErrorMessageBox(
				sprintf(translateWithContext("mod.io error message", "File verification error.\n\n%(technicalDetails)s"), {
					"technicalDetails": progressData.error || "-"
				}),
				translateWithContext("mod.io error message", "Verification Error"),
				[translate("Abort")],
				[() => cancelRequest()]
			);
		return;

	/**
	 * Defaults
	 */
	case "none": // Nothing has happened yet.
		break;

	default:
		warn("Unrecognised progress status: " + progressData.status);

	}

	Engine.ModIoAdvanceRequest();
}

function closePage()
{
	Engine.PopGuiPage();
}

function showErrorMessageBox(caption, title, buttonCaptions, buttonActions)
{
	messageBox(400, 160, caption, title, buttonCaptions, buttonActions);
	g_Failure = true;
}

function progressDialog(dialogCaption, dialogTitle, showProgressBar, buttonCaption, buttonAction)
{
	Engine.GetGUIObjectByName("downloadDialog_title").caption = dialogTitle;

	let downloadDialog_caption = Engine.GetGUIObjectByName("downloadDialog_caption");
	downloadDialog_caption.caption = dialogCaption;
	let size = downloadDialog_caption.size;
	size.rbottom = showProgressBar ? 50 : 75;
	downloadDialog_caption.size = size;

	Engine.GetGUIObjectByName("downloadDialog_progress").hidden = !showProgressBar;

	let downloadDialog_button = Engine.GetGUIObjectByName("downloadDialog_button");
	downloadDialog_button.caption = buttonCaption;
	downloadDialog_button.onPress = buttonAction;

	Engine.GetGUIObjectByName("downloadDialog").hidden = false;
}

function hideDialog()
{
	Engine.GetGUIObjectByName("downloadDialog").hidden = true;
}
