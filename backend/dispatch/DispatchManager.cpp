#include "DispatchManager.h"
#include <limits>

void DispatchManager::getRequirements(IncidentSeverity severity, std::string type, int &outVehicles, int &outBeds)
{
    outBeds = 0;

    if (severity == IncidentSeverity::HIGH)
    {
        outVehicles = 3;
        if (type == "medical")
            outBeds = 3;
    }
    else if (severity == IncidentSeverity::MEDIUM)
    {
        outVehicles = 2;
        if (type == "medical")
            outBeds = 2;
    }
    else // LOW
    {
        outVehicles = 1;
        if (type == "medical")
            outBeds = 1;
    }
}

nlohmann::json DispatchManager::processDispatch(int incidentNode, std::string incidentType, IncidentSeverity severity)
{
    nlohmann::json response;
    int reqVehicles = 0, reqBeds = 0;
    getRequirements(severity, incidentType, reqVehicles, reqBeds);

    EmergencyHub *bestHub = nullptr;
    PathResult bestPath;
    bestPath.total_weight = std::numeric_limits<double>::infinity();
    bestPath.found = false;

    for (auto &hub : resourceManager.getHubs())
    {
        // BUG FIX: Original code only matched type exactly.
        // Police incidents should also accept fire hubs if no police hub available,
        // but for strict matching we keep type filtering and report clearly.
        if (hub.type != incidentType)
            continue;
        if (hub.vehicles < reqVehicles)
            continue;
        // Only check beds for medical hubs
        if (incidentType == "medical" && hub.beds < reqBeds)
            continue;

        PathResult res = Dijkstra::findShortestPath(graph, hub.node_id, incidentNode);
        if (res.found && res.total_weight < bestPath.total_weight)
        {
            bestPath = res;
            bestHub = &hub;
        }
    }

    if (bestHub != nullptr)
    {
        resourceManager.reserveResources(bestHub->id, reqVehicles, reqBeds);
        response["status"] = "success";
        response["assigned_hub"] = bestHub->name;
        response["hub_id"] = bestHub->id;
        response["hub_lat"] = bestHub->lat;
        response["hub_lng"] = bestHub->lng;
        response["estimated_time"] = bestPath.total_weight;
        response["route"] = bestPath.path;
        response["resources_deployed"] = {{"vehicles", reqVehicles}, {"beds", reqBeds}};
        response["severity"] = severityToString(severity);
        response["incident_type"] = incidentType;
    }
    else
    {
        // BUG FIX: Provide descriptive error — distinguish no hub vs no resources
        bool anyHubOfType = false;
        for (const auto &hub : resourceManager.getHubs())
        {
            if (hub.type == incidentType)
            {
                anyHubOfType = true;
                break;
            }
        }
        response["status"] = "error";
        if (!anyHubOfType)
            response["message"] = "No hub of type '" + incidentType + "' registered in system.";
        else
            response["message"] = "All " + incidentType + " hubs are at capacity or unreachable from incident location.";
    }

    return response;
}
