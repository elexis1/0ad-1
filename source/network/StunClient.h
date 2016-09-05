#ifndef STUNCLIENT_H
#define STUNCLIENT_H

#include "scriptinterface/ScriptInterface.h"

namespace StunClient
{

JS::Value FindStunEndpoint(ScriptInterface& scriptInterface, int port);

}

#endif	// STUNCLIENT_H
