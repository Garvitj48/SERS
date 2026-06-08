#ifndef DISPATCH_MANAGER_H
#define DISPATCH_MANAGER_H

#include "../graph/Graph.h"
#include "../resources/ResourceManager.h"
#include "../algorithms/Dijkstra.h"
#include "Severity.h"
#include "../json.hpp"

class DispatchManager
{
public:
    DispatchManager(Graph &g, ResourceManager &rm) : graph(g), resourceManager(rm) {}
    nlohmann::json processDispatch(int incidentNode, std::string incidentType, IncidentSeverity severity);

private:
    Graph &graph;
    ResourceManager &resourceManager;
    void getRequirements(IncidentSeverity severity, std::string type, int &outVehicles, int &outBeds);
};

#endif
