var g_ModsAvailableOnline = [];

function init()
{
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

	return filesize.toFixed(i == 0 ? 0 : 1) + suffixes[i];
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
		filesizes.push(filesizeToString(mod.filesize));
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
	let listObject = Engine.GetGUIObjectByName("modsAvailableList");
	if (listObject.selected != -1)
		Engine.GetGUIObjectByName("modDescription").caption = g_ModsAvailableOnline[listObject.selected].summary;
}

function downloadMod()
{
	let listObject = Engine.GetGUIObjectByName("modsAvailableList");
	if (listObject.selected == -1)
	{
		warn("Select something first.");
		return;
	}

	Engine.ModIoStartDownloadMod(+listObject.list[listObject.selected]);
}

function onTick()
{
	let progressData = Engine.ModIoGetDownloadProgress();
	warn(uneval(progressData));

	if (progressData.status == "ready")
		Engine.ModIoStartListMods();
	else if (progressData.status == "listed")
	{
		g_ModsAvailableOnline = Engine.ModIoGetMods();
		generateModsList(g_ModsAvailableOnline);
	}

	if (!Engine.ModIoAdvanceRequest())
		warn("still downloading stuff");
}

function closePage()
{
	Engine.PopGuiPage();
}
