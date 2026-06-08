#ifndef DIJKSTRA_H
#define DIJKSTRA_H

#include "../graph/Graph.h"
#include <vector>

struct PathResult
{
    double total_weight;
    std::vector<int> path;
    bool found;
};

class Dijkstra
{
public:
    static PathResult findShortestPath(const Graph &graph, int start, int end);
};

#endif
