function NetworkDialogManager()
{
	this.isOpened = false;
}

NetworkDialogManager.prototype.open = function()
{
	this.isOpened = true;
	Engine.PushGuiPage("page_networkreport.xml", {
		"isController": g_IsController,
		"gameAttributes": g_GameAttributes,
		"playerAssignments": g_PlayerAssignments,
		"callback": "networkDialogClosed"
	});
};

function /*NetworkDialogManager.prototype.*/networkDialogClosed()
{
	g_NetworkDialogManager.isOpened = false;
}

NetworkDialogManager.prototype.refresh = function()
{
	if (this.isOpened)
	{
		Engine.PopGuiPage();
		this.open();
	}
};
