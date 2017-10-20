RMS.LoadLibrary("rmgen");
RMS.LoadLibrary("common");
RMS.LoadLibrary("rmbiome");
RMS.LoadLibrary("unknown");

var playerBases = true;
var allowNaval = false;

createUnknownMap();
createUnknownObjects();

ExportMap();
