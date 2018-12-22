function NetworkDialogManager()
{
	this.guiPage = undefined;
}

NetworkDialogManager.prototype.open = function()
{
	this.guiPage = Engine.PushGuiPage("page_networkreport.xml", {
		"gameAttributes": g_GameAttributes,
		"playerAssignments": g_PlayerAssignments,
		"callback": "closePageHack"
	});
};

function closePageHack()
{
	if (typeof g_NetworkDialogManager != "undefined")
		g_NetworkDialogManager = undefined;
}

NetworkDialogManager.prototype.refresh = function()
{
	if (this.guiPage)
		this.guiPage.updatePage({
			"gameAttributes": g_GameAttributes,
			"playerAssignments": g_PlayerAssignments,
		});
};
