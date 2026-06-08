#ifndef RESOURCE_MANAGER_H
#define RESOURCE_MANAGER_H

#include "EmergencyHub.h"
#include "../json.hpp"
#include <vector>
#include <string>

class ResourceManager
{
public:
    bool loadHubsFromFile(const std::string &filepath);
    std::vector<EmergencyHub> &getHubs();
    EmergencyHub *findHubById(int id);
    bool reserveResources(int hubId, int requiredVehicles, int requiredBeds);
    bool releaseResources(int hubId, int vehicles, int beds);
    nlohmann::json getHubsAsJson() const;

private:
    std::vector<EmergencyHub> hubs;
};

#endif
