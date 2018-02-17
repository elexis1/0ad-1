/* Copyright (C) 2017 Wildfire Games.
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

#include "ModInstaller.h"

#include "lib/file/vfs/vfs_util.h"
#include "ps/Filesystem.h"
#include "ps/XML/Xeromyces.h"

#include <boost/filesystem/operations.hpp>
#include <fstream>

CModInstaller::CModInstaller(const OsPath& modsdir, const OsPath& tempdir) :
	m_ModsDir(modsdir), m_TempDir(tempdir / "_modscache"), m_CacheDir("cache/")
{
	m_VFS = CreateVfs();

	CreateDirectories(m_TempDir, 0700);

	const int runtimeSize = 8 * MiB;
	const int heapGrowthBytesGCTrigger = 1 * MiB;
	m_ScriptRuntime = ScriptInterface::CreateRuntime(std::shared_ptr<ScriptRuntime>(), runtimeSize, heapGrowthBytesGCTrigger);
}

CModInstaller::~CModInstaller()
{
	m_VFS.reset();

	m_ScriptRuntime.reset();

	DeleteDirectory(m_TempDir);
}

void CModInstaller::Install(const OsPath& mod)
{
#define BOOST_WARN_IF_FAIL(expression) try { (expression); } catch (boost::filesystem::filesystem_error& ex) { debug_printf("%s", ex.what()); }

	const OsPath modTemp = m_TempDir / mod.Basename() / mod.Filename().ChangeExtension(L".zip");
	CreateDirectories(modTemp.Parent(), 0700);

	BOOST_WARN_IF_FAIL(boost::filesystem::copy_file(mod.string8(), modTemp.string8(), boost::filesystem::copy_option::overwrite_if_exists));
	
	// Load the mod to VFS
	if (m_VFS->Mount(m_CacheDir, m_TempDir / "") != INFO::OK)
		return;
	CVFSFile modinfo;
	PSRETURN modinfo_status = modinfo.Load(m_VFS, m_CacheDir / modTemp.Basename() / "mod.json", false);
	m_VFS->Clear();
	if (modinfo_status != PSRETURN_OK)
		return;

	// Extract the name of the mod
	ScriptInterface scriptInterface("Engine", "ModInstaller", m_ScriptRuntime);
	JSContext* cx = scriptInterface.GetContext();
	JS::RootedValue json_val(cx);
	if (!scriptInterface.ParseJSON(modinfo.GetAsString(), &json_val))
		return;
	JS::RootedObject json_obj(cx, json_val.toObjectOrNull());
	JS::RootedValue name_val(cx);
	if (!JS_GetProperty(cx, json_obj, "name", &name_val))
		return;
	std::string modName;
	ScriptInterface::FromJSVal(cx, name_val, modName);
	if (modName.empty())
		return;

	const OsPath modDir = m_ModsDir / modName;
	const OsPath modPath = modDir / (modName + ".zip");
	
	// Create a directory with the next structure:
	//   mod-name/
	//   +mod-name.zip
	CreateDirectories(modDir, 0700);
	BOOST_WARN_IF_FAIL(boost::filesystem::rename(modTemp.string8(), modPath.string8()));
	DeleteDirectory(modTemp.Parent());

#ifdef OS_WIN
	std::ofstream mod_json((modDir / "mod.json").string8());
	if (mod_json.good())
	{
		mod_json << modinfo.GetAsString();
		mod_json.close();
	}
#endif
	
	// Remove the original file
	BOOST_WARN_IF_FAIL(boost::filesystem::remove(mod.string8()));
#undef BOOST_WARN_IF_FAIL
}
