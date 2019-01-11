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
	LoadPath();

	if (!LoadContent("City") && !LoadContent("Country"))
		LOGERROR("Could not load GeoLite2 city nor country data!");

	//LoadContent("ASN");
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

void GeoLite2::LoadPath()
{
	std::string path;
	CFG_GET_VAL("network.geolite2.directory", path);
	m_Path = path;
}

bool GeoLite2::LoadContent(const std::string& content)
{
	return LoadBlocks(content) && LoadLocations(content);
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
bool GeoLite2::LoadBlocks(const std::string& content)
{
	VfsPath filePath(m_Path / ("GeoLite2-" + content + "-Blocks-IPv4.csv"));

	m_Blocks_IPv4_GeoID.clear();
	m_Blocks_IPv4_Satellite.clear();
	m_Blocks_IPv4_Anonymous.clear();
	m_Blocks_IPv4_GeoCoordinates.clear();
	m_Blocks_IPv4_AutonomousSystem.clear();

	std::function<void(std::vector<std::string>& values)> myFunc = [this, content](std::vector<std::string>& values)
	{
		// Country values
		const std::string& subnet = values[0];
		const std::string& geonameID = values[1];
		const std::string& registeredGeonameID = values[2];
		const std::string& representedGeonameID = values[3];
		const bool isAnonymous = values[4] == "1";
		const bool isSatellite = values[5] == "1";

		if (geonameID.empty())
			return;

		// Parse subnet
		u32 subnetAddress;
		u8 subnetMaskBits;
		if (!IPTools::ParseSubnet(subnet, subnetAddress, subnetMaskBits))
		{
			LOGERROR("GeoLite2: Could not parse Subnet %s\n", subnet.c_str());
			return;
		}
		IPv4SubnetKeyType subnetKey = { subnetAddress, subnetMaskBits };

		// Parse geoname ID
		u32 geonameIDNum = 0;
		if (!ParseGeonameID(
			geonameID.length() ? geonameID :
			representedGeonameID.length() ? representedGeonameID :
			registeredGeonameID, geonameIDNum))
		{
			LOGERROR("Could not parse geoname ID for subnet %s", subnet.c_str());
			return;
		}

		// Store country data
		m_Blocks_IPv4_GeoID[subnetKey] = geonameIDNum;

		if (isSatellite)
			m_Blocks_IPv4_Satellite.insert(subnetKey);

		if (isAnonymous)
			m_Blocks_IPv4_Anonymous.insert(subnetKey);

		if (content == "City" && !isSatellite && !isAnonymous)
		{
			//const std::string& postal_code = values[6];
			const std::string& latitude = values[7];
			const std::string& longitude = values[8];
			const std::string& accuracy_radius = values[9];

			if (!latitude.empty() && !longitude.empty() && !accuracy_radius.empty())
			try
			{
				m_Blocks_IPv4_GeoCoordinates[subnetKey] = {
					std::stof(latitude),
					std::stof(longitude),
					static_cast<u16>(std::stoul(accuracy_radius))
				};
			}
			catch (...)
			{
				LOGERROR("Could not parse City Block data of %s", subnet.c_str());
			}
		}
	};

	return LoadCSVFile(filePath, myFunc);
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
bool GeoLite2::LoadLocations(const std::string& content)
{
	// TODO: I suppose the language tag should be an argument provided elsewhere
	std::vector<std::string> IETFLanguageTags = { m_IETFLanguageTag, "en" };

	for (const std::string& IETFLanguageTag : IETFLanguageTags)
	{
		VfsPath filePath(m_Path / ("GeoLite2-" + content + "-Locations-" + IETFLanguageTag + ".csv"));

		std::function<void(std::vector<std::string>& values)> myFunc = [this](std::vector<std::string>& values)
		{
			const std::string& geonameID = values[0];
			u32 geonameIDNum = 0;

			if (!ParseGeonameID(geonameID, geonameIDNum))
			{
				LOGERROR("Could not parse geoname ID for subnet %s", geonameID.c_str());
				return;
			}

			values.erase(values.begin());
			values.shrink_to_fit();

			m_Locations[geonameIDNum] = values;
		};

		if (LoadCSVFile(filePath, myFunc))
			return true;
	}

	return false;
}

/**
 * Loads the given GeoLite2 csv file as a map from the first value to the rest of the values.
 */
bool GeoLite2::LoadCSVFile(const VfsPath& filePath, std::function<void(std::vector<std::string>&)>& lineRead)
{
	CVFSFile file;
	// TODO: VfsFileExists needed?
	if (!VfsFileExists(filePath) || file.Load(g_VFS, filePath) != PSRETURN_OK)
		return false;

	debug_printf("Loading %s", filePath.string8().c_str());
	std::time_t started = std::time(nullptr);

	std::stringstream sstream(file.DecodeUTF8());

	// Read header
	std::string header;
	std::getline(sstream, header);

	std::string line;
	while (std::getline(sstream, line))
	{
		std::vector<std::string> values;
		{
			std::string value;
			std::stringstream valuesStream(line);
			while (std::getline(valuesStream, value, ','))
				values.push_back(value);
		}
		lineRead(values);
	}

	debug_printf(", took %lds.\n", std::time(nullptr) - started);
	return true;
}

bool GeoLite2::ParseGeonameID(const std::string& geoNameID, u32& geonameIDNum)
{
	try
	{
		geonameIDNum = static_cast<u32>(std::stoul(geoNameID));
		return true;
	}
	catch (...)
	{
		return false;
	}
}

/**
 * Returns the data of the given IP address from both Blocks and Location file.
 */
std::map<std::string, GeoLite2Data> GeoLite2::GetIPv4Data(u32 ipAddress)
{
	if (!m_IPv4Cache.count(ipAddress))
		for (const std::pair<std::pair<u32, int>, u32>& countryBlock : m_Blocks_IPv4_GeoID)
			if (IPTools::IsIpV4PartOfSubnet(ipAddress, countryBlock.first.first, countryBlock.first.second))
			{
				m_IPv4Cache[ipAddress] = {
					{ "block", std::vector<std::string>() },
					{ "location", m_Locations[countryBlock.second] }
				};
				break;
			}

	return m_IPv4Cache[ipAddress];
}
