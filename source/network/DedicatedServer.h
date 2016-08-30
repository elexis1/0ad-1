/* Copyright (C) 2016 Wildfire Games.
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

// TODO: some ifndef define NETSERVER_H ?

#include "NetServer.h"
#include "NetSession.h"
#include "NetMessage.h"

#include "scriptinterface/ScriptInterface.h"

/**
 * Contains only network functions, no gamesetup.
 */
class CDedicatedServer
{
	NONCOPYABLE(CDedicatedServer);

private:
	friend class NetServer;
	friend class NetServerWorker;
	friend class DedicatedServer_Gamesetup;

	/**
	 * Whether or not the service is actually running.
	 */
	bool m_IsHosting;

	/**
	 * Whether or not we wan't to exit the server.
	 */
	bool m_Quit;

	/**
	 * Processes command-line-interface keystrokes.
	 */
	void HandleInput();

public: // TODO: can we make this private?

	CDedicatedServer();
	~CDedicatedServer();

	/**
	 * Create the host. Starts listening on UDP port 20595 for player connects.
	 */
	void StartHosting();

	/**
	 * Exit gracefully and safely disconnect all clients.
	 */
	void Shutdown();

	/**
	 * Exit gracefully and host a fresh instance.
	 */
	void Restart();

	/*
	 * Sends the given text message to either a client (if session was provided)
	 * or broadcasts to all clients otherwise.
	 */
	void SendChat(CNetServerSession* session, CStrW text, bool log = false);

	/*
	 * Sends the given text message to either a client (if session was provided)
	 * or broadcasts to all clients otherwise.
	 */
	void SendPublicChat(CStrW text, bool log = true);

	/*
	 * Searches for commands in the given commandline text-input.
	 */
	void ParseHostCommand(CStrW input);

	/*
	 * Should not be called after before all players are ready.
	 */
	void StartGame();

	/**
	 * Called by periodically CNetServerWorker::Run().
	 * Can be used to process asynchronously while the main thread is waiting for user input.
	 */
	void OnTick();

	/**
	 * Useless as we didn't authenticate the client yet.
	 */
	void OnUserJoin(CNetServerSession* session);

	/**
	 * A player has joined the gamesetup.
	 */
	void OnGamesetupJoin(CNetServerSession* session);

	/**
	 * Updates the player assignments.
	 */
	void OnUserLeave(CNetServerSession* session);

	/**
	 * Lets the users chose their own civs and team numbers.
	 */
	void OnChat(CNetServerSession* session, CChatMessage* message);

	/**
	 * Called whenever the server updated its settings.
	 */
	void OnUpdateGameAttributes();

	/**
	 * Starts the game if all players are ready.
	 */
	void OnReady(CNetServerSession* session, CReadyMessage* message);

	/**
	 * Used for logging only.
	 */
	void OnStartGame();

	/**
	 * Used for logging only.
	 */
	void OnUserRejoining(CNetServerSession* session);

	/**
	 * Used for logging only.
	 */
	void OnUserRejoined(CNetServerSession* session);
};

extern CDedicatedServer *g_DedicatedServer;
