function ResourceDropsite() {}

ResourceDropsite.prototype.ResourceChoiceSchema = Resources.BuildChoicesSchema();

ResourceDropsite.prototype.Schema =
	"<element name='Types'>" +
		"<list>" +
			"<zeroOrMore>" +
				ResourceDropsite.prototype.ResourceChoiceSchema +
			"</zeroOrMore>" +
		"</list>" +
	"</element>" +
	"<element name='Sharable' a:help='Allows allies to use this entity.'>" +
		"<data type='boolean'/>" +
	"</element>";

ResourceDropsite.prototype.Init = function()
{
	this.sharable = this.template.Sharable == "true";
	this.shared = this.sharable;
};

/**
 * Returns the list of resource types accepted by this dropsite,
 * as defined by it being referred to in the template and the resource being enabled.
 */
ResourceDropsite.prototype.GetTypes = function()
{
	let typesTok = ApplyValueModificationsToEntity("ResourceDropsite/Types", this.template.Types, this.entity);
	let typesArr = [];
	let resources = Resources.GetCodes();

	for (let type of typesTok.split(/\s+/))
		if (resources.indexOf(type.toLowerCase()) > -1)
			typesArr.push(type);

	return typesArr;
};

/**
 * Returns whether this dropsite accepts the given generic type of resource.
 */
ResourceDropsite.prototype.AcceptsType = function(type)
{
	return this.GetTypes().indexOf(type) != -1;
};

ResourceDropsite.prototype.IsSharable = function()
{
	return this.sharable;
};

ResourceDropsite.prototype.IsShared = function()
{
	return this.shared;
};

ResourceDropsite.prototype.SetSharing = function(value)
{
	if (!this.sharable)
		return;
	this.shared = value;
	Engine.PostMessage(this.entity, MT_DropsiteSharingChanged, { "shared": this.shared });
};

Engine.RegisterComponentType(IID_ResourceDropsite, "ResourceDropsite", ResourceDropsite);
