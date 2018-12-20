function NetworkDialogManager()
{
	this.guiPage = undefined;
}

NetworkDialogManager.prototype.open = function()
{
	this.guiPage = Engine.PushGuiPage("page_networkreport.xml", {
		"gameAttributes": g_GameAttributes,
		"playerAssignments": g_PlayerAssignments
	});
};

NetworkDialogManager.prototype.refresh = function()
{
	if (this.guiPage)
		try
		{
			this.guiPage.updatePage({
				"gameAttributes": g_GameAttributes,
				"playerAssignments": g_PlayerAssignments,
			});
		} catch (e)
		{
		}
};
