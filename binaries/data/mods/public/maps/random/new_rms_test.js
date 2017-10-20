RMS.LoadLibrary("rmgen");
RMS.LoadLibrary("common");

InitMap();

placeDefaultPlayerBases({
	"playerPlacement": placePlayersRadial(0.39)
});

ExportMap();
