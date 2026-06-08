cmake_minimum_required(VERSION 3.15)
project(sers_engine CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# On Windows, link ws2_32 for socket support (httplib requirement)
if(WIN32)
    set(EXTRA_LIBS ws2_32)
endif()

add_executable(sers_engine
    main.cpp
    graph/Graph.cpp
    algorithms/Dijkstra.cpp
    dispatch/DispatchManager.cpp
    resources/ResourceManager.cpp
    api/Routes.cpp
)

target_include_directories(sers_engine PRIVATE ${CMAKE_CURRENT_SOURCE_DIR})

target_link_libraries(sers_engine ${EXTRA_LIBS})

# Copy data directory to build location
add_custom_command(TARGET sers_engine POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_directory
    "${CMAKE_SOURCE_DIR}/../data"
    "$<TARGET_FILE_DIR:sers_engine>/../data"
)
