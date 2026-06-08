// map.js — SERS Leaflet Map Controller
// Manages real map rendering, node markers, hub markers, route drawing

const SERSMap = (() => {
  let map = null;
  let nodeMarkers = {};
  let hubMarkers = {};
  let routeLayer = null;
  let routeShadowLayer = null;
  let incidentMarker = null;
  let vehicleMarker = null;
  let vehicleTimer = null;
  let mapData = null;
  let hubsData = null;

  // Node geo-coordinates (matches city_map.json)
  const NODE_COORDS = {
    0:  [30.3242, 78.0432],
    1:  [30.3158, 78.0322],
    2:  [30.3400, 78.0524],
    3:  [30.3053, 78.0217],
    4:  [30.3322, 78.0680],
    5:  [30.3175, 78.0523],
    6:  [30.3265, 78.0260],
    7:  [30.3480, 78.0380],
    8:  [30.3700, 78.1020],
    9:  [30.2920, 78.0100],
  };

  function init() {
    map = L.map('map', {
      center: [30.3265, 78.0432],
      zoom: 13,
      zoomControl: true,
    });

    // OpenStreetMap tiles (dark theme applied via CSS filter)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    return map;
  }

  function makeNodeIcon(color = '#6b7280', size = 12) {
    return L.divIcon({
      className: '',
      html: `<div style="
        width:${size}px;height:${size}px;
        border-radius:50%;
        background:${color};
        border:2px solid #fff;
        box-shadow:0 2px 8px rgba(0,0,0,0.5);
        cursor:pointer;
        transition:transform 0.15s;
      "></div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  }

  function makeHubIcon(type) {
    const colors = { medical: '#58a6ff', fire: '#f97316', police: '#a78bfa' };
    const emojis = { medical: '🏥', fire: '🔥', police: '🚔' };
    const color = colors[type] || '#6b7280';
    const emoji = emojis[type] || '⚠️';
    return L.divIcon({
      className: '',
      html: `<div style="
        width:36px;height:36px;border-radius:8px;
        background:rgba(10,12,15,0.92);
        border:2px solid ${color};
        display:flex;align-items:center;justify-content:center;
        font-size:18px;
        box-shadow:0 4px 16px rgba(0,0,0,0.6), 0 0 12px ${color}44;
        cursor:pointer;
      ">${emoji}</div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
  }

  function makeIncidentIcon(type) {
    const emojis = { medical: '🚑', fire: '🚒', police: '🚨' };
    const emoji = emojis[type] || '⚠️';
    return L.divIcon({
      className: '',
      html: `<div style="
        width:44px;height:44px;border-radius:50%;
        background:rgba(248,81,73,0.15);
        border:3px solid #f85149;
        display:flex;align-items:center;justify-content:center;
        font-size:22px;
        box-shadow:0 0 20px rgba(248,81,73,0.5);
        animation:pulse-ring 1s ease-in-out infinite alternate;
      ">${emoji}</div>
      <style>@keyframes pulse-ring{from{box-shadow:0 0 10px rgba(248,81,73,0.4)}to{box-shadow:0 0 30px rgba(248,81,73,0.8)}}</style>`,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });
  }

  function makeVehicleIcon(type) {
    const labels = { medical: 'AMB', fire: 'FIRE', police: 'PCR' };
    const colors = { medical: '#58a6ff', fire: '#f97316', police: '#a78bfa' };
    const color = colors[type] || '#58a6ff';
    return L.divIcon({
      className: '',
      html: `<div class="vehicle-marker" style="border-color:${color};box-shadow:0 0 18px ${color}66;">
        <span>${labels[type] || 'UNIT'}</span>
      </div>`,
      iconSize: [46, 24],
      iconAnchor: [23, 12],
    });
  }

  function renderNodes(nodes, edges, onNodeClick) {
    // Draw edges first
    if (edges) {
      edges.forEach(edge => {
        const from = NODE_COORDS[edge.source];
        const to = NODE_COORDS[edge.target];
        if (from && to) {
          L.polyline([from, to], {
            color: '#21262d',
            weight: 3,
            opacity: 0.8,
          }).addTo(map);
        }
      });
    }

    // Draw node markers
    if (nodes) {
      nodes.forEach(node => {
        const id = typeof node === 'object' ? node.id : node;
        const label = typeof node === 'object' ? node.label : `Node ${id}`;
        const coords = NODE_COORDS[id];
        if (!coords) return;

        const marker = L.marker(coords, { icon: makeNodeIcon('#6b7280', 14) })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:'Space Mono',monospace;font-size:12px;">
              <div style="color:#8b949e;font-size:10px;margin-bottom:4px;">NODE ${id}</div>
              <div style="font-weight:700;color:#e6edf3;">${label}</div>
              <div style="color:#58a6ff;margin-top:6px;cursor:pointer;" onclick="SERSMap.selectNode(${id})">📍 Set as Incident Location</div>
            </div>
          `, { closeOnClick: false });

        marker.on('click', () => {
          if (typeof onNodeClick === 'function') onNodeClick(id, label);
        });

        nodeMarkers[id] = marker;
      });
    }
  }

  function renderHubs(hubs) {
    // Clear old hub markers
    Object.values(hubMarkers).forEach(m => m.remove());
    hubMarkers = {};

    hubs.forEach(hub => {
      const coords = hub.lat && hub.lng ? [hub.lat, hub.lng] : NODE_COORDS[hub.node_id];
      if (!coords) return;

      const colors = { medical: '#58a6ff', fire: '#f97316', police: '#a78bfa' };
      const marker = L.marker(coords, { icon: makeHubIcon(hub.type) })
        .addTo(map)
        .bindPopup(`
          <div style="font-family:'Space Mono',monospace;font-size:12px;min-width:160px;">
            <div style="color:${colors[hub.type]||'#8b949e'};font-size:10px;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.1em;">${hub.type} hub</div>
            <div style="font-weight:700;color:#e6edf3;margin-bottom:8px;">${hub.name}</div>
            <div style="color:#8b949e;">🚗 Vehicles: <span style="color:#e6edf3;">${hub.vehicles}</span></div>
            ${hub.beds > 0 ? `<div style="color:#8b949e;">🛏 Beds: <span style="color:#e6edf3;">${hub.beds}</span></div>` : ''}
            ${hub.officers > 0 ? `<div style="color:#8b949e;">👮 Officers: <span style="color:#e6edf3;">${hub.officers}</span></div>` : ''}
          </div>
        `);

      hubMarkers[hub.id] = marker;
    });
  }

  function drawRoute(pathNodeIds, dispatchType) {
    // Remove old route
    clearRoute();

    const coords = pathNodeIds
      .map(id => NODE_COORDS[id])
      .filter(Boolean);

    if (coords.length < 2) return;

    const colors = { medical: '#58a6ff', fire: '#f97316', police: '#a78bfa' };
    const color = colors[dispatchType] || '#3fb950';

    // Shadow line
    routeShadowLayer = L.polyline(coords, { color: '#000', weight: 10, opacity: 0.45 }).addTo(map);

    // Main route
    routeLayer = L.polyline(coords, {
      color: color,
      weight: 6,
      opacity: 1,
      className: 'route-animated',
    }).addTo(map);
    routeLayer.bringToFront();

    // Fit map to show route
    map.fitBounds(L.latLngBounds(coords).pad(0.3));
  }

  function clearRoute() {
    stopVehicle();
    if (routeShadowLayer) {
      routeShadowLayer.remove();
      routeShadowLayer = null;
    }
    if (routeLayer) {
      routeLayer.remove();
      routeLayer = null;
    }
  }

  function stopVehicle() {
    if (vehicleTimer) {
      clearInterval(vehicleTimer);
      vehicleTimer = null;
    }
    if (vehicleMarker) {
      vehicleMarker.remove();
      vehicleMarker = null;
    }
  }

  function interpolatePoint(coords, progress) {
    if (coords.length === 1) return coords[0];

    const distances = [];
    let totalDistance = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      const from = coords[i];
      const to = coords[i + 1];
      const distance = Math.hypot(to[0] - from[0], to[1] - from[1]);
      distances.push(distance);
      totalDistance += distance;
    }

    let targetDistance = totalDistance * progress;
    let index = 0;
    while (index < distances.length - 1 && targetDistance > distances[index]) {
      targetDistance -= distances[index];
      index++;
    }

    const local = distances[index] === 0 ? 0 : targetDistance / distances[index];
    const from = coords[index];
    const to = coords[index + 1];
    return [
      from[0] + (to[0] - from[0]) * local,
      from[1] + (to[1] - from[1]) * local,
    ];
  }

  function animateVehicle(pathNodeIds, dispatchType, estimatedMinutes, onProgress, onComplete) {
    stopVehicle();
    const outboundCoords = pathNodeIds.map(id => NODE_COORDS[id]).filter(Boolean);
    if (outboundCoords.length < 2) return;

    const returnCoords = outboundCoords.slice(0, -1).reverse();
    const coords = outboundCoords.concat(returnCoords);
    const oneWayDurationMs = Math.max(1000, estimatedMinutes * 60000);
    const durationMs = oneWayDurationMs * 2;
    const startedAt = Date.now();

    vehicleMarker = L.marker(outboundCoords[0], {
      icon: makeVehicleIcon(dispatchType),
      zIndexOffset: 1400,
      interactive: false,
    }).addTo(map);

    function step() {
      const progress = Math.min((Date.now() - startedAt) / durationMs, 1);
      vehicleMarker.setLatLng(interpolatePoint(coords, progress));
      const phase = progress < 0.5 ? 'outbound' : 'returning';
      if (typeof onProgress === 'function') onProgress(progress, phase);

      if (progress >= 1) {
        clearInterval(vehicleTimer);
        vehicleTimer = null;
        if (typeof onComplete === 'function') onComplete();
      }
    }

    step();
    vehicleTimer = setInterval(step, 50);
  }

  function setIncidentMarker(nodeId, type) {
    if (incidentMarker) {
      incidentMarker.remove();
      incidentMarker = null;
    }
    const coords = NODE_COORDS[nodeId];
    if (!coords) return;
    incidentMarker = L.marker(coords, { icon: makeIncidentIcon(type), zIndexOffset: 1000 })
      .addTo(map)
      .bindPopup(`<div style="font-family:'Space Mono',monospace;font-size:12px;"><b style="color:#f85149;">⚠️ INCIDENT</b><br>Node ${nodeId}</div>`)
      .openPopup();
  }

  function highlightNode(nodeId, active) {
    if (!nodeMarkers[nodeId]) return;
    nodeMarkers[nodeId].setIcon(makeNodeIcon(active ? '#ef4444' : '#6b7280', active ? 18 : 14));
  }

  function selectNode(nodeId) {
    // Called from popup link — route to main.js handler
    if (window.SERSMain && window.SERSMain.onNodeSelected) {
      window.SERSMain.onNodeSelected(nodeId);
    }
  }

  function flyTo(nodeId) {
    const coords = NODE_COORDS[nodeId];
    if (coords) map.flyTo(coords, 15, { duration: 1.2 });
  }

  return { init, renderNodes, renderHubs, drawRoute, clearRoute, setIncidentMarker, highlightNode, selectNode, flyTo, animateVehicle, NODE_COORDS };
})();

window.SERSMap = SERSMap;
