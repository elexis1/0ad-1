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
#include "network/IPTools.h"
#include "ps/ConfigDB.h"
#include "ps/Filesystem.h"
#include "ps/CLogger.h"

#include <string>
#include <vector>

// TODO: Support IPv6

GeoLite2* g_GeoLite2 = nullptr;

GeoLite2::GeoLite2(const std::string& IETFLanguageTag)
: m_IETFLanguageTag(IETFLanguageTag)
{
	std::string path;
	CFG_GET_VAL("network.geolite2.directory", path);
	m_Path = path;

	std::vector<std::string> vecCityOrCountry = { "City", "Country" };

	for (const std::string& cityOrCountry : vecCityOrCountry)
		if (LoadBlocksIPv4(cityOrCountry) && LoadLocations(cityOrCountry))
			return;

	LOGERROR("Could not load GeoLite2 data!");
}

GeoLite2::~GeoLite2()
{
}

bool GeoLite2::IsEnabled()
{
	bool enabled = true;
	CFG_GET_VAL("network.geolite2.enabled", enabled);
	return enabled;
}

/**
 * Load
 *   GeoLite2-City-Blocks-IPv4.csv or
 *   GeoLite2-Country-Blocks-IPv4.csv.
 *
 * The City filesize can exceed 150MB. Storing it as a string vector can consume 2GB+!
 * Therefore the data must be stored as numbers and bools where possible.
 *
 * Example Country:
 *   network,geoname_id,registered_country_geoname_id,represented_country_geoname_id,is_anonymous_proxy,is_satellite_provider
 *   92.222.251.176/28,3017382,3017382,,0,0
 *
 * Example City:
 *   network,geoname_id,registered_country_geoname_id,represented_country_geoname_id,is_anonymous_proxy,is_satellite_provider,postal_code,latitude,longitude,accuracy_radius
 *   38.88.98.0/23,6075357,6252001,,0,0,L5J,43.5102,-79.6296,500
 */
bool GeoLite2::LoadBlocksIPv4(const std::string& cityOrCountry)
{
	VfsPath filePath(m_Path / ("GeoLite2-" + cityOrCountry + "-Blocks-IPv4.csv"));

	std::map<std::string, GeoLite2Data> countryBlocks;
	m_BlocksIPv4.clear();

	if (!LoadCSVFile(filePath, countryBlocks))
		return false;

	// Store subnets as numbers
	debug_printf("Parsing %s\n", filePath.string8().c_str());

	for (const std::pair<std::string, GeoLite2Data>& countryBlock : countryBlocks)
	{
		u32 subnetAddress;
		int subnetMaskBits;

		if (IPTools::ParseSubnet(countryBlock.first, subnetAddress, subnetMaskBits))
			// TODO: Need to parse the strings into numbers and booleans, it costs too much space
			m_BlocksIPv4[std::make_pair(subnetAddress, subnetMaskBits)] = countryBlock.second;
		else
			LOGERROR("GeoLite2: Could not parse Subnet %s\n", countryBlock.first.c_str());
	}

	debug_printf("Loaded %s\n", filePath.string8().c_str());

	return true;
}

/**
 * Load
 *   GeoLite2-City-Locations-en.csv or
 *   GeoLite2-Country-Locations-en.csv or...
 *
 * The filesize can exceed 10MB.
 *
 * Example Country:
 *   geoname_id,locale_code,continent_code,continent_name,country_iso_code,country_name,is_in_european_union
 *   2264397,en,EU,Europe,PT,Portugal,1
 *
 *  Example City:
 *   geoname_id,locale_code,continent_code,continent_name,country_iso_code,country_name,subdivision_1_iso_code,subdivision_1_name,subdivision_2_iso_code,subdivision_2_name,city_name,metro_code,time_zone,is_in_european_union
 *   11696023,en,NA,"North America",CA,Canada,QC,Quebec,,,Sainte-Claire,,America/Toronto,0
 */
bool GeoLite2::LoadLocations(const std::string& cityOrCountry)
{
	std::vector<std::string> IETFLanguageTags = { m_IETFLanguageTag, "en" };

	for (const std::string& IETFLanguageTag : IETFLanguageTags)
	{
			VfsPath filePath(m_Path / ("GeoLite2-" + cityOrCountry + "-Locations-" + IETFLanguageTag + ".csv"));
			m_Locations.clear();

			if (LoadCSVFile(filePath, m_Locations))
			{
				debug_printf("Loaded %s\n", filePath.string8().c_str());
				return true;
			}
	}

	return false;
}

/**
 * Loads the given GeoLite2 csv file as a map from the first value to the rest of the values.
 */
// TODO: callback function?
bool GeoLite2::LoadCSVFile(const VfsPath& filePath, std::map<std::string, GeoLite2Data>& csv)
{
	CVFSFile file;
	// TODO: VfsFileExists needed?
	if (!VfsFileExists(filePath) || file.Load(g_VFS, filePath) != PSRETURN_OK)
		return false;

	debug_printf("Loading %s\n", filePath.string8().c_str());

	csv.clear();
	std::stringstream sstream(file.DecodeUTF8());

	// Read header
	std::string header;
	std::getline(sstream, header);

	std::string line;
	while (std::getline(sstream, line))
	{
		GeoLite2Data values(new std::vector<std::string>());
		{
			std::string value;
			std::stringstream valuesStream(line);
			while (std::getline(valuesStream, value, ','))
				values->push_back(value);
		}

		std::string key = (*values)[0];
		values->erase(values->begin());
		csv[key] = values;
	}

	return true;
}

/**
 * Returns the data of the given IP address from both Blocks and Location file.
 */
std::map<std::string, GeoLite2Data> GeoLite2::GetIPv4Data(u32 ipAddress)
{
	if (!m_IPv4Cache.count(ipAddress))
		for (const std::pair<std::pair<u32, int>, GeoLite2Data>& countryBlock : m_BlocksIPv4)
			if (IPTools::IsIpV4PartOfSubnet(ipAddress, countryBlock.first.first, countryBlock.first.second))
			{
				m_IPv4Cache[ipAddress] = {
					{ "block", countryBlock.second },
					{ "location", m_Locations[(*countryBlock.second)[0]] }
				};
				break;
			}

	return m_IPv4Cache[ipAddress];
}
