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

#include "lib/self_test.h"

#include "ps/ModIo.h"
#include "ps/CLogger.h"
#include "scriptinterface/ScriptInterface.h"

#include <sodium.h>

class TestModIo : public CxxTest::TestSuite
{
public:
	void setUp()
	{
		if (sodium_init() < 0)
			LOGERROR("failed to initialize libsodium");
	}

	void test_id_parsing()
	{
		ScriptInterface script("Test", "Test", g_ScriptRuntime);

		// TODO: One could probably fuzz this parsing function nicely to make sure it handles
		//       malformed input nicely.

#define TS_ASSERT_PARSE(input, expected_error, expected_id) \
	{ \
		TestLogger logger; \
		int id = -1; \
		TS_ASSERT(!ModIo::ParseGameIdResponse(script, input, id)); \
		TS_ASSERT_STR_CONTAINS(logger.GetOutput(), expected_error); \
		TS_ASSERT_EQUALS(id, expected_id); \
	}

		// Various malformed inputs
		TS_ASSERT_PARSE("", "Failed to parse response as JSON", -1);
		TS_ASSERT_PARSE("()", "Failed to parse response as JSON", -1);
		TS_ASSERT_PARSE("[]", "data property not an object", -1);
		TS_ASSERT_PARSE("null", "response not an object", -1);
		TS_ASSERT_PARSE("{}", "data property not an object", -1);
		TS_ASSERT_PARSE("{\"data\": null}", "data property not an object", -1);
		TS_ASSERT_PARSE("{\"data\": {}}", "data property not an array with at least one element", -1);
		TS_ASSERT_PARSE("{\"data\": []}", "data property not an array with at least one element", -1);
		TS_ASSERT_PARSE("{\"data\": [null]}", "couldn't get id", -1);
		TS_ASSERT_PARSE("{\"data\": [false]}", "couldn't get id", -1);
		TS_ASSERT_PARSE("{\"data\": [{}]}", "couldn't get id", -1);
		TS_ASSERT_PARSE("{\"data\": [[]]}", "couldn't get id", -1);

		// TODO: These only return -1 since we set id to that when we fail.
		//       This should actually not be needed, but our parsing code does strange things.
		TS_ASSERT_PARSE("{\"data\": [{\"id\": null}]}", "couldn't get id", -1);
		TS_ASSERT_PARSE("{\"data\": [{\"id\": {}}]}", "couldn't get id", -1);
		TS_ASSERT_PARSE("{\"data\": [{\"id\": -12}]}", "couldn't get id", -1);
		TS_ASSERT_PARSE("{\"data\": [{\"id\": 0}]}", "couldn't get id", -1);

		// TODO: This should fail, but our parsing code just warns in case we pass something of the wrong
		//       type, instead of failing.
		TS_ASSERT_PARSE("{\"data\": [{\"id\": true}]}", "couldn't get id", -1); // TODO: This fails since parsing is bogus.

#undef TS_ASSERT_PARSE

		// Correctly formed input
		{
			TestLogger logger;
			int id = -1;
			TS_ASSERT(ModIo::ParseGameIdResponse(script, "{\"data\": [{\"id\": 42}]}", id));
			TS_ASSERT_STR_NOT_CONTAINS(logger.GetOutput(), "ERROR");
			TS_ASSERT_EQUALS(id, 42);
		}
	}

	void test_mods_parsing()
	{
		ScriptInterface script("Test", "Test", g_ScriptRuntime);

		PKStruct pk;

		const std::string pk_str = "RWTA6VIoth2Q1PFLsRILr3G7NB+mwwO8BSGoXs63X6TQgNGM4cE8Pvd6";

		size_t bin_len = 0;
		if (sodium_base642bin((unsigned char*)&pk, sizeof pk, pk_str.c_str(), pk_str.size(), NULL, &bin_len, NULL, sodium_base64_VARIANT_ORIGINAL) != 0 || bin_len != sizeof pk)
			LOGERROR("failed to decode base64 public key");

#define TS_ASSERT_PARSE(input, expected_error) \
	{ \
		TestLogger logger; \
		std::vector<ModIoModData> mods; \
		TS_ASSERT(!ModIo::ParseModsResponse(script, input, mods, pk)); \
		TS_ASSERT_STR_CONTAINS(logger.GetOutput(), expected_error); \
		TS_ASSERT_EQUALS(mods.size(), 0); \
	}

		TS_ASSERT_PARSE("", "Failed to parse response as JSON.");
		TS_ASSERT_PARSE("()", "Failed to parse response as JSON.");
		TS_ASSERT_PARSE("null", "response not an object");
		TS_ASSERT_PARSE("[]", "data property not an object");
		TS_ASSERT_PARSE("{}", "data property not an object");
		TS_ASSERT_PARSE("{\"data\": null}", "data property not an object");
		TS_ASSERT_PARSE("{\"data\": {}}", "data property not an array with at least one element");
		TS_ASSERT_PARSE("{\"data\": []}", "data property not an array with at least one element");
		TS_ASSERT_PARSE("{\"data\": [null]}", "Failed to get array element object");
		TS_ASSERT_PARSE("{\"data\": [false]}", "Failed to get array element object");
		TS_ASSERT_PARSE("{\"data\": [true]}", "Failed to get array element object");
		TS_ASSERT_PARSE("{\"data\": [{}]}", "failed to get name from el");
		TS_ASSERT_PARSE("{\"data\": [[]]}", "failed to get name from el");
		TS_ASSERT_PARSE("{\"data\": [{\"foo\":\"bar\"}]}", "failed to get name from el");

		TS_ASSERT_PARSE("{\"data\": [{\"name\":null}]}", "failed to get name_id from el"); // also some script value conversion check warning
		TS_ASSERT_PARSE("{\"data\": [{\"name\":42}]}", "failed to get name_id from el"); // no conversion warning, but converting numbers to strings and vice-versa seems ok
		TS_ASSERT_PARSE("{\"data\": [{\"name\":false}]}", "failed to get name_id from el"); // also some script value conversion check warning
		TS_ASSERT_PARSE("{\"data\": [{\"name\":{}}]}", "failed to get name_id from el"); // also some script value conversion check warning
		TS_ASSERT_PARSE("{\"data\": [{\"name\":[]}]}", "failed to get name_id from el"); // also some script value conversion check warning
		TS_ASSERT_PARSE("{\"data\": [{\"name\":\"foobar\"}]}", "failed to get name_id from el");

		TS_ASSERT_PARSE("{\"data\": [{\"name\":\"\",\"name_id\":\"\",\"summary\":\"\"}]}", "modfile not an object");
		TS_ASSERT_PARSE("{\"data\": [{\"name\":\"\",\"name_id\":\"\",\"summary\":\"\",\"modfile\":null}]}", "modfile not an object");
		TS_ASSERT_PARSE("{\"data\": [{\"name\":\"\",\"name_id\":\"\",\"summary\":\"\",\"modfile\":[]}]}", "failed to get version from modFile");
		TS_ASSERT_PARSE("{\"data\": [{\"name\":\"\",\"name_id\":\"\",\"summary\":\"\",\"modfile\":{}}]}", "failed to get version from modFile");

		TS_ASSERT_PARSE("{\"data\": [{\"name\":\"\",\"name_id\":\"\",\"summary\":\"\",\"modfile\":{\"version\":null}}]}", "failed to get filesize from modFile"); // also some script value conversion check warning
		TS_ASSERT_PARSE("{\"data\": [{\"name\":\"\",\"name_id\":\"\",\"summary\":\"\",\"modfile\":{\"version\":\"\",\"filesize\":1234}}]}", "failed to get md5 from filehash");

		TS_ASSERT_PARSE("{\"data\": [{\"name\":\"\",\"name_id\":\"\",\"summary\":\"\",\"modfile\":{\"version\":\"\",\"filesize\":1234, \"filehash\":null}}]}", "failed to get md5 from filehash");
		TS_ASSERT_PARSE("{\"data\": [{\"name\":\"\",\"name_id\":\"\",\"summary\":\"\",\"modfile\":{\"version\":\"\",\"filesize\":1234, \"filehash\":{}}}]}", "failed to get md5 from filehash");
		TS_ASSERT_PARSE("{\"data\": [{\"name\":\"\",\"name_id\":\"\",\"summary\":\"\",\"modfile\":{\"version\":\"\",\"filesize\":1234, \"filehash\":{\"md5\":null}}}]}", "failed to get binary_url from download"); // also some script value conversion check warning
		TS_ASSERT_PARSE("{\"data\": [{\"name\":\"\",\"name_id\":\"\",\"summary\":\"\",\"modfile\":{\"version\":\"\",\"filesize\":1234, \"filehash\":{\"md5\":\"abc\"}}}]}", "failed to get binary_url from download");

		TS_ASSERT_PARSE("{\"data\": [{\"name\":\"\",\"name_id\":\"\",\"summary\":\"\",\"modfile\":{\"version\":\"\",\"filesize\":1234, \"filehash\":{\"md5\":\"abc\"}, \"download\":null}}]}", "failed to get binary_url from download"); // also some script value conversion check warning
		TS_ASSERT_PARSE("{\"data\": [{\"name\":\"\",\"name_id\":\"\",\"summary\":\"\",\"modfile\":{\"version\":\"\",\"filesize\":1234, \"filehash\":{\"md5\":\"abc\"}, \"download\":{\"binary_url\":null}}}]}", "failed to get metadata_blob from modFile"); // also some script value conversion check warning
		TS_ASSERT_PARSE("{\"data\": [{\"name\":\"\",\"name_id\":\"\",\"summary\":\"\",\"modfile\":{\"version\":\"\",\"filesize\":1234, \"filehash\":{\"md5\":\"abc\"}, \"download\":{\"binary_url\":\"\"}}}]}", "failed to get metadata_blob from modFile");

		TS_ASSERT_PARSE("{\"data\": [{\"name\":\"\",\"name_id\":\"\",\"summary\":\"\",\"modfile\":{\"version\":\"\",\"filesize\":1234, \"filehash\":{\"md5\":\"abc\"}, \"download\":{\"binary_url\":\"\"},\"metadata_blob\":null}}]}", "metadata_blob not decoded as an object");
		TS_ASSERT_PARSE("{\"data\": [{\"name\":\"\",\"name_id\":\"\",\"summary\":\"\",\"modfile\":{\"version\":\"\",\"filesize\":1234, \"filehash\":{\"md5\":\"abc\"}, \"download\":{\"binary_url\":\"\"},\"metadata_blob\":\"\"}}]}", "Failed to parse metadata_blob as JSON");

		TS_ASSERT_PARSE("{\"data\": [{\"name\":\"\",\"name_id\":\"\",\"summary\":\"\",\"modfile\":{\"version\":\"\",\"filesize\":1234, \"filehash\":{\"md5\":\"abc\"}, \"download\":{\"binary_url\":\"\"},\"metadata_blob\":\"{}\"}}]}", "failed to get dependencies from metadata");
		TS_ASSERT_PARSE("{\"data\": [{\"name\":\"\",\"name_id\":\"\",\"summary\":\"\",\"modfile\":{\"version\":\"\",\"filesize\":1234, \"filehash\":{\"md5\":\"abc\"}, \"download\":{\"binary_url\":\"\"},\"metadata_blob\":\"{\\\"dependencies\\\":null}\"}}]}", "failed to get dependencies from metadata");
		TS_ASSERT_PARSE("{\"data\": [{\"name\":\"\",\"name_id\":\"\",\"summary\":\"\",\"modfile\":{\"version\":\"\",\"filesize\":1234, \"filehash\":{\"md5\":\"abc\"}, \"download\":{\"binary_url\":\"\"},\"metadata_blob\":\"{\\\"dependencies\\\":[]}\"}}]}", "failed to get minisigs from metadata");
		TS_ASSERT_PARSE("{\"data\": [{\"name\":\"\",\"name_id\":\"\",\"summary\":\"\",\"modfile\":{\"version\":\"\",\"filesize\":1234, \"filehash\":{\"md5\":\"abc\"}, \"download\":{\"binary_url\":\"\"},\"metadata_blob\":\"{\\\"dependencies\\\":[],\\\"minisigs\\\":null}\"}}]}", "failed to get minisigs from metadata");

#undef TS_ASSERT_PARSE

		// Correctly formed input, but no signature matching the public key
		// Thus all such mods/modfiles are not added, thus we get 0 parsed mods.
		{
			TestLogger logger;
			std::vector<ModIoModData> mods;
			TS_ASSERT(ModIo::ParseModsResponse(script, "{\"data\": [{\"name\":\"\",\"name_id\":\"\",\"summary\":\"\",\"modfile\":{\"version\":\"\",\"filesize\":1234, \"filehash\":{\"md5\":\"abc\"}, \"download\":{\"binary_url\":\"\"},\"metadata_blob\":\"{\\\"dependencies\\\":[],\\\"minisigs\\\":[]}\"}}]}", mods, pk));
			TS_ASSERT_STR_NOT_CONTAINS(logger.GetOutput(), "ERROR");
			TS_ASSERT_EQUALS(mods.size(), 0);
		}

		// Correctly formed input (with a signature matching the public key above, and a valid global signature)
		{
			TestLogger logger;
			std::vector<ModIoModData> mods;
			TS_ASSERT(ModIo::ParseModsResponse(script, "{\"data\": [{\"name\":\"\",\"name_id\":\"\",\"summary\":\"\",\"modfile\":{\"version\":\"\",\"filesize\":1234, \"filehash\":{\"md5\":\"abc\"}, \"download\":{\"binary_url\":\"\"},\"metadata_blob\":\"{\\\"dependencies\\\":[],\\\"minisigs\\\":[\\\"untrusted comment: signature from minisign secret key\\\\nRUTA6VIoth2Q1HUg5bwwbCUZPcqbQ/reLXqxiaWARH5PNcwxX5vBv/mLPLgdxGsIrOyK90763+rCVTmjeYx5BDz8C0CIbGZTNQs=\\\\ntrusted comment: timestamp:1517285433\\\\tfile:tm.zip\\\\nTHwNMhK4Ogj6XA4305p1K9/ouP/DrxPcDFrPaiu+Ke6/WGlHIzBZHvmHWUedvsK6dzL31Gk8YNzscKWnZqWNCw==\\\"]}\"}}]}", mods, pk));
			TS_ASSERT_STR_NOT_CONTAINS(logger.GetOutput(), "ERROR");
			TS_ASSERT_EQUALS(mods.size(), 1);
		}
	}

	void test_signature_parsing()
	{
		PKStruct pk;

		const std::string pk_str = "RWTA6VIoth2Q1PFLsRILr3G7NB+mwwO8BSGoXs63X6TQgNGM4cE8Pvd6";

		size_t bin_len = 0;
		if (sodium_base642bin((unsigned char*)&pk, sizeof pk, pk_str.c_str(), pk_str.size(), NULL, &bin_len, NULL, sodium_base64_VARIANT_ORIGINAL) != 0 || bin_len != sizeof pk)
			LOGERROR("failed to decode base64 public key");


		// No invalid signature at all (silent failure)
#define TS_ASSERT_PARSE_SILENT_FAILURE(input) \
	{ \
		TestLogger logger; \
		SigStruct sig; \
		TS_ASSERT(!ModIo::ParseSignature({input}, sig, pk)); \
		TS_ASSERT_STR_NOT_CONTAINS(logger.GetOutput(), "ERROR"); \
	}

#define TS_ASSERT_PARSE(input, expected_error) \
	{ \
		TestLogger logger; \
		SigStruct sig; \
		TS_ASSERT(!ModIo::ParseSignature({input}, sig, pk)); \
		TS_ASSERT_STR_CONTAINS(logger.GetOutput(), expected_error); \
	}

		TS_ASSERT_PARSE_SILENT_FAILURE();

		TS_ASSERT_PARSE("", "invalid (too short) sig");
		TS_ASSERT_PARSE("\n\n\n", "failed to decode base64 sig");
		TS_ASSERT_PARSE("\nZm9vYmFyCg==\n\n", "failed to decode base64 sig");
		TS_ASSERT_PARSE("\nRWTA6VIoth2Q1HUg5bwwbCUZPcqbQ/reLXqxiaWARH5PNcwxX5vBv/mLPLgdxGsIrOyK90763+rCVTmjeYx5BDz8C0CIbGZTNQs=\n\n", "only hashed minisign signatures are supported");

		// Silent failure again this one has the wrong keynum
		TS_ASSERT_PARSE_SILENT_FAILURE("\nRUTA5VIoth2Q1HUg5bwwbCUZPcqbQ/reLXqxiaWARH5PNcwxX5vBv/mLPLgdxGsIrOyK90763+rCVTmjeYx5BDz8C0CIbGZTNQs=\n\n");

		TS_ASSERT_PARSE("\nRUTA6VIoth2Q1HUg5bwwbCUZPcqbQ/reLXqxiaWARH5PNcwxX5vBv/mLPLgdxGsIrOyK90763+rCVTmjeYx5BDz8C0CIbGZTNQs=\n\n", "failed to decode base64 global_sig");
		TS_ASSERT_PARSE("\nRUTA6VIoth2Q1HUg5bwwbCUZPcqbQ/reLXqxiaWARH5PNcwxX5vBv/mLPLgdxGsIrOyK90763+rCVTmjeYx5BDz8C0CIbGZTNQs=\n\nTHwNMhK4Ogj6XA4305p1K9/ouP/DrxPcDFrPaiu+Ke6/WGlHIzBZHvmHWUedvsK6dzL31Gk8YNzscKWnZqWNCw==", "malformed trusted comment");

		// TODO: Test for both the untrusted comment and the trusted comment to actually start with that

		TS_ASSERT_PARSE("\nRUTA6VIoth2Q1HUg5bwwbCUZPcqbQ/reLXqxiaWARH5PNcwxX5vBv/mLPLgdxGsIrOyK90763+rCVTmjeYx5BDz8C0CIbGZTNQs=\ntrusted comment: timestamp:1517285433\tfile:tm.zip\nAHwNMhK4Ogj6XA4305p1K9/ouP/DrxPcDFrPaiu+Ke6/WGlHIzBZHvmHWUedvsK6dzL31Gk8YNzscKWnZqWNCw==", "failed to verify global signature");

		// Valid signature
		{
			TestLogger logger;
			SigStruct sig;
			TS_ASSERT(ModIo::ParseSignature({"\nRUTA6VIoth2Q1HUg5bwwbCUZPcqbQ/reLXqxiaWARH5PNcwxX5vBv/mLPLgdxGsIrOyK90763+rCVTmjeYx5BDz8C0CIbGZTNQs=\ntrusted comment: timestamp:1517285433\tfile:tm.zip\nTHwNMhK4Ogj6XA4305p1K9/ouP/DrxPcDFrPaiu+Ke6/WGlHIzBZHvmHWUedvsK6dzL31Gk8YNzscKWnZqWNCw=="}, sig, pk));
			TS_ASSERT_STR_NOT_CONTAINS(logger.GetOutput(), "ERROR");
		}

#undef TS_ASSERT_PARSE_SILENT_FAILURE
#undef TS_ASSERT_PARSE
	}
};
