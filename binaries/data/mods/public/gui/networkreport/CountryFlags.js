function CountryFlags(width = 16, height = 16, replaceExisting = true)
{
	let directory = "global/icon/flags/";

	for (let countryID of listFiles("art/textures/ui/" + directory, ".png", false))
		Engine.AddIcon(
			this.GetIconName(countryID),
			"stretched:" + directory + countryID + ".png",
			width + " " + height,
			replaceExisting);
}

CountryFlags.prototype.GetIconName = function(countryCode)
{
	return "icon_country_" + countryCode.toLowerCase();
};
