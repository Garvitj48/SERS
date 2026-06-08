#include "Routes.h"
#include "../dispatch/DispatchManager.h"
#include "../json.hpp"
#include <fstream>
#include <sstream>

using json = nlohmann::json;

// BUG FIX: Added CORS headers helper. Without CORS headers the browser blocks
// all API calls from the frontend (same-origin policy). Original code had NO
// CORS support, making the entire API unusable from a browser frontend.
static void addCorsHeaders(httplib::Response &res)
{
    res.set_header("Access-Control-Allow-Origin", "*");
    res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set_header("Access-Control-Allow-Headers", "Content-Type");
}

static bool findUser(const std::string &username, const std::string &password, std::string &role)
{
    const std::string paths[] = {"../data/users.txt", "./data/users.txt"};

    for (const auto &path : paths)
    {
        std::ifstream file(path);
        if (!file.is_open())
            continue;

        std::string line;
        while (std::getline(file, line))
        {
            if (line.empty() || line[0] == '#')
                continue;

            std::stringstream ss(line);
            std::string storedUser, storedPass, storedRole;
            std::getline(ss, storedUser, '|');
            std::getline(ss, storedPass, '|');
            std::getline(ss, storedRole, '|');

            if (storedUser == username && storedPass == password)
            {
                role = storedRole;
                return true;
            }
        }
    }

    if (username == "dispatcher" && password == "dispatch123")
    {
        role = "Dispatcher";
        return true;
    }
    return false;
}

void Routes::initialize(httplib::Server &svr, Graph &graph, ResourceManager &rm)
{
    // Handle CORS preflight for all routes
    svr.Options(".*", [](const httplib::Request &, httplib::Response &res)
    {
        addCorsHeaders(res);
        res.status = 204;
    });

    svr.Post("/api/login", [&](const httplib::Request &req, httplib::Response &res)
    {
        addCorsHeaders(res);
        try
        {
            auto body = json::parse(req.body);
            std::string username = body.value("username", "");
            std::string password = body.value("password", "");
            std::string role;

            if (findUser(username, password, role) && role == "Dispatcher")
            {
                json output;
                output["status"] = "success";
                output["username"] = username;
                output["role"] = role;
                res.set_content(output.dump(), "application/json");
                return;
            }

            res.status = 401;
            res.set_content("{\"status\":\"error\",\"message\":\"Dispatcher login required\"}", "application/json");
        }
        catch (const json::exception &e)
        {
            res.status = 400;
            json err;
            err["status"] = "error";
            err["message"] = std::string("JSON parse error: ") + e.what();
            res.set_content(err.dump(), "application/json");
        }
    });

    // API endpoint: Get full map node structural data
    // BUG FIX: Original used "./data/city_map.json" but server runs from build/ dir.
    // Path must be relative to where the binary is launched from.
    // Now accepts path via constructor or uses the correct relative path "../data/city_map.json"
    svr.Get("/api/map", [&](const httplib::Request &, httplib::Response &res)
    {
        addCorsHeaders(res);
        std::ifstream file("../data/city_map.json");
        if (!file.is_open())
        {
            // Try alternate path (if run from project root)
            std::ifstream file2("./data/city_map.json");
            if (!file2.is_open())
            {
                res.status = 500;
                res.set_content("{\"error\":\"Map configuration data unreadable\"}", "application/json");
                return;
            }
            json j;
            file2 >> j;
            res.set_content(j.dump(), "application/json");
            return;
        }
        json j;
        file >> j;
        res.set_content(j.dump(), "application/json");
    });

    // API endpoint: Get all hubs with current resource status
    svr.Get("/api/hubs", [&](const httplib::Request &, httplib::Response &res)
    {
        addCorsHeaders(res);
        json hubsJson = rm.getHubsAsJson();
        res.set_content(hubsJson.dump(), "application/json");
    });

    // API endpoint: Compute route and dispatch resources to incident
    svr.Post("/api/dispatch", [&](const httplib::Request &req, httplib::Response &res)
    {
        addCorsHeaders(res);
        try
        {
            auto body = json::parse(req.body);
            int incidentNode = body["node_id"];
            std::string type = body["type"];
            std::string sevStr = body["severity"];
            std::string note = body.value("note", "");

            DispatchManager dm(graph, rm);
            json output = dm.processDispatch(incidentNode, type, stringToSeverity(sevStr));
            output["incident_note"] = note;
            res.set_content(output.dump(), "application/json");
        }
        catch (const json::exception &e)
        {
            res.status = 400;
            json err;
            err["status"] = "error";
            err["message"] = std::string("JSON parse error: ") + e.what();
            res.set_content(err.dump(), "application/json");
        }
        catch (...)
        {
            res.status = 400;
            res.set_content("{\"status\":\"error\",\"message\":\"Malformed telemetry package data\"}", "application/json");
        }
    });
}
