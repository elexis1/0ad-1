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

#ifndef GEOLITE2_H
#define GEOLITE2_H

#include "lib/file/vfs/vfs_path.h"

#include <string>

/**
 * The comma separated values of one line, excluding the first value.
 */
using GeoLite2Data = std::vector<std::string>;

/**
 * This class provides caching of the GeoLite2 database and query results using the systems inet.h.
 * It uses caching to prevent reoccuring slow lookup times.
 *
 * GeoLite2 files:
 *   The here supported GeoLite2 datasets are a GeoLite2-*Blocks*.csv and a GeoLite2-*Location.csv file.
 *   The Blocks file maps from IPv4 or IPv6 subnet to the location ID and some properties about the ISP.
 *   The Location file maps from a location ID to some properties about the location.
 *   Both the Country and the City level are supported.
 */
class GeoLite2
{
public:
	GeoLite2(const std::string& IETFLanguageTag);
	~GeoLite2();

	/**
	 * Returns whether the user requested a class instance.
	 */
	static bool IsEnabled();

	/**
	 * Loads both the Blocks and the Locations file of the given IPv4.
	 */
	std::vector<GeoLite2Data> GetIPv4Data(u32 ipAddress);

private:

	// Loads and parses the GeoLite2 Blocks csv file.
	bool LoadBlocksIPv4(const std::string& cityOrCountry);

	// Loads and parses the GeoLite2 Blocks csv file.
	bool LoadLocations(const std::string& cityOrCountry);

	// Loads a csv file and parses it as a vector of strings excluding the first line.
	bool LoadCSVFile(const VfsPath& pathname, std::map<std::string, GeoLite2Data>& csv);

	/**
	 * The directory that the user configured to load.
	 */
	VfsPath m_Path;

	/**
	 * This is the IETF code of language that should be loaded, for example "en", or "pt-BR" for brazilian portuguese.
	 */
	std::string m_IETFLanguageTag;

	/**
	 * Maps from subnet (parsed CIDR notation) to GeoLite2 subnet properties (most importantly location ID).
	 */
	std::map<std::pair<u32, int>, GeoLite2Data> m_BlocksIPv4;

	/**
	 * Maps from geoname ID to location properties.
	 */
	std::map<std::string, GeoLite2Data> m_Locations;

	/**
	 * A cache that stores Location.csv properties for previously looked up IP addresses.
	 */
	// TODO: Use shared_ptr or some kind of ref to avoid copies?
	std::map<u32, std::vector<GeoLite2Data>> m_IPv4Cache;
};

/**
 * Sneaky global.
 */
extern GeoLite2* g_GeoLite2;

#endif // GEOLITE2_H
