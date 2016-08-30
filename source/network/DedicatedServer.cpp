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

// TODO: use lobby
// TODO: manage SERVER_STATE
// TODO: we should let the clients chose their civs and team numbers (but nothing else) via the regular GUI elements
// TODO: use ReplayLogger
// TODO: end the game when somebody won or everybody left
// TODO: start a new game after one finished

// TODO: config option 1: who is allowed to assign? (everyone|first)
// TODO: config option 2: autocontrol pop limit ? (yes|no)

// TODO: implement a "bouncer"? the server shall allow 9 clients to be connected. 8 players and one observer slot for the host.
// Maybe the server could list that observer slot as always connected.

// TODO: #include "precompiled.h" ??
//#include "DedicatedServer.h"
#include "NetServer.h"
#include "ps/CLogger.h"

CDedicatedServer* g_DedicatedServer = nullptr;

CDedicatedServer::CDedicatedServer()
: m_IsHosting(false), m_Quit(false)
{
}

CDedicatedServer::~CDedicatedServer()
{
}

void CDedicatedServer::StartHosting()
{
	LOGERROR("[HOST] Starting dedicated host");

	g_NetServer = new CNetServer(true);

	if (!g_NetServer->m_Worker->SetupConnection(PS_DEFAULT_PORT))
	{
		LOGERROR("[HOST] Could not setup the connection!");
		Shutdown();
		return;
	}

	m_Quit = false;
	while (!m_Quit)
		HandleInput();
}

void CDedicatedServer::Shutdown()
{
	LOGERROR("[HOST] Shutting down server");
	delete g_NetServer;
	m_Quit = true;
}

void CDedicatedServer::Restart()
{
	Shutdown();
	StartHosting();
}

void CDedicatedServer::HandleInput()
{
	CStrW input;
	std::wcin >> input;

	if (input.at(0) == L'/')
		ParseHostCommand(input);
	else
		SendPublicChat(input);
}

void CDedicatedServer::ParseHostCommand(CStrW input)
{
	CStrW command = input.substr(0, input.find(L" "));

	     if (command == L"/exit")    Shutdown();
	else if (command == L"/quit")    Shutdown();
	else if (command == L"/restart") Restart();
	// TODO: else if (command == "/shutdown 60") will shutdown in 60 minutes
	// TODO: else if (command == "/list")
	// TODO: else if (command == "/kick")
	// TODO: else if (command == "/ban")
}

void CDedicatedServer::SendChat(CNetServerSession* session, CStrW text, bool log)
{
	CChatMessage* message = new CChatMessage();
	message->m_GUID = "-1";
	message->m_Message = text;

	if (session)
		session->SendMessage(message);
	else
		g_NetServer->m_Worker->Broadcast(message);

	if (log)
		LOGERROR("[HOST] <host>: %s", utf8_from_wstring(text));
}

void CDedicatedServer::SendPublicChat(CStrW text, bool log)
{
	SendChat(nullptr, text, log);
}

void CDedicatedServer::StartGame()
{
	// TODO: return if not everybody is ready
	g_NetServer->m_Worker->StartGame();
}

void CDedicatedServer::OnTick()
{
}

void CDedicatedServer::OnChat(CNetServerSession* session, CChatMessage* message)
{
	LOGERROR("[HOST] %s: %s", utf8_from_wstring(session->GetUserName().c_str()), utf8_from_wstring(message->m_Message));
	// TODO: say something if the name of the host is mentioned?
}

void CDedicatedServer::OnReady(CNetServerSession* session, CReadyMessage* message)
{
	LOGERROR("[HOST] %s is %s", utf8_from_wstring(session->GetUserName().c_str()), message->m_Status ? "ready " : "not ready");
	//StartGame();
}

void CDedicatedServer::OnUserJoin(CNetServerSession* session)
{
	LOGERROR("[HOST] Authenticating %s [%s]", utf8_from_wstring(session->GetUserName()).c_str(), session->GetIPAddressString().c_str());
}

void CDedicatedServer::OnGamesetupJoin(CNetServerSession* session)
{
	LOGERROR("[HOST] %s has joined the gamesetup.", utf8_from_wstring(session->GetUserName()).c_str());
}

void CDedicatedServer::OnUserLeave(CNetServerSession* session)
{
	LOGERROR("[HOST] %s has left", utf8_from_wstring(session->GetUserName()));
}

void CDedicatedServer::OnUpdateGameAttributes()
{
	LOGERROR("[HOST] Updated game attributes");
}

void CDedicatedServer::OnUserRejoining(CNetServerSession* session)
{
	LOGERROR("[HOST] %s is starting to rejoin the match.", utf8_from_wstring(g_NetServer->m_Worker->m_PlayerAssignments[session->GetGUID()].m_Name.c_str()));
}

void CDedicatedServer::OnUserRejoined(CNetServerSession* session)
{
	LOGERROR("[HOST] %s has finished rejoining.", utf8_from_wstring(g_NetServer->m_Worker->m_PlayerAssignments[session->GetGUID()].m_Name.c_str()));
}

void CDedicatedServer::OnStartGame()
{
	LOGERROR("[HOST] The game has started.");
}
