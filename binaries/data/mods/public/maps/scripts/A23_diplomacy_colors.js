g_Commands.startCinemaPath = function()
{
	// Look at the tree in the center
	//let lookAtPosition = Engine.QueryInterface(1907, IID_Position).GetPosition()
	let lookAtPosition = Vector2D.average(TriggerHelper.GetAllPlayersEntities().filter(TriggerHelper.IsInWorld).map(TriggerHelper.GetEntityPosition2D));
	lookAtPosition = new Vector3D(lookAtPosition.x, 0, lookAtPosition.y);

	let pathName = "path1";
	let points = 12;
	let duration = 12;

	// turn 0 = 16.22
	// turn X = 20.16;
	// (20.16 - 16.22) * 5 = 234 * 5 = turn 1170

	let startAngle = 0;

	let cmpCinemaManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_CinemaManager);
	cmpCinemaManager.AddPath({
		"name": pathName,
		"orientation": "target",
		"positionNodes": new Array(points).fill(0).map((zero, i) =>
			({
				"deltaTime": duration * i / points,
				"position": Vector3D.sum([
					lookAtPosition,
					new Vector3D(0, 120, 0),
					new Vector3D(140, 0, 0).rotateY(startAngle + i / points * 2 * Math.PI)
				])
			})
		),
		"targetNodes": [
			{
				"deltaTime": 0,
				"position": lookAtPosition
			}
		]
	});
	cmpCinemaManager.AddCinemaPathToQueue(pathName);
	cmpCinemaManager.Play();
};
