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

// TODO: manage SERVER_STATE
// TODO: use ReplayLogger
// TODO: end the game when somebody won or everybody left
// TODO: start a new game after one finished

// TODO: config option 1: who is allowed to assign? (everyone|first)

// TODO: implement a "bouncer"? the server shall allow 9 clients to be connected. 8 players and one observer slot for the host.
// Maybe the server could list that observer slot as always connected.

#include "NetServer.h"
#include "lobby/IXmppClient.h"
#include "ps/CLogger.h"
#include "ps/ConfigDB.h"

CDedicatedServer* g_DedicatedServer = nullptr;

CDedicatedServer::CDedicatedServer(bool lobby) :
	m_IsHosting(false),
	m_Quit(false),
	m_UseLobby(lobby),
	m_IsLobbyConnected(false)
{
}

CDedicatedServer::~CDedicatedServer()
{
	if (g_XmppClient)
		g_XmppClient->disconnect();

	SAFE_DELETE(g_XmppClient);
}

bool CDedicatedServer::ConnectLobby()
{
	if (m_IsLobbyConnected)
		return true;

	CStr room;
	CStr username;
	CStr passwd;

	CFG_GET_VAL("lobby.room", room);
	CFG_GET_VAL("lobby.login", username);
	CFG_GET_VAL("lobby.password", passwd);

	if (room.empty() || username.empty() || passwd.empty())
	{
		LOGERROR("[HOST] Could not load lobby settings!");
		StopHosting();
		return false;
	}

	LOGERROR("[HOST] Connecting to the lobby");
	g_XmppClient = IXmppClient::create(username, passwd, room, username, 0);
	g_XmppClient->connect();

	return true;
}

void CDedicatedServer::StartHosting()
{
	if (m_UseLobby && !ConnectLobby())
		return;

	LOGERROR("[HOST] Starting dedicated host");

	SAFE_DELETE(g_NetServer);
	g_NetServer = new CNetServer(true);

	if (!g_NetServer->m_Worker->SetupConnection(PS_DEFAULT_PORT))
	{
		LOGERROR("[HOST] Could not setup the connection!");
		StopHosting();
		return;
	}

	m_Quit = false;
	while (!m_Quit)
		HandleInput();
}

void CDedicatedServer::StopHosting()
{
	LOGERROR("[HOST] Shutting down server");

	if (m_IsLobbyConnected)
		g_XmppClient->SendIqUnregisterGame();

	SAFE_DELETE(g_NetServer);

	m_Quit = true;
}

void CDedicatedServer::Restart()
{
	StopHosting();
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

	     if (command == L"/exit")    StopHosting();
	else if (command == L"/quit")    StopHosting();
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

void CDedicatedServer::OnTick()
{
	if (m_UseLobby)
		ParseLobbyMessages();
}

void CDedicatedServer::ParseLobbyMessages()
{
	g_XmppClient->recv();

	ScriptInterface* scriptInterface = g_NetServer->m_Worker->m_ScriptInterface;
	JSContext* cx = scriptInterface->GetContext();
	JSAutoRequest rq(cx);

	// Poll message
	JS::RootedValue message(cx);
	g_XmppClient->GuiPollMessage(*scriptInterface, &message);
	if (message.isUndefined())
		return;

	CStrW type;
	if (scriptInterface->HasProperty(message, "type"))
		scriptInterface->GetProperty(message, "type", type);

	if (type != L"system")
		return;

	CStrW level;
	if (scriptInterface->HasProperty(message, "level"))
		scriptInterface->GetProperty(message, "level", level);

	CStrW text;
	if (scriptInterface->HasProperty(message, "text"))
			scriptInterface->GetProperty(message, "text", text);

	if (level == L"connected")
		OnLobbyConnected();
	else if (level == L"disconnected")
		OnLobbyDisconnected(text);
	else if (level == L"error")
		OnLobbyError(text);
}

void CDedicatedServer::OnLobbyConnected()
{
	m_IsLobbyConnected = true;
	g_XmppClient->SetPresence("playing");
	LOGERROR("[HOST] Connected to the lobby");
}

void CDedicatedServer::OnLobbyDisconnected(CStrW reason)
{
	m_IsLobbyConnected = false;
	// TODO: reconnect, exponential retries
	LOGERROR("[HOST] Disconnected from the lobby: %s", reason.ToUTF8().c_str());
}

void CDedicatedServer::OnLobbyError(CStrW error)
{
	LOGERROR("[HOST] Lobby error %s", error.ToUTF8().c_str());
}

void CDedicatedServer::OnChat(CNetServerSession* session, CChatMessage* message)
{
	LOGERROR("[HOST] %s: %s", utf8_from_wstring(session->GetUserName().c_str()), utf8_from_wstring(message->m_Message));
}

void CDedicatedServer::OnReady(CNetServerSession* session, CReadyMessage* message)
{
	LOGERROR("[HOST] %s is %s", utf8_from_wstring(session->GetUserName().c_str()), message->m_Status ? "ready " : "not ready");
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

void CDedicatedServer::OnUserKicked(CNetServerSession* session, bool banned)
{
	LOGERROR("[HOST] %s has been %s.", utf8_from_wstring(session->GetUserName()), banned ? "banned" : "kicked");
}

void CDedicatedServer::OnUserRejoined(CNetServerSession* session)
{
	LOGERROR("[HOST] %s has finished rejoining.", utf8_from_wstring(g_NetServer->m_Worker->m_PlayerAssignments[session->GetGUID()].m_Name.c_str()));
}

void CDedicatedServer::OnStartGame()
{
	LOGERROR("[HOST] The game has started.");
}
