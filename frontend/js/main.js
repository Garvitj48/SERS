// main.js — SERS Application Orchestrator

const SERSMain = (() => {
  let selectedNodeId = null;
  let selectedType = 'medical';
  let selectedSeverity = 'MEDIUM';
  let mapData = null;
  let hubsData = null;
  let dispatchLog = [];
  let currentUser = null;

  // ── DOM refs ──
  const $ = id => document.getElementById(id);
  const statusEl     = $('systemStatus');
  const nodeSelect   = $('nodeSelect');
  const dispatchBtn  = $('dispatchBtn');
  const responseSection = $('responseSection');
  const responseCard = $('responseCard');
  const hubList      = $('hubList');
  const logList      = $('logList');
  const incidentNote = $('incidentNote');
  const loginScreen  = $('loginScreen');
  const loginForm    = $('loginForm');
  const loginBtn     = $('loginBtn');
  const loginError   = $('loginError');
  const authRole     = $('authRole');
  const logoutBtn    = $('logoutBtn');

  // ── Node labels (matches city_map.json) ──
  const NODE_LABELS = {
    0: 'Clock Tower',
    1: 'ISBT Dehradun',
    2: 'Rajpur Road',
    3: 'Patel Nagar',
    4: 'Ballupur Chowk',
    5: 'Karanpur',
    6: 'Race Course',
    7: 'GMS Road',
    8: 'Sahastradhara',
    9: 'Clement Town',
  };

  function setStatus(state, text) {
    statusEl.className = `header-status ${state}`;
    statusEl.querySelector('.status-text').textContent = text;
  }

  function formatArrivalTime(etaMinutes) {
    const arrival = new Date(Date.now() + etaMinutes * 60000);
    return arrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function setAuthenticated(user) {
    if (user.role !== 'Dispatcher') {
      throw new Error('Dispatcher login required');
    }
    currentUser = user;
    sessionStorage.setItem('sersUser', JSON.stringify(user));
    document.body.classList.remove('auth-locked');
    loginScreen.style.display = 'none';
    authRole.textContent = `${user.role}: ${user.username}`;
  }

  function requireAuth() {
    const saved = sessionStorage.getItem('sersUser');
    if (saved) {
      try {
        const user = JSON.parse(saved);
        if (user.role === 'Dispatcher') {
          setAuthenticated(user);
          return true;
        }
      } catch {
      }
      sessionStorage.removeItem('sersUser');
    }
    document.body.classList.add('auth-locked');
    loginScreen.style.display = 'grid';
    return false;
  }

  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    loginError.textContent = '';
    loginBtn.classList.add('loading');
    loginBtn.innerHTML = '<span class="dispatch-icon">...</span> Signing In';

    try {
      const form = new FormData(loginForm);
      const user = await SERSDispatch.login(
        String(form.get('username') || '').trim(),
        String(form.get('password') || '')
      );
      setAuthenticated(user);
      await init();
    } catch (err) {
      loginError.textContent = err.message || 'Login failed';
    } finally {
      loginBtn.classList.remove('loading');
      loginBtn.innerHTML = '<span class="dispatch-icon">&gt;</span> Sign In';
    }
  });

  logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('sersUser');
    location.reload();
  });

  // ── Type selector ──
  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedType = btn.dataset.type;
    });
  });

  // ── Severity selector ──
  document.querySelectorAll('.sev-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sev-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedSeverity = btn.dataset.sev;
    });
  });

  // ── Node dropdown ──
  nodeSelect.addEventListener('change', () => {
    const val = parseInt(nodeSelect.value);
    if (!isNaN(val)) onNodeSelected(val);
  });

  function onNodeSelected(nodeId) {
    // Deselect old
    if (selectedNodeId !== null) {
      SERSMap.highlightNode(selectedNodeId, false);
    }
    selectedNodeId = nodeId;
    nodeSelect.value = nodeId;
    SERSMap.highlightNode(nodeId, true);
    SERSMap.clearRoute();
    dispatchBtn.disabled = false;

    // Clear previous result
    responseSection.style.display = 'none';
    responseCard.innerHTML = '';
  }

  // ── Dispatch ──
  dispatchBtn.addEventListener('click', async () => {
    if (selectedNodeId === null) return;

    dispatchBtn.classList.add('loading');
    dispatchBtn.innerHTML = '<span class="dispatch-icon">⏳</span> Dispatching...';

    try {
      const result = await SERSDispatch.dispatch(
        selectedNodeId,
        selectedType,
        selectedSeverity,
        incidentNote.value.trim()
      );
      handleDispatchResult(result);

      // Refresh hub list after dispatch (resources change)
      await loadHubs();
    } catch (err) {
      handleDispatchResult({ status: 'error', message: `Network error: ${err.message}` });
    } finally {
      dispatchBtn.classList.remove('loading');
      dispatchBtn.innerHTML = '<span class="dispatch-icon">⚡</span> Dispatch Emergency';
    }
  });

  function handleDispatchResult(result) {
    responseSection.style.display = 'block';
    const isSuccess = result.status === 'success';

    responseCard.className = `response-card ${isSuccess ? 'success' : 'error'}`;

    if (isSuccess) {
      const etaMin = result.estimated_time ? result.estimated_time.toFixed(1) : '—';
      const missionEta = result.estimated_time ? (result.estimated_time * 2).toFixed(1) : '—';
      const routeStr = result.route ? result.route.join(' → ') : '—';
      const vehicles = result.resources_deployed?.vehicles ?? 0;
      const beds = result.resources_deployed?.beds ?? 0;
      const note = result.incident_note || incidentNote.value.trim();
      const safeNote = escapeHtml(note);

      responseCard.innerHTML = `
        <div class="response-field">
          <span class="response-key">Status</span>
          <span class="response-val green">✓ DISPATCHED</span>
        </div>
        <div class="response-field">
          <span class="response-key">Hub</span>
          <span class="response-val blue">${result.assigned_hub}</span>
        </div>
        <div class="response-field">
          <span class="response-key">ETA</span>
          <span class="response-val orange">${etaMin} min</span>
        </div>
        <div class="response-field">
          <span class="response-key">Full Trip</span>
          <span class="response-val orange">${missionEta} min</span>
        </div>
        <div class="response-field">
          <span class="response-key">Arrival</span>
          <span class="response-val blue">${formatArrivalTime(Number(etaMin) || 0)}</span>
        </div>
        ${note ? `
        <div class="incident-note-card">
          <div class="incident-note-label">Incident Note</div>
          <div class="incident-note-text">${safeNote}</div>
        </div>
        ` : ''}
        <div class="response-field">
          <span class="response-key">Vehicles</span>
          <span class="response-val">${vehicles}</span>
        </div>
        ${beds > 0 ? `<div class="response-field"><span class="response-key">Beds Reserved</span><span class="response-val">${beds}</span></div>` : ''}
        <div class="response-field">
          <span class="response-key">Route</span>
          <span class="response-val" style="font-size:10px;">${routeStr}</span>
        </div>
        <div class="dispatch-progress">
          <div class="dispatch-progress-head">
            <span id="vehiclePhaseText">To incident</span>
            <span id="vehicleProgressText">0%</span>
          </div>
          <div class="dispatch-progress-track">
            <div class="dispatch-progress-fill" id="vehicleProgressFill"></div>
          </div>
          <div class="dispatch-countdown" id="vehicleCountdown">Starting route...</div>
        </div>
      `;

      // Draw route on map
      if (result.route && result.route.length > 0) {
        SERSMap.drawRoute(result.route, selectedType);
        SERSMap.setIncidentMarker(selectedNodeId, selectedType);
        SERSMap.animateVehicle(
          result.route,
          selectedType,
          Number(result.estimated_time) || 0,
          (progress, phase) => {
            const percent = Math.min(100, progress * 100);
            const percentLabel = percent < 10 ? percent.toFixed(1) : Math.round(percent);
            const fill = $('vehicleProgressFill');
            const text = $('vehicleProgressText');
            const phaseText = $('vehiclePhaseText');
            const countdown = $('vehicleCountdown');
            if (fill) fill.style.width = `${percent}%`;
            if (text) text.textContent = `${percentLabel}%`;
            if (phaseText) phaseText.textContent = phase === 'returning' ? 'Returning to hub' : 'To incident';
            if (countdown) {
              const fullTripSeconds = Math.max(1, (Number(result.estimated_time) || 0) * 120);
              const remainingSeconds = Math.max(0, Math.ceil(fullTripSeconds * (1 - progress)));
              const minutes = Math.floor(remainingSeconds / 60);
              const seconds = String(remainingSeconds % 60).padStart(2, '0');
              countdown.textContent = `Mission time remaining ${minutes}:${seconds}`;
            }
          },
          () => {
            const text = $('vehicleProgressText');
            const phaseText = $('vehiclePhaseText');
            const countdown = $('vehicleCountdown');
            if (text) text.textContent = 'Arrived';
            if (phaseText) phaseText.textContent = 'Returned to hub';
            if (countdown) countdown.textContent = 'Mission completed';
            addLog('success', `${selectedType.toUpperCase()} unit completed mission and returned to ${result.assigned_hub}`);
          }
        );
      }

      addLog('success', `${selectedType.toUpperCase()} | ${result.assigned_hub} → Node ${selectedNodeId} | ETA ${etaMin}min | ${note}`);
    } else {
      responseCard.innerHTML = `
        <div class="response-field">
          <span class="response-key">Status</span>
          <span class="response-val red">✗ FAILED</span>
        </div>
        <div class="response-field">
          <span class="response-key">Reason</span>
          <span class="response-val red" style="font-size:11px;">${result.message}</span>
        </div>
      `;
      addLog('error', `FAILED: ${result.message}`);
    }
  }

  // ── Hub list rendering ──
  function renderHubs(hubs) {
    hubList.innerHTML = '';
    if (!hubs || hubs.length === 0) {
      hubList.innerHTML = '<div class="log-empty">No hubs loaded.</div>';
      return;
    }
    hubs.forEach(hub => {
      const div = document.createElement('div');
      div.className = `hub-card ${hub.type}`;

      const vehiclesLow = hub.vehicles <= 1;
      const bedsLow = hub.beds > 0 && hub.beds <= 2;

      div.innerHTML = `
        <div class="hub-name">${hub.name}</div>
        <div class="hub-resources">
          <span class="resource-badge ${vehiclesLow ? 'low' : ''}">🚗 ${hub.vehicles} vehicles</span>
          ${hub.beds > 0 ? `<span class="resource-badge ${bedsLow ? 'low' : ''}">🛏 ${hub.beds} beds</span>` : ''}
          ${hub.officers > 0 ? `<span class="resource-badge">👮 ${hub.officers} officers</span>` : ''}
        </div>
      `;
      div.addEventListener('click', () => {
        SERSMap.flyTo(hub.node_id);
      });
      hubList.appendChild(div);
    });
  }

  async function loadHubs() {
    try {
      hubsData = await SERSDispatch.fetchHubs();
      renderHubs(hubsData);
      SERSMap.renderHubs(hubsData);
    } catch (err) {
      hubList.innerHTML = `<div class="log-empty" style="color:#f85149;">Hub data unavailable</div>`;
    }
  }

  // ── Dispatch log ──
  function addLog(type, msg) {
    const now = new Date().toLocaleTimeString();
    dispatchLog.unshift({ type, msg, time: now });

    if (logList.querySelector('.log-empty')) {
      logList.innerHTML = '';
    }

    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.innerHTML = `<div class="log-time">${now}</div><div class="log-msg">${msg}</div>`;
    logList.prepend(entry);

    // Keep max 20 entries
    while (logList.children.length > 20) {
      logList.removeChild(logList.lastChild);
    }
  }

  // ── Node dropdown populate ──
  function populateNodeSelect(nodes) {
    nodeSelect.innerHTML = '<option value="">— Click map or select node —</option>';
    nodes.forEach(node => {
      const id = typeof node === 'object' ? node.id : node;
      const label = typeof node === 'object' ? node.label : (NODE_LABELS[id] || `Node ${id}`);
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = `[${id}] ${label}`;
      nodeSelect.appendChild(opt);
    });
  }

  // ── Bootstrap ──
  async function init() {
    if (!currentUser && !requireAuth()) return;
    setStatus('', 'Connecting...');

    // Init Leaflet map
    SERSMap.init();

    try {
      mapData = await SERSDispatch.fetchMap();
      setStatus('online', 'System Online');

      // Enrich nodes with labels if not present
      const nodes = (mapData.nodes || []).map(n => {
        if (typeof n === 'number') return { id: n, label: NODE_LABELS[n] || `Node ${n}` };
        return { ...n, label: n.label || NODE_LABELS[n.id] || `Node ${n.id}` };
      });

      populateNodeSelect(nodes);
      SERSMap.renderNodes(nodes, mapData.edges, id => {
        onNodeSelected(id);
        map_closePopups();
      });

      await loadHubs();

    } catch (err) {
      setStatus('error', 'Backend Offline');
      // Load demo data so frontend still shows something useful
      loadDemoData();
    }
  }

  function map_closePopups() {
    // small helper to close any open popups after selection
    if (window._leaflet_map) window._leaflet_map.closePopup();
  }

  // Demo mode when backend is unreachable
  function loadDemoData() {
    const demoNodes = Object.entries(NODE_LABELS).map(([id, label]) => ({ id: parseInt(id), label }));
    const demoEdges = [
      {source:0,target:1,weight:3.5},{source:0,target:2,weight:2.8},{source:0,target:5,weight:2.0},
      {source:1,target:3,weight:3.0},{source:2,target:4,weight:3.3},{source:3,target:9,weight:5.1},
      {source:4,target:8,weight:6.2},{source:5,target:4,weight:3.6},{source:6,target:9,weight:4.5},
      {source:7,target:8,weight:5.5}
    ];
    const demoHubs = [
      {id:101,name:'AIIMS Rishikesh Trauma',node_id:2,type:'medical',vehicles:5,beds:20,officers:0,lat:30.3400,lng:78.0524},
      {id:102,name:'Doon Hospital Emergency',node_id:0,type:'medical',vehicles:4,beds:15,officers:0,lat:30.3242,lng:78.0432},
      {id:103,name:'Patel Nagar Fire Station',node_id:3,type:'fire',vehicles:4,beds:0,officers:0,lat:30.3053,lng:78.0217},
      {id:104,name:'Rajpur Fire Station',node_id:7,type:'fire',vehicles:3,beds:0,officers:0,lat:30.3480,lng:78.0380},
      {id:105,name:'Karanpur Police Station',node_id:5,type:'police',vehicles:6,beds:0,officers:12,lat:30.3175,lng:78.0523},
      {id:106,name:'Clock Tower PCR',node_id:6,type:'police',vehicles:4,beds:0,officers:8,lat:30.3265,lng:78.0260},
    ];

    populateNodeSelect(demoNodes);
    SERSMap.renderNodes(demoNodes, demoEdges, id => onNodeSelected(id));
    renderHubs(demoHubs);
    SERSMap.renderHubs(demoHubs);

    // Disable dispatch when offline
    dispatchBtn.disabled = true;
    dispatchBtn.title = 'Backend offline — start the C++ server to enable dispatch';

    const banner = document.createElement('div');
    banner.style.cssText = 'background:rgba(248,81,73,0.1);border:1px solid #f85149;border-radius:6px;padding:10px 12px;margin-bottom:8px;font-size:11px;color:#f85149;font-family:Space Mono,monospace;';
    banner.textContent = '⚠ Backend offline. Map in demo mode. Start the C++ server to enable dispatch.';
    document.querySelector('.panel-left .panel-section').prepend(banner);
  }

  return { init, onNodeSelected };
})();

window.SERSMain = SERSMain;
document.addEventListener('DOMContentLoaded', () => SERSMain.init());
