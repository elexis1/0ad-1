/* Copyright (C) 2018 Wildfire Games.
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

#include "precompiled.h"

#include "ModIo.h"

#include "ps/CLogger.h"
#include "ps/ConfigDB.h"
#include "ps/GameSetup/Paths.h"
#include "ps/Mod.h"

#include "i18n/L10n.h"
#include "lib/file/file_system.h"
#include "lib/sysdep/filesystem.h"
#include "lib/sysdep/sysdep.h"
#include "scriptinterface/ScriptConversions.h"
#include "scriptinterface/ScriptInterface.h"

#include <boost/algorithm/string/classification.hpp>
#include <boost/algorithm/string/split.hpp>
#include <iomanip>

ModIo* g_ModIo = nullptr;

ModIo::ModIo()
	: m_GamesRequest("/games")
{
	// Get config values from the sytem namespace, or below (default)
	// this can be overridden on the command line.
	// We do this so a malicious mod cannot change the base url and get the user to make connections
	// to someone else's endpoint.
	// If another user of the engine wants to provide different values here,
	// while still using the same engine version, they can just provide some shortcut/script
	// that sets these using command line parameters.
	std::string pk_str;
	g_ConfigDB.GetValue(CFG_SYSTEM, "modio.public_key", pk_str);
	g_ConfigDB.GetValue(CFG_SYSTEM, "modio.v1.baseurl", m_BaseUrl);
	{
		std::string api_key;
		g_ConfigDB.GetValue(CFG_SYSTEM, "modio.v1.api_key", api_key);
		m_ApiKey = "api_key=" + api_key;
	}
	{
		std::string nameid;
		g_ConfigDB.GetValue(CFG_SYSTEM, "modio.v1.name_id", nameid);
		m_IdQuery = "name_id="+nameid;
	}

	m_CurlMulti = curl_multi_init();
	ENSURE(m_CurlMulti);

	m_Curl = curl_easy_init();
	ENSURE(m_Curl);

	// Capture error messages
	curl_easy_setopt(m_Curl, CURLOPT_ERRORBUFFER, m_ErrorBuffer);

	// Fail if the server did
	curl_easy_setopt(m_Curl, CURLOPT_FAILONERROR, 1L);

	// Disable signal handlers (required for multithreaded applications)
	curl_easy_setopt(m_Curl, CURLOPT_NOSIGNAL, 1L);

	// To minimise security risks, don't support redirects (except for file
	// downloads, for which this setting will be enabled).
	curl_easy_setopt(m_Curl, CURLOPT_FOLLOWLOCATION, 0L);

	// For file downloads, one redirect seems plenty for a CDN serving the files.
	curl_easy_setopt(m_Curl, CURLOPT_MAXREDIRS, 1L);

	m_Headers = NULL;
	std::string ua = "User-Agent: pyrogenesis ";
	ua += curl_version();
	ua += " (https://play0ad.com/)";
	m_Headers = curl_slist_append(m_Headers, ua.c_str());
	// TODO more?
	curl_easy_setopt(m_Curl, CURLOPT_HTTPHEADER, m_Headers);

	// TODO Do that elsewhere when used elsewhere
	if (sodium_init() < 0) {
		LOGERROR("Failed to initialize libsodium");
		ENSURE(0 && "sodium_init returned success.");
	}

	size_t bin_len = 0;
	if (sodium_base642bin((unsigned char*)&m_pk, sizeof m_pk, pk_str.c_str(), pk_str.size(), NULL, &bin_len, NULL, sodium_base64_VARIANT_ORIGINAL) != 0 || bin_len != sizeof m_pk)
	{
		LOGERROR("failed to decode base64 public key");
		ENSURE(0 && "invalid public key");
	}
}

ModIo::~ModIo()
{
	curl_slist_free_all(m_Headers);
	curl_easy_cleanup(m_Curl);
	curl_multi_cleanup(m_CurlMulti);
}

size_t ModIo::ReceiveCallback(void* buffer, size_t size, size_t nmemb, void* userp)
{
	ModIo* self = static_cast<ModIo*>(userp);

	self->m_ResponseData += std::string((char*)buffer, (char*)buffer+size*nmemb);

	return size*nmemb;
}

size_t ModIo::DownloadCallback(void* buffer, size_t size, size_t nmemb, void* userp)
{
	DownloadCallbackData* data = static_cast<DownloadCallbackData*>(userp);
	if (!data->fp)
		return 0;

	size_t len = fwrite(buffer, size, nmemb, data->fp);

	// Only update the hash with data we actually managed to write.
	// In case we did not write all of it we will fail the download,
	// but we do not want to have a possibly valid hash in that case.

	data->md5.Update((const u8*)buffer, len*size);
	crypto_generichash_update(&data->hash_state, (const u8*)buffer, len*size);

	return len*size;
}

int ModIo::DownloadProgressCallback(void* clientp, curl_off_t dltotal, curl_off_t dlnow, curl_off_t UNUSED(ultotal), curl_off_t UNUSED(ulnow))
{
	DownloadProgressData* data = static_cast<DownloadProgressData*>(clientp);

	if (dltotal == 0)
		data->progress = 0;
	else
		data->progress = static_cast<double>(dlnow) / static_cast<double>(dltotal);

	return 0;
}

CURLMcode ModIo::SetupRequest(const std::string& url, bool fileDownload)
{
	if (fileDownload)
	{
		// The download link will most likely redirect elsewhere, so allow that.
		// We verify the validity of the file later.
		curl_easy_setopt(m_Curl, CURLOPT_FOLLOWLOCATION, 1L);
		// Enable the progress meter
		curl_easy_setopt(m_Curl, CURLOPT_NOPROGRESS, 0L);

		// Set IO callbacks
		curl_easy_setopt(m_Curl, CURLOPT_WRITEFUNCTION, DownloadCallback);
		curl_easy_setopt(m_Curl, CURLOPT_WRITEDATA, (void*)&m_CallbackData);
		curl_easy_setopt(m_Curl, CURLOPT_XFERINFOFUNCTION, DownloadProgressCallback);
		curl_easy_setopt(m_Curl, CURLOPT_XFERINFODATA, (void*)&m_DownloadProgressData);

		// Initialize the progress counter
		m_DownloadProgressData.progress = 0;
	}
	else
	{
		// Set IO callbacks
		curl_easy_setopt(m_Curl, CURLOPT_WRITEFUNCTION, ReceiveCallback);
		curl_easy_setopt(m_Curl, CURLOPT_WRITEDATA, this);
	}

	m_ErrorBuffer[0] = '\0';
	curl_easy_setopt(m_Curl, CURLOPT_URL, url.c_str());
	return curl_multi_add_handle(m_CurlMulti, m_Curl);
}

void ModIo::TearDownRequest()
{
	ENSURE(curl_multi_remove_handle(m_CurlMulti, m_Curl) == CURLM_OK);

	if (m_CallbackData.fp)
		fclose(m_CallbackData.fp);
	m_CallbackData.fp = nullptr;

	// Go back to the default options for queries

	// To minimise security risks, don't support redirects
	curl_easy_setopt(m_Curl, CURLOPT_FOLLOWLOCATION, 0L);
	// Disable the progress meter
	curl_easy_setopt(m_Curl, CURLOPT_NOPROGRESS, 1L);
}

void ModIo::StartGetGameId()
{
	m_GameId.clear();

	CURLMcode err = SetupRequest(m_BaseUrl+m_GamesRequest+"?"+m_ApiKey+"&"+m_IdQuery, false);
	if (err != CURLM_OK)
	{
		LOGERROR("Failure while starting querying for game id. Error: %s; %s",
			curl_multi_strerror(err), m_ErrorBuffer);
		TearDownRequest();
		m_DownloadProgressData.status = DownloadProgressData::FAILED_GAMEID;
	}
	else
		m_DownloadProgressData.status = DownloadProgressData::GAMEID;
}

void ModIo::StartListMods()
{
	m_ModData.clear();

	if (m_GameId.empty())
	{
		LOGERROR("Game ID not fetched from mod.io. Call StartGetGameId first and wait for it to finish.");
		return;
	}

	CURLMcode err = SetupRequest(m_BaseUrl+m_GamesRequest+m_GameId+"/mods?"+m_ApiKey, false);
	if (err != CURLM_OK)
	{
		LOGERROR("Failure while starting querying for mods. Error: %s; %s",
			curl_multi_strerror(err), m_ErrorBuffer);
		TearDownRequest();
		m_DownloadProgressData.status = DownloadProgressData::FAILED_LISTING;
	}
	else
		m_DownloadProgressData.status = DownloadProgressData::LISTING;
}

void ModIo::StartDownloadMod(size_t idx)
{
	if (idx >= m_ModData.size())
		return;

	const Paths paths(g_args);
	const OsPath modUserPath = paths.UserData()/"mods";
	const OsPath modPath = modUserPath/m_ModData[idx].properties["name_id"];
	if (!DirectoryExists(modPath) && INFO::OK != CreateDirectories(modPath, 0700, false))
	{
		LOGERROR("Could not create mod directory: %s", modPath.string8());
		return;
	}

	// Name the file after the name_id, since using the filename would mean that
	// we could end up with multiple zip files in the folder that might not work
	// as expected for a user (since a later version might remove some files
	// that aren't compatible anymore with the engine version).
	// So we ignore the filename provided by the API and assume that we do not
	// care about handling update.zip files. If that is the case we would need
	// a way to find out what files are required by the current one and which
	// should be removed for everything to work. This seems to be too complicated
	// so we just do not support that usage.
	// NOTE: We do save the file under a slightly different name from the final
	//       one, to ensure that in case a download aborts and the file stays
	//       around, the game will not attempt to open the file which has not
	//       been verified.
	m_DownloadFilePath = modPath/(m_ModData[idx].properties["name_id"]+".zip.temp");
	m_CallbackData = DownloadCallbackData(sys_OpenFile(m_DownloadFilePath, "wb"));
	if (!m_CallbackData.fp)
	{
		LOGERROR("Could not open temporary file for mod download: %s", m_DownloadFilePath.string8());
		return;
	}

	CURLMcode err = SetupRequest(m_ModData[idx].properties["binary_url"], true);
	if (err != CURLM_OK)
	{
		LOGERROR("Failed to start the download. Error: %s; %s",
			curl_multi_strerror(err), m_ErrorBuffer);
		TearDownRequest();
		m_DownloadProgressData.status = DownloadProgressData::FAILED_DOWNLOADING;
	}
	else
	{
		m_DownloadModID = idx;
		m_DownloadProgressData.status = DownloadProgressData::DOWNLOADING;
	}
}

void ModIo::CancelRequest()
{
	TearDownRequest();

	switch (m_DownloadProgressData.status)
	{
	case DownloadProgressData::GAMEID:
		m_DownloadProgressData.status = DownloadProgressData::NONE;
		break;
	case DownloadProgressData::LISTING:
		m_DownloadProgressData.status = DownloadProgressData::READY;
		break;
	case DownloadProgressData::DOWNLOADING:
		m_DownloadProgressData.status = DownloadProgressData::LISTED;
		DeleteDownloadedFile();
		break;
	default:
		break;
	}
}

bool ModIo::AdvanceRequest(const ScriptInterface& scriptInterface)
{
	// If the request was cancelled, stop trying to advance it
	if (m_DownloadProgressData.status != DownloadProgressData::GAMEID &&
		m_DownloadProgressData.status != DownloadProgressData::LISTING &&
        m_DownloadProgressData.status != DownloadProgressData::DOWNLOADING)
		return true;

	int stillRunning;
	CURLMcode err = curl_multi_perform(m_CurlMulti, &stillRunning);
	if (err != CURLM_OK)
	{
		std::string error = fmt::sprintf(
			"Asynchronous download failure: %s, %s", curl_multi_strerror(err), m_ErrorBuffer);
		TearDownRequest();
		if (m_DownloadProgressData.status == DownloadProgressData::DOWNLOADING)
			DeleteDownloadedFile();
		m_DownloadProgressData.Fail(error);
		return true;
	}
	else
	{
		CURLMsg* message;
		do
		{
			int in_queue;
			message = curl_multi_info_read(m_CurlMulti, &in_queue);
			if (!message || message->msg == CURLMSG_DONE || message->easy_handle == m_Curl)
				continue;

			CURLcode err = message->data.result;
			if (err == CURLE_OK)
				continue;

			std::string error = fmt::sprintf(
				"Download failure. Server response: %s; %s", curl_easy_strerror(err), m_ErrorBuffer);
			TearDownRequest();
			if (m_DownloadProgressData.status == DownloadProgressData::DOWNLOADING)
				DeleteDownloadedFile();
			m_DownloadProgressData.Fail(error);
			return true;
		} while (message);
	}

	if (stillRunning)
		return false;

	// Download finished.
	TearDownRequest();

	// Perform parsing and/or checks
	std::string error;
	switch (m_DownloadProgressData.status)
	{
	case DownloadProgressData::GAMEID:
		if (!ParseGameId(scriptInterface, error))
			m_DownloadProgressData.Fail(error);
		else
			m_DownloadProgressData.Succeed();
		break;
	case DownloadProgressData::LISTING:
		if (!ParseMods(scriptInterface, error))
		{
			m_ModData.clear(); // Failed during parsing, make sure we don't provide partial data
			m_DownloadProgressData.Fail(error);
		}
		else
			m_DownloadProgressData.Succeed();
		break;
	case DownloadProgressData::DOWNLOADING:
		if (VerifyDownloadedFile(error))
		{
			m_DownloadProgressData.Succeed();

			const OsPath finalFilePath = m_DownloadFilePath.Parent() / (m_ModData[m_DownloadModID].properties["name_id"] + ".zip");
			if (wrename(m_DownloadFilePath, finalFilePath) != 0)
				LOGERROR("Failed to rename file.");

			// TODO: Trying to download a game twice will fail here (obviously)
		}
		else
		{
			m_DownloadProgressData.status = DownloadProgressData::FAILED_FILECHECK;
			m_DownloadProgressData.error = error;
			DeleteDownloadedFile();
		}
		break;
	}

	// TODO: hook into .pyromod code to do the win32 specific thing because win32...

	return true;
}

bool ModIo::ParseGameId(const ScriptInterface& scriptInterface, std::string& err)
{
	int id = -1;
	if (!ParseGameIdResponse(scriptInterface, m_ResponseData, id, err))
	{
		m_ResponseData.clear();
		return false;
	}

	m_ResponseData.clear();

	m_GameId = "/" + std::to_string(id);
	return true;
}

bool ModIo::ParseMods(const ScriptInterface& scriptInterface, std::string& err)
{
	bool ret = ParseModsResponse(scriptInterface, m_ResponseData, m_ModData, m_pk, err);
	m_ResponseData.clear();
	return ret;
}

void ModIo::DeleteDownloadedFile()
{
	if (wunlink(m_DownloadFilePath) != 0)
		LOGERROR("Failed to delete temporary file.");
	m_DownloadFilePath = OsPath();
}

bool ModIo::VerifyDownloadedFile(std::string& err)
{
	{
		u64 filesize = std::stoull(m_ModData[m_DownloadModID].properties.at("filesize"));
		if (filesize != FileSize(m_DownloadFilePath))
		{
			err = "Invalid filesize.";
			return false;
		}
	}

	// MD5 (because upstream provides it)
	// Just used to make sure there was no obvious corruption during transfer.
	{
		u8 digest[MD5::DIGESTSIZE];
		m_CallbackData.md5.Final(digest);
		std::stringstream md5digest;
		md5digest << std::hex << std::setfill('0');
		for (size_t i = 0; i < MD5::DIGESTSIZE; ++i)
			md5digest << std::setw(2) << (int)digest[i];

		if (m_ModData[m_DownloadModID].properties.at("filehash_md5") != md5digest.str())
		{
			err = fmt::sprintf(
				"Invalid file. Expected md5 %s, got %s.",
				m_ModData[m_DownloadModID].properties.at("filehash_md5").c_str(),
				md5digest.str());
			return false;
		}
	}

	// Verify file signature.
	// Used to make sure that the downloaded file was actually checked and signed
	// by Wildfire Games. And has not been tampered with by the API provider, or the CDN.

	unsigned char hash_fin[crypto_generichash_BYTES_MAX] = {};
	if (crypto_generichash_final(&m_CallbackData.hash_state, hash_fin, sizeof hash_fin) != 0)
	{
		err = "Failed to compute final hash.";
		return false;
	}

	if (crypto_sign_verify_detached(m_ModData[m_DownloadModID].sig.sig, hash_fin, sizeof hash_fin, m_pk.pk) != 0)
	{
		err = "Failed to verify signature.";
		return false;
	}

	return true;
}

#define FAIL(...) STMT(err = fmt::sprintf(__VA_ARGS__); CLEANUP(); return false;)

/**
* Parses the current content of m_ResponseData to extract m_GameId.
*
* The JSON data is expected to look like
* { "data": [{"id": 42, ...}, ...], ... }
* where we are only interested in the value of the id property.
*
* @returns true iff it successfully parsed the id.
*/
bool ModIo::ParseGameIdResponse(const ScriptInterface& scriptInterface, const std::string& responseData, int& id, std::string& err)
{
#define CLEANUP() id = -1;
	JSContext* cx = scriptInterface.GetContext();
	JS::RootedValue gameResponse(cx);

	if (!scriptInterface.ParseJSON(responseData, &gameResponse))
		FAIL("Failed to parse response as JSON.");

	if (!gameResponse.isObject())
		FAIL("response not an object");

	JS::RootedObject gameResponseObj(cx, gameResponse.toObjectOrNull());
	JS::RootedValue dataVal(cx);
	if (!JS_GetProperty(cx, gameResponseObj, "data", &dataVal))
		FAIL("data property not in response.");

	// [{"id": 42, ...}, ...]
	if (!dataVal.isObject())
		FAIL("data property not an object");

	JS::RootedObject data(cx, dataVal.toObjectOrNull());
	u32 length;
	if (!JS_IsArrayObject(cx, data) || !JS_GetArrayLength(cx, data, &length) || !length)
		FAIL("data property not an array with at least one element");

	// {"id": 42, ...}
	JS::RootedValue first(cx);
	if (!JS_GetElement(cx, data, 0, &first))
		FAIL("couldn't get first element.");

	id = -1;
	// TODO: This check currently does not really do anything if "id" is present...
	// meaning we can set id to be null and we get id=0.
	// There is a script value conversion check failed warning, but that does not change anything.
	// TODO: We should probably make those fail (hard), if that isn't done by default (which it probably should)
	// the we should add a templated variant that does.
	// TODO check if id < 0 (<=?) and if yes also fail here
	// NOTE: FromJSProperty does set things to probably 0 even if there is some stupid type conversion
	// So we check for <= 0, so we actually get proper results here...
	// Valid ids are always > 0.
	if (!ScriptInterface::FromJSProperty(cx, first, "id", id) || id <= 0)
		FAIL("couldn't get id");

	return true;
#undef CLEANUP
}

/**
* Parses the current content of m_ResponseData into m_ModData.
*
* The JSON data is expected to look like
* { data: [modobj1, modobj2, ...], ... (including result_count) }
* where modobjN has the following structure
* { homepage: "url", name: "displayname", nameid: "short-non-whitespace-name",
*   summary: "short desc.", modfile: { version: "1.2.4", filename: "asdf.zip",
*   filehash: { md5: "deadbeef" }, filesize: 1234, download: { binary_url: "someurl", ... } }, ... }.
* Only the listed properties are of interest to consumers, and we flatten
* the modfile structure as that simplifies handling and there are no conflicts.
*/
bool ModIo::ParseModsResponse(const ScriptInterface& scriptInterface, const std::string& responseData, std::vector<ModIoModData>& modData, const PKStruct& pk, std::string& err)
{
	// Make sure we don't end up passing partial results back
#define CLEANUP() modData.clear();

	JSContext* cx = scriptInterface.GetContext();
	JS::RootedValue modResponse(cx);

	if (!scriptInterface.ParseJSON(responseData, &modResponse))
		FAIL("Failed to parse response as JSON.");

	if (!modResponse.isObject())
		FAIL("response not an object");

	JS::RootedObject modResponseObj(cx, modResponse.toObjectOrNull());
	JS::RootedValue dataVal(cx);
	if (!JS_GetProperty(cx, modResponseObj, "data", &dataVal))
		FAIL("data property not in response.");

	// [modobj1, modobj2, ... ]
	if (!dataVal.isObject())
		FAIL("data property not an object");

	JS::RootedObject data(cx, dataVal.toObjectOrNull());
	u32 length;
	if (!JS_IsArrayObject(cx, data) || !JS_GetArrayLength(cx, data, &length) || !length)
		FAIL("data property not an array with at least one element");

	modData.clear();
	modData.reserve(length);

	for (u32 i = 0; i < length; ++i)
	{
		JS::RootedValue el(cx);
		if (!JS_GetElement(cx, data, i, &el) || !el.isObject())
			FAIL("Failed to get array element object");

		modData.emplace_back();

#define COPY_STRINGS(prefix, obj, ...) \
	for (const std::string& prop : { __VA_ARGS__ }) \
	{ \
		std::string val; \
		if (!ScriptInterface::FromJSProperty(cx, obj, prop.c_str(), val)) \
			FAIL("failed to get %s from %s", prop, #obj);\
		modData.back().properties.emplace(prefix+prop, val); \
	}

		// TODO: Currently the homepage field does not contain a non-null value for any entry.
		COPY_STRINGS("", el, "name", "name_id", "summary");

		// Now copy over the modfile part, but without the pointless substructure
		JS::RootedObject elObj(cx, el.toObjectOrNull());
		JS::RootedValue modFile(cx);
		if (!JS_GetProperty(cx, elObj, "modfile", &modFile))
			FAIL("Failed to get modfile data");

		if (!modFile.isObject())
			FAIL("modfile not an object");

		COPY_STRINGS("", modFile, "version", "filesize");

		JS::RootedObject modFileObj(cx, modFile.toObjectOrNull());
		JS::RootedValue filehash(cx);
		if (!JS_GetProperty(cx, modFileObj, "filehash", &filehash))
			FAIL("Failed to get filehash data");

		COPY_STRINGS("filehash_", filehash, "md5");

		JS::RootedValue download(cx);
		if (!JS_GetProperty(cx, modFileObj, "download", &download))
			FAIL("Failed to get download data");

		COPY_STRINGS("", download, "binary_url");

		// Parse metadata_blob (sig+deps)
		std::string metadata_blob;
		if (!ScriptInterface::FromJSProperty(cx, modFile, "metadata_blob", metadata_blob))
			FAIL("failed to get metadata_blob from modFile");

		JS::RootedValue metadata(cx);
		if (!scriptInterface.ParseJSON(metadata_blob, &metadata))
			FAIL("Failed to parse metadata_blob as JSON.");

		if (!metadata.isObject())
			FAIL("metadata_blob not decoded as an object");

		if (!ScriptInterface::FromJSProperty(cx, metadata, "dependencies", modData.back().dependencies))
			FAIL("failed to get dependencies from metadata");

		std::vector<std::string> minisigs;
		if (!ScriptInterface::FromJSProperty(cx, metadata, "minisigs", minisigs))
			FAIL("failed to get minisigs from metadata");

		// Remove this entry if we did not find a valid matching signature
		if (!ParseSignature(minisigs, modData.back().sig, pk, err))
			modData.pop_back();

#undef COPY_STRINGS
	}

	return true;
#undef CLEANUP
}

/**
* Parse signatures to find one that matches the public key, and has a valid global signature.
* Returns true and sets @param sig to the valid matching signature.
*/
bool ModIo::ParseSignature(const std::vector<std::string>& minisigs, SigStruct& sig, const PKStruct& pk, std::string& err)
{
#define CLEANUP() sig = {};
	for (const std::string& file_sig : minisigs)
	{
		// Format of a .minisig file (created using minisign(1) with -SHm file.zip)
		// untrusted comment: .*\nb64sign_of_file\ntrusted comment: .*\nb64sign_of_sign_of_file_and_trusted_comment
		// TODO: Verify that both the untrusted comment and the trusted comment start with the correct prefix

		std::vector<std::string> sig_lines;
		boost::split(sig_lines, file_sig, boost::is_any_of("\n"));
		if (sig_lines.size() < 4)
			FAIL("invalid (too short) sig");

		// We only _really_ care about the second line which is the signature of the file (b64-encoded)
		// Also handling the other signature is nice, but not really required.
		const std::string& msg_sig = sig_lines[1];

		size_t bin_len = 0;
		if (sodium_base642bin((unsigned char*)&sig, sizeof sig, msg_sig.c_str(), msg_sig.size(), NULL, &bin_len, NULL, sodium_base64_VARIANT_ORIGINAL) != 0 || bin_len != sizeof sig)
			FAIL("failed to decode base64 sig");

		cassert(sizeof pk.keynum == sizeof sig.keynum);

		if (memcmp(&sig.sig_alg, "ED", 2) != 0)
			FAIL("only hashed minisign signatures are supported");

		if (memcmp(&pk.keynum, &sig.keynum, sizeof sig.keynum) != 0)
			continue; // mismatched key, try another one

					  // Signature matches our public key

					  // Now verify the global signature (sig || trusted_comment)

		unsigned char global_sig[crypto_sign_BYTES];
		if (sodium_base642bin(global_sig, sizeof global_sig, sig_lines[3].c_str(), sig_lines[3].size(), NULL, &bin_len, NULL, sodium_base64_VARIANT_ORIGINAL) != 0 || bin_len != sizeof global_sig)
			FAIL("failed to decode base64 global_sig");

		const std::string trusted_comment_prefix = "trusted comment: ";
		if (sig_lines[2].size() < trusted_comment_prefix.size())
			FAIL("malformed trusted comment");

		const std::string trusted_comment = sig_lines[2].substr(trusted_comment_prefix.size());

		unsigned char* sig_and_trusted_comment = (unsigned char*)sodium_malloc((sizeof sig.sig) + trusted_comment.size());
		if (!sig_and_trusted_comment)
			FAIL("sodium_malloc failed");

		memcpy(sig_and_trusted_comment, sig.sig, sizeof sig.sig);
		memcpy(sig_and_trusted_comment + sizeof sig.sig, trusted_comment.data(), trusted_comment.size());

		if (crypto_sign_verify_detached(global_sig, sig_and_trusted_comment, (sizeof sig.sig) + trusted_comment.size(), pk.pk) != 0)
		{
			LOGERROR("failed to verify global signature");
			sodium_free(sig_and_trusted_comment);
			return false;
		}

		sodium_free(sig_and_trusted_comment);

		// Valid global sig, and the keynum matches the real one
		return true;
	}

	return false;
#undef CLEANUP
}

#undef FAIL
