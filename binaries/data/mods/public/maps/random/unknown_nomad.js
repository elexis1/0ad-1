RMS.LoadLibrary("rmgen");
RMS.LoadLibrary("common");
RMS.LoadLibrary("rmbiome");
RMS.LoadLibrary("unknown");

var playerBases = false;
var allowNaval = true;
createUnknownMap();

[playerIDs, playerX, playerZ] = placePlayersNomad((ix, iz) => g_Map.getHeight(ix, iz) >= 3 && g_Map.getHeight(ix, iz) <= 3.12);
placeCivDefaultStartingEntitiesNomad(playerIDs, playerX, playerZ, true);
markUnknownPlayerTerritory(false);
createUnknownObjects();

ExportMap();
