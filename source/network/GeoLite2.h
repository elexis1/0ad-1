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
#include "scriptinterface/ScriptInterface.h"

#include <string>

/**
 * Identifies an IPv4 range as a parsed CIDR, i.e. an IPv4 in hostbyte order + Number of bits of the subnet mask.
 */
// TODO: Consider using u64 conversion to save space :/
using IPv4SubnetKeyType = std::pair<u32, u8>;

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
	JS::Value GetIPv4Data(const ScriptInterface& scriptInterface, u32 ipAddress);

private:

	// Loads the user configured VFS directory from which the csv files will be loaded.
	void LoadPath();

	// Proxy calling LoadBlocksIPv4 and LoadLocations.
	bool LoadContent(const std::string& content);

	// Loads and parses the GeoLite2 Blocks csv file.
	bool LoadBlocks(const std::string& content);

	// Parses Country data of a City or Country Blocks file.
	void ParseCountryBlocksLine(const std::string& subnet, const IPv4SubnetKeyType& subnetKey, const std::vector<std::string>& values);
	void ParseCityBlocksLine(const std::string& subnet, const IPv4SubnetKeyType& subnetKey, const std::vector<std::string>& values);
	void ParseASNBlocksLine(const std::string& subnet, const IPv4SubnetKeyType& subnetKey, const std::vector<std::string>& values);

	// Loads and parses the GeoLite2 Blocks csv file.
	bool LoadLocations(const std::string& content);

	// Loads a csv file and parses it as a vector of strings excluding the first line.
	bool LoadCSVFile(const VfsPath& filePath, const std::string& expectedHeader, std::function<void(std::vector<std::string>&)>& lineRead);

	bool ParseGeonameID(const std::string& geoNameID, u32& geonameIDNum);
	void ParseCityLocationsLine(const std::string& geonameID, const u32& geonameIDNum, const std::vector<std::string>& values);
	void ParseCountryLocationsLine(const std::string& geonameID, const u32& geonameIDNum, const std::vector<std::string>& values);

	/**
	 * The directory that the user configured to load.
	 */
	VfsPath m_Path;

	/**
	 * This is the IETF code of language that should be loaded, for example "en", or "pt-BR" for brazilian portuguese.
	 */
	std::string m_IETFLanguageTag;

	/**
	 * Stores the header of the csv files of every content type. Used as an integrity test.
	 */
	static std::map<std::string, std::string> m_BlocksHeader;
	static std::map<std::string, std::string> m_LocationsHeader;

	// This discards a lot of less relevant data, because storing all strings of a City file would consume about 2GB.

	// Country Blocks data
	std::map<IPv4SubnetKeyType, u32> m_Blocks_IPv4_GeoID;
	std::set<IPv4SubnetKeyType> m_Blocks_IPv4_Anonymous;
	std::set<IPv4SubnetKeyType> m_Blocks_IPv4_Satellite;

	// City Blocks data
	std::map<IPv4SubnetKeyType, std::tuple<float, float, u16>> m_Blocks_IPv4_GeoCoordinates;

	// ASN Blocks data
	std::map<IPv4SubnetKeyType, u32> m_Blocks_IPv4_AutonomousSystemNumber;
	std::map<u32, std::string> m_Blocks_IPv4_AutonomousSystemOrganization;

	/**
	 * Maps from geoname ID to Locations data.
	 */
	std::map<u32, std::vector<std::string>> m_CountryLocations;
	std::map<u32, std::vector<std::string>> m_CityLocations;
};

/**
 * Sneaky global.
 */
extern GeoLite2* g_GeoLite2;

#endif // GEOLITE2_H
