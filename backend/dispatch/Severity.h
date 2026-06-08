#ifndef SEVERITY_H
#define SEVERITY_H

#include <string>

enum class IncidentSeverity
{
    LOW,
    MEDIUM,
    HIGH
};

inline IncidentSeverity stringToSeverity(const std::string &sevStr)
{
    if (sevStr == "HIGH" || sevStr == "high")
        return IncidentSeverity::HIGH;
    if (sevStr == "MEDIUM" || sevStr == "medium")
        return IncidentSeverity::MEDIUM;
    return IncidentSeverity::LOW;
}

inline std::string severityToString(IncidentSeverity sev)
{
    switch (sev)
    {
    case IncidentSeverity::HIGH:
        return "HIGH";
    case IncidentSeverity::MEDIUM:
        return "MEDIUM";
    default:
        return "LOW";
    }
}

#endif
