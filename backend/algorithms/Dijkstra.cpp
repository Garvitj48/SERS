#include "Dijkstra.h"
#include <queue>
#include <unordered_map>
#include <algorithm>
#include <limits>

PathResult Dijkstra::findShortestPath(const Graph &graph, int start, int end)
{
    PathResult result;
    result.found = false;
    result.total_weight = std::numeric_limits<double>::infinity();

    // BUG FIX: Check start==end FIRST, before node existence checks.
    // Original code checked hasNode first, causing incorrect early return
    // when start==end but neither node existed in graph.
    if (start == end)
    {
        result.found = true;
        result.total_weight = 0;
        result.path = {start};
        return result;
    }

    if (!graph.hasNode(start) || !graph.hasNode(end))
    {
        return result; // unreachable nodes → not found
    }

    std::unordered_map<int, double> distances;
    std::unordered_map<int, int> parent;

    // Priority Queue configured as a Min-Heap for shortest pathway evaluation
    std::priority_queue<std::pair<double, int>,
                        std::vector<std::pair<double, int>>,
                        std::greater<std::pair<double, int>>>
        pq;

    distances[start] = 0.0;
    pq.push({0.0, start});

    while (!pq.empty())
    {
        double dist = pq.top().first;
        int u = pq.top().second;
        pq.pop();

        if (u == end)
        {
            result.found = true;
            result.total_weight = dist;
            break;
        }

        if (dist > distances[u])
            continue;

        for (const auto &edge : graph.getNeighbors(u))
        {
            int v = edge.target;
            double weight = edge.weight;

            if (distances.find(v) == distances.end() || distances[u] + weight < distances[v])
            {
                distances[v] = distances[u] + weight;
                parent[v] = u;
                pq.push({distances[v], v});
            }
        }
    }

    if (result.found)
    {
        int curr = end;
        while (curr != start)
        {
            result.path.push_back(curr);
            if (parent.find(curr) == parent.end()) {
                // Broken path — should not happen if graph is consistent
                result.found = false;
                result.path.clear();
                return result;
            }
            curr = parent[curr];
        }
        result.path.push_back(start);
        std::reverse(result.path.begin(), result.path.end());
    }

    return result;
}
