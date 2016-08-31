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

	/*
	 * Whether or not to advertize the game in the multiplayer lobby.
	 */
	bool m_UseLobby;

	/**
	 * Whether or not we are currently connected to the multiplayer lobby.
	 */
	bool m_IsLobbyConnected;

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

	CDedicatedServer(bool lobby);
	~CDedicatedServer();

	/**
	 * Starts the XmppClient and joins the room with the credentials from the current config.
	 * Returns true if successful.
	 */
	bool ConnectLobby();

	/**
	 * Fetches the most recent Xmpp updates and triggers according events.
	 */
	void ParseLobbyMessages();

	/**
	 * Create the host. Starts listening on the specified UDP port for player connects.
	 */
	void StartHosting();

	/**
	 * Exit gracefully and safely disconnect all clients.
	 */
	void StopHosting();

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

	/**
	 * Called by periodically CNetServerWorker::Run().
	 * Can be used to process asynchronously while the main thread is waiting for user input.
	 */
	void OnTick();

	/*
	 * Called when the xmpp userlist has been downloaded.
	 */
	void OnLobbyConnected();

	/**
	 * Called after losing the Xmpp connection.
	 */
	void OnLobbyDisconnected(CStrW reason);

	/**
	 * Notifies the host.
	 */
	void OnLobbyError(CStrW error);

	/**
	 * Notifies the host.
	 */
	void OnUserKicked(CNetServerSession* session, bool banned);

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
