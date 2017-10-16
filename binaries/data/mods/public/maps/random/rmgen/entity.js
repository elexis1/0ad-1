/**
 * Store entity specification.
 *
 * @param orientation - rotation of this entity about the y-axis (up).
 */
// TODO: support full position and rotation
function Entity(templateName, player, x, z, orientation = 0)
{
	this.id = g_Map.getEntityID();
	this.templateName = templateName;
	this.player = player;

	this.position = {
		"x": x * CELL_SIZE,
		"y": 0,
		"z": z * CELL_SIZE
	};

	this.rotation = {
		"x": 0,
		"y": orientation,
		"z": 0
	};
}
