#include "httplib.h"
#include "graph/Graph.h"
#include "resources/ResourceManager.h"
#include "api/Routes.h"
#include "json.hpp"
#include <iostream>
#include <fstream>

using json = nlohmann::json;

bool bootstrapGraph(Graph &g, const std::string &path)
{
    std::ifstream file(path);
    if (!file.is_open())
        return false;
    json j;
    file >> j;
    g.clear();
    for (const auto &edge : j["edges"])
    {
        g.addEdge(edge["source"], edge["target"], edge["weight"]);
    }
    return true;
}

int main()
{
    httplib::Server svr;
    Graph cityGraph;
    ResourceManager rm;

    std::cout << "[SERS Engine Loading System Profiles...]\n";

    // Try both relative paths (run from build/ or from project root)
    bool graphLoaded = bootstrapGraph(cityGraph, "../data/city_map.json");
    if (!graphLoaded)
        graphLoaded = bootstrapGraph(cityGraph, "./data/city_map.json");
    if (!graphLoaded)
    {
        std::cerr << "CRITICAL FAILURE: Vector engine mapping source dropped.\n";
        return -1;
    }

    bool hubsLoaded = rm.loadHubsFromFile("../data/hubs.json");
    if (!hubsLoaded)
        hubsLoaded = rm.loadHubsFromFile("./data/hubs.json");
    if (!hubsLoaded)
    {
        std::cerr << "CRITICAL FAILURE: Primary resource logs are unreadable.\n";
        return -1;
    }

    // Bind API endpoints
    Routes::initialize(svr, cityGraph, rm);

    // Serve Static Frontend
    svr.set_mount_point("/", "C:/SERS/frontend");

    std::cout << "SERS Engine operational on: http://localhost:8080\n";
    svr.listen("0.0.0.0", 8080);
    return 0;
}
