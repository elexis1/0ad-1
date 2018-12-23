var g_NetworkDialog;

// TODO: page_foo.xml instead of hardcoded global function names, it would be nicer to hardcode one JSClass/prototype name 
function init(data, hotloadData)
{
	g_NetworkDialog = new NetworkDialog(
		hotloadData ? hotloadData.gameAttributes : data.gameAttributes,
		hotloadData ? hotloadData.playerAssignments : data.playerAssignments);
}

function getHotloadData()
{
	return g_NetworkDialog.GetHotloadData();
}

function updatePage(data)
{
	g_NetworkDialog.UpdateGameData(data);
}
