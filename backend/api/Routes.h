#ifndef ROUTES_H
#define ROUTES_H

#include "../httplib.h"
#include "../graph/Graph.h"
#include "../resources/ResourceManager.h"

class Routes
{
public:
    static void initialize(httplib::Server &svr, Graph &graph, ResourceManager &rm);
};

#endif
