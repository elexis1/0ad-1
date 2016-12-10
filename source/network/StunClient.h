#ifndef STUNCLIENT_H
#define STUNCLIENT_H

#include "scriptinterface/ScriptInterface.h"

namespace StunClient
{

struct StunEndpoint {
	uint32_t ip;
	uint16_t port;
};

void SendStunRequest(ENetHost* transactionHost, uint32_t targetIp, uint16_t targetPort) {

JS::Value FindStunEndpoint(ScriptInterface& scriptInterface, int port);

StunEndpoint FindStunEndpoint(ENetHost* transactionHost);

}

#endif	// STUNCLIENT_H
