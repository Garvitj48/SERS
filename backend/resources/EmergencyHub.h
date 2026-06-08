#ifndef EMERGENCYHUB_H
#define EMERGENCYHUB_H

#include <string>

// BUG FIX: Added "police" as a valid hub type.
// Original only handled "medical" and "fire" in DispatchManager logic
// but had no type constants defined, making validation impossible.
struct EmergencyHub
{
    int id;
    std::string name;
    int node_id;
    std::string type; // Valid types: "medical", "fire", "police"
    int vehicles;
    int beds;        // Only relevant for medical hubs; set to 0 for fire/police
    int officers;    // Only relevant for police hubs; set to 0 for others
    double lat;
    double lng;
};

#endif
