function modifyTilesBasedOnHeight(minHeight, maxHeight, mode, func)
{
	for (let qx = 0; qx < g_Map.size; ++qx)
		for (let qz = 0; qz < g_Map.size; ++qz)
		{
			let height = g_Map.getHeight(qx, qz);
			if (mode == 0 && height >  minHeight && height < maxHeight ||
			    mode == 1 && height >= minHeight && height < maxHeight ||
			    mode == 2 && height >  minHeight && height <= maxHeight ||
			    mode == 3 && height >= minHeight && height <= maxHeight)
			func(qx, qz);
		}
}

function paintTerrainBasedOnHeight(minHeight, maxHeight, mode, terrain)
{
	modifyTilesBasedOnHeight(minHeight, maxHeight, mode, (qx, qz) => {
		placeTerrain(qx, qz, terrain);
	});
}

function paintTileClassBasedOnHeight(minHeight, maxHeight, mode, tileclass)
{
	modifyTilesBasedOnHeight(minHeight, maxHeight, mode, (qx, qz) => {
		addToClass(qx, qz, tileclass);
	});
}

function unPaintTileClassBasedOnHeight(minHeight, maxHeight, mode, tileclass)
{
	modifyTilesBasedOnHeight(minHeight, maxHeight, mode, (qx, qz) => {
		removeFromClass(qx, qz, tileclass);
	});
}
