# Smart Emergency Response System (SERS)

Smart Emergency Response System (SERS) is a C++ based emergency dispatch application designed to allocate the nearest and most suitable emergency service hub for an incident. The system supports medical, fire, and police emergencies and uses Dijkstra's shortest path algorithm to find the optimal route between the dispatch hub and incident location.

The project includes a C++ backend server, REST APIs, file-based data storage, and an interactive web frontend using Leaflet Maps and OpenStreetMap.

---

## Features

- Dispatcher login system
- Emergency incident reporting
- Medical, fire, and police incident support
- Severity-based resource calculation
- Dijkstra shortest path algorithm for route optimization
- Automatic emergency hub selection
- Resource-aware dispatching based on vehicles, beds, and officers
- Interactive map visualization using Leaflet.js
- Incident marker and emergency hub markers
- Optimal route display on map
- Estimated arrival time calculation
- Vehicle movement animation from hub to incident location
- Dispatch log tracking
- Persistent storage using JSON and text files

---

## Tech Stack

### Backend

- C++
- CMake
- cpp-httplib
- nlohmann/json
- File handling using `fstream`
- Dijkstra's algorithm using priority queue

### Frontend

- HTML
- CSS
- JavaScript
- Leaflet.js
- OpenStreetMap

### Data Storage

- JSON files
- Text files

---

## Project Structure

```text
SERS/
│
├── backend/
│   ├── main.cpp
│   ├── CMakeLists.txt
│   ├── httplib.h
│   ├── json.hpp
│   │
│   ├── graph/
│   │   ├── Graph.h
│   │   ├── Graph.cpp
│   │   └── Node.h
│   │
│   ├── algorithms/
│   │   ├── Dijkstra.h
│   │   └── Dijkstra.cpp
│   │
│   ├── dispatch/
│   │   ├── DispatchManager.h
│   │   ├── DispatchManager.cpp
│   │   └── Severity.h
│   │
│   ├── resources/
│   │   ├── EmergencyHub.h
│   │   ├── ResourceManager.h
│   │   └── ResourceManager.cpp
│   │
│   └── api/
│       ├── Routes.h
│       └── Routes.cpp
│
├── frontend/
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── main.js
│       ├── map.js
│       └── dispatch.js
│
└── data/
    ├── city_map.json
    ├── hubs.json
    └── users.txt

# SERS – Smart Emergency Response System

## How to Run the Project

### 1. Open the Project

Open the project folder in VS Code:
C:\SERS
---

### 2. Build the Backend

Open a new terminal in VS Code and run:

```bash
cd C:\SERS\backend
cmake --build build --config Debug
```

---

### 3. Start the Server

```bash
cd C:\SERS\backend\build
.\Debug\sers_engine.exe
```

If the server starts successfully, you will see:
SERS Engine operational on: http://localhost:8080
> Keep this terminal running.

---

### 4. Open the Application

Open your browser and visit:
http://localhost:8080

---

### 5. Login

Use the dispatcher credentials:

| Field    | Value        |
|----------|--------------|
| Username | dispatcher   |
| Password | dispatch123  |

---

## How to Use

1. **Select the emergency type:**
   - Medical
   - Fire
   - Police

2. **Select severity:**
   - LOW
   - MEDIUM
   - HIGH

3. **Select incident location** from the dropdown or click a node on the map.

4. **Add an incident note** if required.

5. Click **Dispatch Emergency**.

The system will display:
- Assigned emergency hub
- Estimated arrival time
- Required resources
- Shortest route on map
- Vehicle movement animation
- Dispatch log

---

## Main APIs

| Method | Endpoint       | Description                    |
|--------|----------------|--------------------------------|
| POST   | /api/login     | Dispatcher login               |
| GET    | /api/map       | Fetch city map data            |
| GET    | /api/hubs      | Fetch emergency hub and resource data |
| POST   | /api/dispatch  | Dispatch emergency service     |

---

## Login Details

| Field    | Value        |
|----------|--------------|
| Username | dispatcher   |
| Password | dispatch123  |
| Role     | Dispatcher   |

---

## Data Files

| File           | Purpose                                        |
|----------------|------------------------------------------------|
| city_map.json  | Stores city nodes and road connections         |
| hubs.json      | Stores hospital, fire station, and police hub details |
| users.txt      | Stores dispatcher login credentials            |

---

## Key Libraries Used

| Library           | Purpose                              |
|-------------------|--------------------------------------|
| cpp-httplib       | Backend HTTP server                  |
| nlohmann/json     | JSON handling                        |
| Leaflet.js        | Interactive maps                     |
| OpenStreetMap     | Map tiles                            |
| C++ STL           | `vector`, `queue`, `fstream`, `sstream` and other standard utilities |
