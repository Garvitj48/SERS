#include "ResourceManager.h"
#include <fstream>
#include <iostream>
#include "../json.hpp"

using json = nlohmann::json;

bool ResourceManager::loadHubsFromFile(const std::string &filepath)
{
    std::ifstream file(filepath);
    if (!file.is_open())
        return false;

    json j;
    file >> j;
    hubs.clear();

    for (const auto &item : j)
    {
        EmergencyHub hub;
        hub.id = item["id"];
        hub.name = item["name"];
        hub.node_id = item["node_id"];
        hub.type = item["type"];
        hub.vehicles = item["vehicles"];
        // BUG FIX: beds and officers are optional fields.
        // Original code would throw if "beds" key missing for non-medical hubs.
        hub.beds = item.contains("beds") ? (int)item["beds"] : 0;
        hub.officers = item.contains("officers") ? (int)item["officers"] : 0;
        hub.lat = item.contains("lat") ? (double)item["lat"] : 0.0;
        hub.lng = item.contains("lng") ? (double)item["lng"] : 0.0;
        hubs.push_back(hub);
    }
    return true;
}

std::vector<EmergencyHub> &ResourceManager::getHubs()
{
    return hubs;
}

EmergencyHub *ResourceManager::findHubById(int id)
{
    for (auto &hub : hubs)
    {
        if (hub.id == id)
            return &hub;
    }
    return nullptr;
}

bool ResourceManager::reserveResources(int hubId, int requiredVehicles, int requiredBeds)
{
    EmergencyHub *hub = findHubById(hubId);
    if (!hub)
        return false;

    // BUG FIX: Original code checked beds >= requiredBeds even for fire/police hubs
    // where beds=0 and requiredBeds=0. This worked by accident but is fragile.
    // Now explicitly only check beds for medical hubs.
    if (hub->vehicles < requiredVehicles)
        return false;
    if (hub->type == "medical" && hub->beds < requiredBeds)
        return false;

    hub->vehicles -= requiredVehicles;
    if (hub->type == "medical")
        hub->beds -= requiredBeds;

    return true;
}

bool ResourceManager::releaseResources(int hubId, int vehicles, int beds)
{
    EmergencyHub *hub = findHubById(hubId);
    if (!hub)
        return false;
    hub->vehicles += vehicles;
    hub->beds += beds;
    return true;
}

json ResourceManager::getHubsAsJson() const
{
    json arr = json::array();
    for (const auto &hub : hubs)
    {
        json h;
        h["id"] = hub.id;
        h["name"] = hub.name;
        h["node_id"] = hub.node_id;
        h["type"] = hub.type;
        h["vehicles"] = hub.vehicles;
        h["beds"] = hub.beds;
        h["officers"] = hub.officers;
        h["lat"] = hub.lat;
        h["lng"] = hub.lng;
        arr.push_back(h);
    }
    return arr;
}
