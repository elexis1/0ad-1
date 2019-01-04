/* Copyright (C) 2019 Wildfire Games.
 * This file is part of 0 A.D.
 *
 * 0 A.D. is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * 0 A.D. is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with 0 A.D.  If not, see <http://www.gnu.org/licenses/>.
 */

#include "precompiled.h"

#include "GeoLite2.h"

#include "lib/file/vfs/vfs_path.h"
#include "ps/Filesystem.h"
#include "network/IPTools.h"

#include <string>
#include <vector>

// This namespace provides caching of the GeoLite2 database and query results using the systems inet.h.

/**
 * Maps from subnet to subnet properties (including geoname ID).
 * TODO: don't store the subnet string, but the u32/int pair!
 */
std::map<std::string, std::vector<std::string>> g_CountryBlocks;

/**
 * Maps from geoname ID to location properties.
 */
std::map<std::string, std::vector<std::string>> g_CountryLocations;

/**
 * A cache that stores location properties for previously looked up IP addresses.
 */
// TODO: Use shared_ptr or some kind of ref to avoid copies?
std::map<std::string, std::vector<std::string>> g_IPToGeoRegion;

bool GeoLite2::LoadCSVFile(const VfsPath& pathname, std::map<std::string, std::vector<std::string>>& csv)
{
	CVFSFile file;
	if (file.Load(g_VFS, pathname) != PSRETURN_OK)
		return false;

	std::stringstream sstream(file.DecodeUTF8());

	// Skip first line, which is the header
	std::string line;
	std::getline(sstream, line);

	csv.clear();

	while (std::getline(sstream, line))
	{
		std::vector<std::string> values;
		{
			std::string value;
			std::istringstream valuesStream(line);
			while (std::getline(valuesStream, value, ','))
				values.push_back(value);
		}

		std::string key = values[0];
		values.erase(values.begin());
		// TODO shared_ptr?
		csv[key] = values;
	}
	return true;
}

// "network,geoname_id,registered_country_geoname_id,represented_country_geoname_id,is_anonymous_proxy,is_satellite_provider"
// For example "46.255.40.0/24,2921044,2635167,,0,0"
bool GeoLite2::LoadCountryBlocksIPv4(const VfsPath& pathname)
{
	return LoadCSVFile(pathname, g_CountryBlocks);
}

// "geoname_id,locale_code,continent_code,continent_name,country_iso_code,country_name,is_in_european_union"
// For example "2921044,en,EU,Europe,DE,Germany,1"
bool GeoLite2::LoadCountryLocations(const VfsPath& pathname)
{
	return LoadCSVFile(pathname, g_CountryLocations);
}

// * Loads GeoLite2-Country-Locations-en.csv.

std::string GeoLite2::GetCountry(const std::string& ipAddress)
{
	if (g_IPToGeoRegion.count(ipAddress))
		return g_IPToGeoRegion[ipAddress][0];

	for (const std::pair<std::string, std::vector<std::string>>& entry : g_CountryBlocks)
		if (IPTools::IsIPv4PartOfSubnet(ipAddress, entry.first))
		{
			g_IPToGeoRegion[ipAddress] = entry.second;
			return entry.second[0];
		}

	return std::string();
}
