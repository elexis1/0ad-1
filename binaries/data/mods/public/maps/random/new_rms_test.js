Engine.LoadLibrary("rmgen");

var g_Map = new RandomMap(0, "grass1_spring");

g_Map.ImportTerrainFile("maps/skirmishes/Acropolis Bay (2).pmp");

placePlayerBases({
	"PlayerPlacement": playerPlacementCircle(fractionToTiles(0.39))
});

placePlayersNomad(g_Map.createTileClass());

g_Map.ExportMap();
