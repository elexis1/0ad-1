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

#ifndef INCLUDED_MODINSTALLER
#define INCLUDED_MODINSTALLER

#include "lib/file/vfs/vfs.h"
#include "scriptinterface/ScriptInterface.h"

/**
 * Install a mod into the mods directory.
 */
class CModInstaller
{
public:
	/**
	 * Initialise the mod installer for processing the given mod.
	 *
	 * @param modsdir path to the data directory, containing mods
	 * @param tempdir path to a writable directory for temporary files
	 */
	CModInstaller(const OsPath& modsdir, const OsPath& tempdir);

	~CModInstaller();

	/**
	 * Do all the processing and unpacking.
	 * @param mod path of .pyromod file of mod
	 */
	void Install(const OsPath& mod);

private:

	PIVFS m_VFS;
	OsPath m_ModsDir;
	OsPath m_TempDir;
	VfsPath m_CacheDir;

	std::shared_ptr<ScriptRuntime> m_ScriptRuntime;
};

#endif // INCLUDED_MODINSTALLER
