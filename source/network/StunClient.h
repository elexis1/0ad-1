#ifndef STUNCLIENT_H
#define STUNCLIENT_H

#include "scriptinterface/ScriptInterface.h"

namespace StunClient
{

struct StunEndpoint {
	uint32_t ip;
	uint16_t port;
};

JS::Value FindStunEndpoint(ScriptInterface& scriptInterface, int port);

StunEndpoint FindStunEndpoint(ENetHost* transactionHost);

}

#endif	// STUNCLIENT_H
