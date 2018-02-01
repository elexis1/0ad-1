Engine.LoadLibrary("rmgen");

var g_Map = new RandomMap(0, "grass1_spring");

var terrainfile = g_Map.ReadTerrainFile("maps/skirmishes/Acropolis Bay (2).pmp");

warn(terrainfile.size)
warn(uneval(terrainfile.tileData[0]))

placePlayerBases({
	"PlayerPlacement": playerPlacementCircle(fractionToTiles(0.39))
});

placePlayersNomad(g_Map.createTileClass());

g_Map.ExportMap();
