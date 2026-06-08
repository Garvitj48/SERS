#include "Graph.h"

void Graph::addEdge(int source, int target, double weight)
{
    adjList[source].push_back({target, weight});
    adjList[target].push_back({source, weight}); // Undirected city road networks
}

const std::vector<Edge> &Graph::getNeighbors(int node) const
{
    static const std::vector<Edge> empty;
    auto it = adjList.find(node);
    if (it != adjList.end())
    { 
        return it->second;
    }
    return empty;
}

bool Graph::hasNode(int node) const
{
    return adjList.find(node) != adjList.end();
}

void Graph::clear()
{
    adjList.clear();
}

std::vector<int> Graph::getAllNodes() const
{
    std::vector<int> nodes;
    for (const auto &pair : adjList)
    {
        nodes.push_back(pair.first);
    }
    return nodes;
}
