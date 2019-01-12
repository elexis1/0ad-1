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
#include "scriptinterface/ScriptInterface.h"

#include <algorithm>
#include <iterator>
#include <string>
#include <vector>

// TODO: Support IPv6
// TODO: implement a thread to load, the City file consumes 14 seconds to load!

GeoLite2* g_GeoLite2 = nullptr;

GeoLite2::GeoLite2(const std::string& IETFLanguageTag)
: m_IETFLanguageTag(IETFLanguageTag)
{
	LoadPath();

	if (!LoadContent("City") && !LoadContent("Country"))
		LOGERROR("Could not load GeoLite2 city nor country data!");

	LoadBlocks("ASN");
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

std::map<std::string, std::string> GeoLite2::m_BlocksHeader = {
	{ "Country", "network,geoname_id,registered_country_geoname_id,represented_country_geoname_id,is_anonymous_proxy,is_satellite_provider" },
	{ "City", "network,geoname_id,registered_country_geoname_id,represented_country_geoname_id,is_anonymous_proxy,is_satellite_provider,postal_code,latitude,longitude,accuracy_radius" },
	{ "ASN", "network,autonomous_system_number,autonomous_system_organization" }
};

std::map<std::string, std::string> GeoLite2::m_LocationsHeader = {
	{ "Country", "geoname_id,locale_code,continent_code,continent_name,country_iso_code,country_name,is_in_european_union" },
	{ "City", "geoname_id,locale_code,continent_code,continent_name,country_iso_code,country_name,subdivision_1_iso_code,subdivision_1_name,subdivision_2_iso_code,subdivision_2_name,city_name,metro_code,time_zone,is_in_european_union" }
};

/**
 * Load
 *   GeoLite2-City-Blocks-IPv4.csv or
 *   GeoLite2-Country-Blocks-IPv4.csv or
 *   GeoLite2-ASN-Blocks-IPv4.csv.
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
 *
 * Example ASM:
 *   network,autonomous_system_number,autonomous_system_organization
 *   88.198.0.0/16,24940,"Hetzner Online GmbH"
 */
bool GeoLite2::LoadBlocks(const std::string& content)
{
	VfsPath filePath(m_Path / ("GeoLite2-" + content + "-Blocks-IPv4.csv"));

	std::function<void(const std::vector<std::string>& values)> readLine = [this, content](const std::vector<std::string>& values)
	{
		if (values.size() < 1)
			return;

		// Parse subnet
		const std::string& subnet = values.at(0);
		u32 subnetAddress;
		u8 subnetMaskBits;
		if (!IPTools::ParseSubnet(subnet, subnetAddress, subnetMaskBits))
		{
			LOGERROR("GeoLite2: Could not parse Subnet %s\n", subnet.c_str());
			return;
		}
		IPv4SubnetKeyType subnetKey = { subnetAddress, subnetMaskBits };

		// Parse content
		if (content == "Country")
			ParseCountryBlocksLine(subnet, subnetKey, values);
		else if (content == "City")
			ParseCityBlocksLine(subnet, subnetKey, values);
		else if (content == "ASN")
			ParseASNBlocksLine(subnet, subnetKey, values);
	};

	return LoadCSVFile(filePath, m_BlocksHeader[content], readLine);
}

/**
 * This function is also used to parse the first columns of the City Blocks file.
 */
void GeoLite2::ParseCountryBlocksLine(const std::string& UNUSED(subnet), const IPv4SubnetKeyType& subnetKey, const std::vector<std::string>& values)
{
	if (values.size() < 6)
		return;

	const std::string& geonameID = values.at(1);
	const std::string& registeredGeonameID = values.at(2);
	const std::string& representedGeonameID = values.at(3);
	const bool isAnonymous = values.at(4) == "1";
	const bool isSatellite = values.at(5) == "1";

	if (geonameID.empty())
		return;

	// Parse geonameID
	const u32 geonameIDNum = static_cast<u32>(std::stoul(
		geonameID.length() ? geonameID :
		representedGeonameID.length() ? representedGeonameID :
		registeredGeonameID));

	// Store the data
	m_Blocks_IPv4_GeoID[subnetKey] = geonameIDNum;

	if (isSatellite)
		m_Blocks_IPv4_Satellite.insert(subnetKey);

	if (isAnonymous)
		m_Blocks_IPv4_Anonymous.insert(subnetKey);
}

void GeoLite2::ParseCityBlocksLine(const std::string& subnet, const IPv4SubnetKeyType& subnetKey, const std::vector<std::string>& values)
{
	ParseCountryBlocksLine(subnet, subnetKey, values);

	// This can happen if the accuracy radius is empty
	if (values.size() < 10)
		return;

	//const std::string& postal_code = values.at(6);
	const std::string& latitude = values.at(7);
	const std::string& longitude = values.at(8);
	const std::string& accuracy_radius = values.at(9);

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

void GeoLite2::ParseASNBlocksLine(const std::string& UNUSED(subnet), const IPv4SubnetKeyType& subnetKey, const std::vector<std::string>& values)
{
	if (values.size() < 3)
		return;

	const std::string& autonomousSystemNumber = values.at(1);
	const std::string& autonomousSystemOrganization = values.at(2);

	const u32 autonomousSystemNumberNum = static_cast<u32>(std::stoul(autonomousSystemNumber));

	m_Blocks_IPv4_AutonomousSystemNumber[subnetKey] = autonomousSystemNumberNum;
	m_Blocks_IPv4_AutonomousSystemOrganization[autonomousSystemNumberNum] = autonomousSystemOrganization;
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

		std::function<void(const std::vector<std::string>& values)> readLine = [this, content](const std::vector<std::string>& values)
		{
			if (values.size() < 1)
				return;

			const std::string& geonameID = values.at(0);
			const u32 geonameIDNum = static_cast<u32>(std::stoul(geonameID));

			if (content == "City")
				ParseCityLocationsLine(geonameID, geonameIDNum, values);
			else if (content == "Country")
				ParseCountryLocationsLine(geonameID, geonameIDNum, values);
		};

		if (LoadCSVFile(filePath, m_LocationsHeader[content], readLine))
			return true;
	}

	return false;
}

void GeoLite2::ParseCountryLocationsLine(const std::string& UNUSED(geonameID), const u32& geonameIDNum, const std::vector<std::string>& values)
{
	if (values.size() < 7)
		return;

	// Notice ICU could be used for country and continent names, but not for city names, so it would be inconsistent to do so.

	// const std::string& localeCode = values.at(1);
	// const std::string& continentCode = values.at(2);
	const std::string& continentName = values.at(3);
	const std::string& countryCode = values.at(4);
	const std::string& countryName = values.at(5);
	//const bool isInEuropeanUnion = values.at(6) == "1";

	if (m_CountryLocations_CountryCodes.count(geonameIDNum) == 0)
	{
		m_CountryLocations_CountryCodes[geonameIDNum] = countryCode;
		m_CountryLocations_CountryData[countryCode] = { continentName, countryName };
	}
}

void GeoLite2::ParseCityLocationsLine(const std::string& geonameID, const u32& geonameIDNum, const std::vector<std::string>& values)
{
	if (values.size() < 14)
		return;

	ParseCountryLocationsLine(geonameID, geonameIDNum, values);

	// Discard a number of less relevant data to save memory
	//const std::string& subdivision1Code = values.at(6);
	//const std::string& subdivision1Name = values.at(7);
	//const std::string& subdivision2Code = values.at(8);
	//const std::string& subdivision2Name = values.at(9);
	const std::string& cityName = values.at(10);
	//const std::string& metroCode = values.at(11);
	const std::string& timeZone = values.at(12);
	//const bool isInEuropeanUnion = values.at(13) == "1";

	u32 cityNameID = 0;
	{
		std::vector<std::string>::iterator cityNameIt = std::find(m_CityLocations_CityName.begin(), m_CityLocations_CityName.end(), cityName);
		if (cityNameIt == m_CityLocations_CityName.end())
		{
			m_CityLocations_CityName.push_back(cityName);
			cityNameID = m_CityLocations_CityName.size() - 1;
		}
		else
			cityNameID = std::distance(m_CityLocations_CityName.begin(), cityNameIt);
	}

	u16 timezoneID = 0;
	{
		std::vector<std::string>::iterator timeZoneIt = std::find(m_CityLocations_TimeZone.begin(), m_CityLocations_TimeZone.end(), timeZone);
		if (timeZoneIt == m_CityLocations_TimeZone.end())
		{
			m_CityLocations_TimeZone.push_back(timeZone);
			timezoneID = m_CityLocations_TimeZone.size() - 1;
		}
		else
			timezoneID = std::distance(m_CityLocations_TimeZone.begin(), timeZoneIt);
	}

	m_CityLocations_CityIDs[geonameIDNum] = { cityNameID, timezoneID };
}

/**
 * Loads the given GeoLite2 csv file as a map from the first value to the rest of the values.
 */
bool GeoLite2::LoadCSVFile(const VfsPath& filePath, const std::string& expectedHeader, std::function<void(const std::vector<std::string>&)>& lineRead)
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

	if (header != expectedHeader)
	{
		debug_printf("\n");
		LOGERROR("Unexpected GeoLite2 csv header!");
	}

	// Notice that:
	// 1. The comma separated values can be encapsulated in quotes if the word contains a comma
	// 2. Quotes in comma separated values are escaped with a quote character, for example the city Kup""yans'k:
	// 703656,en,EU,Europe,UA,Ukraine,63,"Kharkivs'ka Oblast'",,,"Kup""yans'k",,Europe/Kiev,0
	std::string line;
	while (std::getline(sstream, line))
	{
		std::vector<std::string> values;
		{
			std::stringstream valuesStream(line);
			while (!valuesStream.eof())
			{
				const bool quoted = valuesStream.peek() == '"';
				if (quoted)
				{
					valuesStream.ignore(1);

					std::string value;
					std::string word;
					while(std::getline(valuesStream, word, '"'))
					{
						value += word;

						if (valuesStream.peek() == '"')
							// Remove quote escape character
							valuesStream.ignore(1);
						else
							break;

					}
					values.push_back(value);
				}
				else
				{
					std::string value;
					if (std::getline(valuesStream, value, ','))
						values.push_back(value);
				}

				if (quoted)
				{
					char comma = 0;
					valuesStream >> comma;
					if (comma != ',' && comma != 0)
					{
						debug_printf("\n");
						LOGERROR("CSV: Unterminated quoted comma-separated value in line %s!", line.c_str());
					}
				}
			}
		}
		lineRead(values);
	}

	debug_printf(", took %lds.\n", std::time(nullptr) - started);
	return true;
}

/**
 * Returns the data of the given IP address from both Blocks and Location files.
 */
JS::Value GeoLite2::GetIPv4Data(const ScriptInterface& scriptInterface, u32 ipAddress)
{
	JSContext* cx = scriptInterface.GetContext();
	JSAutoRequest rq(cx);
	JS::RootedValue returnValue(cx, JS::ObjectValue(*JS_NewPlainObject(cx)));

	bool foundBlock = false;
	for (const std::pair<IPv4SubnetKeyType, u32>& block : m_Blocks_IPv4_GeoID)
	{
		const IPv4SubnetKeyType& subnetKey = block.first;
		const u32& geonameIDNum = block.second;

		if (!IPTools::IsIpV4PartOfSubnet(ipAddress, subnetKey.first, subnetKey.second))
			continue;

		// Blocks data
		scriptInterface.SetProperty(returnValue, "isAnonymous", m_Blocks_IPv4_Anonymous.count(subnetKey) != 0);
		scriptInterface.SetProperty(returnValue, "isSatellite", m_Blocks_IPv4_Satellite.count(subnetKey) != 0);

		if (m_Blocks_IPv4_GeoCoordinates.count(subnetKey) != 0)
		{
			scriptInterface.SetProperty(returnValue, "longitude", std::get<0>(m_Blocks_IPv4_GeoCoordinates.at(subnetKey)));
			scriptInterface.SetProperty(returnValue, "latitude", std::get<1>(m_Blocks_IPv4_GeoCoordinates.at(subnetKey)));
			scriptInterface.SetProperty(returnValue, "accuracyRadius", std::get<2>(m_Blocks_IPv4_GeoCoordinates.at(subnetKey)));
		}

		// Locations data
		if (m_CountryLocations_CountryCodes.count(geonameIDNum) != 0)
		{
			const std::string& countryCode = m_CountryLocations_CountryCodes.at(geonameIDNum);
			const std::pair<std::string, std::string>& countryData = m_CountryLocations_CountryData.at(countryCode);

			scriptInterface.SetProperty(returnValue, "countryCode", wstring_from_utf8(countryCode));
			scriptInterface.SetProperty(returnValue, "continentName", wstring_from_utf8(countryData.first));
			scriptInterface.SetProperty(returnValue, "countryName", wstring_from_utf8(countryData.second));
		}

		if (m_CityLocations_CityIDs.count(geonameIDNum) != 0)
		{
			const std::pair<u32, u16>& cityID = m_CityLocations_CityIDs.at(geonameIDNum);
			scriptInterface.SetProperty(returnValue, "cityName", wstring_from_utf8(m_CityLocations_CityName.at(cityID.first)));
			scriptInterface.SetProperty(returnValue, "timeZone", wstring_from_utf8(m_CityLocations_TimeZone.at(cityID.second)));
		}

		foundBlock = true;
		break;
	}

	if (!foundBlock)
	{
		return JS::UndefinedValue();
	}

	// ASN data
	// Notice the different csv files use different subnets
	for (const std::pair<IPv4SubnetKeyType, u32>& autonomousSystem : m_Blocks_IPv4_AutonomousSystemNumber)
	{
		const IPv4SubnetKeyType& subnetKey = autonomousSystem.first;
		const u32& autonomousSystemNumberNum = autonomousSystem.second;

		if (IPTools::IsIpV4PartOfSubnet(ipAddress, subnetKey.first, subnetKey.second) ||
		    m_Blocks_IPv4_AutonomousSystemNumber.count(subnetKey) == 0)
		{
			scriptInterface.SetProperty(returnValue, "autonomousSystemOrganization", m_Blocks_IPv4_AutonomousSystemOrganization.at(autonomousSystemNumberNum));
			break;
		}
	}

	return returnValue;
}
