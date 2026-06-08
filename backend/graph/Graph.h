#ifndef GRAPH_H
#define GRAPH_H

#include <vector>
#include <unordered_map>
#include <string>

struct Edge
{
    int target;
    double weight;
};

class Graph
{
public:
    void addEdge(int source, int target, double weight);
    const std::vector<Edge> &getNeighbors(int node) const;
    bool hasNode(int node) const;
    void clear();
    std::vector<int> getAllNodes() const;

private:
    std::unordered_map<int, std::vector<Edge>> adjList;
};

#endif
