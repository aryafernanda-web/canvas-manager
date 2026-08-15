/**
 * Canvas Area Management
 * Engine: Leaflet + Google Maps Tiles (High Reliability, No Key Needed)
 */

// --- Cloud Config (VPS Server Sendiri) ---
// Server berjalan di VPS Ubuntu 24.04: 103.93.132.76
const SERVER_URL = 'https://canvas-biznet.duckdns.org';
const API_KEY    = 'canvas-secret-key-2024'; // Harus sama dengan di server.js
let cloudSyncEnabled = SERVER_URL.indexOf('YOUR_VPS_IP') === -1;


async function loadFromCloud() {
    if (!cloudSyncEnabled) return null;
    try {
        const res = await fetch(`${SERVER_URL}/api/data`, {
            headers: { 'x-api-key': API_KEY }
        });
        if (!res.ok) throw new Error('Cloud load failed: ' + res.status);
        return await res.json();
    } catch(e) {
        console.warn('Cloud load error, using localStorage:', e);
        return null;
    }
}

async function saveToCloud(data) {
    if (!cloudSyncEnabled) return;
    try {
        const res = await fetch(`${SERVER_URL}/api/data`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY
            },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Save failed: ' + res.status);
        showCloudStatus('✓ Tersimpan ke cloud');
    } catch(e) {
        console.warn('Cloud save error:', e);
        showCloudStatus('⚠ Gagal sync cloud', true);
    }
}


function showCloudStatus(msg, isError = false) {
    let el = document.getElementById('cloud-status');
    if (!el) return;
    el.textContent = msg;
    el.style.background = isError ? '#ef4444' : '#22c55e';
    el.style.opacity = '1';
    setTimeout(() => { el.style.opacity = '0'; }, 2500);
}

// --- Data & Spatial Config ---
const BASE_POINTS = typeof KML_DP_POINTS !== 'undefined' ? KML_DP_POINTS : [];
const BASE_CABLES = typeof KML_CABLE_SEGS !== 'undefined' ? KML_CABLE_SEGS : [];

// Official Kelurahan Center Points (Coordinates from official maps)
// Comprehensive Kelurahan Centers in Tulungagung Central & Kedungwaru Area
// Based on geographic research of official administrative centers.
const KELURAHAN_CENTERS = [
    // Tulungagung Kota
    { name: 'Kampungdalem', lat: -8.0645, lng: 111.9022 },
    { name: 'Kenayan', lat: -8.0612, lng: 111.9038 },
    { name: 'Kutoanyar', lat: -8.0633, lng: 111.9072 },
    { name: 'Kepatihan', lat: -8.0622, lng: 111.9054 },
    { name: 'Tamanan', lat: -8.0711, lng: 111.9028 },
    { name: 'Bago', lat: -8.0689, lng: 111.9108 },
    { name: 'Jepun', lat: -8.0686, lng: 111.9178 },
    { name: 'Sembung', lat: -8.0569, lng: 111.9075 },
    { name: 'Tretek', lat: -8.0706, lng: 111.8867 },
    { name: 'Karangwaru', lat: -8.0553, lng: 111.9011 },
    { name: 'Kauman', lat: -8.0631, lng: 111.9008 },
    { name: 'Botoran', lat: -8.0654, lng: 111.8965 },
    { name: 'Plandaan', lat: -8.0412, lng: 111.9095 },
    // Kedungwaru & Northern area
    { name: 'Kedungwaru', lat: -8.0581, lng: 111.9168 },
    { name: 'Mangunsari', lat: -8.0551, lng: 111.8970 },
    { name: 'Ringinpitu', lat: -8.0605, lng: 111.9362 },
    { name: 'Bangoan', lat: -8.0442, lng: 111.9397 },
    { name: 'Rejoagung', lat: -8.0449, lng: 111.9121 },
    { name: 'Ketanon', lat: -8.0451, lng: 111.9072 },
    { name: 'Ngujang', lat: -8.0219, lng: 111.9189 },
    { name: 'Bulusari', lat: -8.0415, lng: 111.9325 },
    { name: 'Gendingan', lat: -8.0435, lng: 111.9215 },
    { name: 'Boro', lat: -8.0351, lng: 111.9082 },
    { name: 'Loderesan', lat: -8.0410, lng: 111.9100 },
    // Plosokandang (East area)
    { name: 'Plosokandang', lat: -8.0764, lng: 111.9272 },
    
    // Boyolangu & Southern area
    { name: 'Beji', lat: -8.0781, lng: 111.9002 },
    { name: 'Serut', lat: -8.0805, lng: 111.9143 },
    { name: 'Boyolangu', lat: -8.1195, lng: 111.8933 },
    { name: 'Karangrejo', lat: -8.0150, lng: 111.8850 }
];

/**
 * Assign Kelurahan based on the closest center point (Spatial Logic)
 * Robustly maps every coordinate to the nearest named administrative center.
 */
function getAssignedKelurahan(lat, lng) {
    if (!lat || !lng) return 'Lainnya';
    let closest = KELURAHAN_CENTERS[0];
    let minDist = Infinity;

    KELURAHAN_CENTERS.forEach(k => {
        const d = Math.sqrt(Math.pow(lat - k.lat, 2) + Math.pow(lng - k.lng, 2));
        if (d < minDist) {
            minDist = d;
            closest = k;
        }
    });

    return closest.name;
}

/**
 * Get Kelurahan by DP marker name prefix (verified), fallback to closest center point
 */
function getDpKelurahan(name, lat, lng) {
    if (!name) return getAssignedKelurahan(lat, lng);
    const upperName = name.toUpperCase();
    if (upperName.startsWith('BJI') || upperName.includes('BJI')) return 'Beji';
    if (upperName.startsWith('KDW') || upperName.includes('KDW') || upperName.includes('KEDUNGWARU')) return 'Kedungwaru';
    if (upperName.startsWith('MGN') || upperName.includes('MGN') || upperName.includes('MANGUNSARI')) return 'Mangunsari';
    if (upperName.startsWith('SRT') || upperName.includes('SRT') || upperName.includes('SERUT')) return 'Serut';
    
    return getAssignedKelurahan(lat, lng);
}

/**
 * Assign route Kelurahan based on the closest marker (DP point), fallback to center points
 */
function getRouteAssignedKelurahan(lat, lng) {
    if (!lat || !lng) return 'Lainnya';
    let closestMarker = null;
    let minDist = Infinity;

    // Search through BASE_POINTS (defined from data.js)
    if (typeof BASE_POINTS !== 'undefined') {
        BASE_POINTS.forEach(m => {
            const d = Math.sqrt(Math.pow(lat - m.lat, 2) + Math.pow(lng - m.lng, 2));
            if (d < minDist) {
                minDist = d;
                closestMarker = m;
            }
        });
    }

    // Search through savedMarkers (local storage)
    if (typeof savedMarkers !== 'undefined') {
        savedMarkers.forEach(m => {
            const d = Math.sqrt(Math.pow(lat - m.lat, 2) + Math.pow(lng - m.lng, 2));
            if (d < minDist) {
                minDist = d;
                closestMarker = m;
            }
        });
    }

    // Within ~550 meters (0.005 degrees), align with the marker's Kelurahan
    if (closestMarker && minDist < 0.005) {
        return closestMarker.kelurahan || getDpKelurahan(closestMarker.name, closestMarker.lat, closestMarker.lng);
    }

    // Otherwise fallback to closest Kelurahan center point
    return getAssignedKelurahan(lat, lng);
}

// --- State Management ---
function readStorage(key, fallback, { array = true } = {}) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        if (array) return Array.isArray(parsed) ? parsed : fallback;
        return parsed ?? fallback;
    } catch (e) {
        console.warn('localStorage read failed:', key, e);
        return fallback;
    }
}

function writeStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (e) {
        console.warn('localStorage write failed:', key, e);
        return false;
    }
}

let savedMarkers = readStorage('canvas_markers', []);
let savedRoutes = readStorage('canvas_routes', []);
let state = {
    markers: BASE_POINTS.map(p => {
        const saved = savedMarkers.find(sm => sm.id === p.id || (sm.lat === p.lat && sm.lng === p.lng));
        return {
            id: p.id || `p_${p.lat}_${p.lng}`,
            lat: p.lat,
            lng: p.lng,
            name: p.name || 'Marker',
            status: saved ? saved.status : 'pending',
            notes: saved ? saved.notes : (p.desc || ''),
            date: saved ? saved.date : '',
            kelurahan: getDpKelurahan(p.name, p.lat, p.lng)
        };
    }),
    routes: savedRoutes.map(r => {
        if (!r.kelurahan && r.points && r.points.length > 0) {
            const p = r.points[0];
            let lat = null, lng = null;
            if (Array.isArray(p)) { lat = p[0]; lng = p[1]; }
            else if (p) { lat = p.lat; lng = p.lng; }
            if (lat && lng) {
                r.kelurahan = getRouteAssignedKelurahan(lat, lng);
            } else {
                r.kelurahan = 'Lainnya';
            }
        }
        return r;
    }),
    currentMarker: null,
    currentRouteObj: null,
    currentRoute: [],
    drawRouteMode: false,
    filter: 'all',
    addMode: false
};

// Add manual markers
savedMarkers.forEach(sm => {
    if (!state.markers.some(m => m.id === sm.id)) {
        sm.kelurahan = sm.kelurahan || getDpKelurahan(sm.name, sm.lat, sm.lng);
        state.markers.push(sm);
    }
});

const COLORS = {
    pending: '#ef4444',
    progress: '#f59e0b',
    done: '#22c55e',
    cable: '#3b82f6',
    area: '#94a3b8'
};

// --- Map Initialization ---
const map = L.map('map', { zoomControl: false }).setView([-8.0686, 111.9125], 14);
L.control.zoom({ position: 'bottomright' }).addTo(map);

// Google Maps Tile Layer for Leaflet (No API Key Required for mt{s}.google.com)
// This solves the 403 Forbidden issues of OSM.
const googleStreets = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '&copy; Google Maps'
}).addTo(map);

const cableGroup = L.layerGroup().addTo(map);
// Gunakan layerGroup biasa — marker tidak akan digabung/cluster saat zoom out
const markerGroup = L.layerGroup().addTo(map);
const areaGroup = L.layerGroup().addTo(map);
const userRoutesGroup = L.layerGroup().addTo(map); // Pindahkan ke sini agar konsisten

// Pastikan urutan layer benar (rute di paling atas)
userRoutesGroup.setZIndex(1000);
markerGroup.setZIndex(900);

// Fix untuk embed/iframe: paksa peta deteksi ukuran
setTimeout(() => { map.invalidateSize(); }, 500);

// --- UI Logic ---
const dom = {
    markerList: document.getElementById('marker-list'),
    markerCount: document.getElementById('marker-count'),
    modal: document.getElementById('marker-modal'),
    form: document.getElementById('marker-form'),
    notes: document.getElementById('marker-notes'),
    status: document.getElementById('marker-status'),
    date: document.getElementById('marker-date'),
    deleteBtn: document.getElementById('delete-marker'),
    sidebar: document.getElementById('sidebar'),
    toggleSidebar: document.getElementById('toggle-sidebar'),
    closeSidebar: document.getElementById('close-sidebar'),
    totalProgressText: document.getElementById('total-progress-text'),
    totalProgressBar: document.getElementById('total-progress-bar'),
    filterChips: document.querySelectorAll('.filter-chip'),
    highlightBtn: document.getElementById('highlight-empty'),
    search: document.getElementById('search-marker'),
    addModeBtn: document.getElementById('add-marker-mode'),
    routeBtn: document.getElementById('route-btn'),
    routeSaveBtn: document.getElementById('route-save-btn'),
    routeNameInput: document.getElementById('route-name-input'),
    routeInstruction: document.getElementById('route-instruction'),
    routeDistanceInfo: document.getElementById('route-distance-info'),
    routePointCount: document.getElementById('route-point-count')
};

function updateDashboard() {
    // Progress hanya dihitung dari marker (bukan rute)
    const total = state.markers.length;
    const done = state.markers.filter(m => m.status === 'done').length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);

    dom.totalProgressText.textContent = `${percent}%`;
    dom.totalProgressBar.style.width = `${percent}%`;
    
    const allItems = [...state.markers, ...state.routes];
    dom.markerCount.textContent = allItems.filter(m => state.filter === 'all' || m.status === state.filter).length;

    renderKelurahanProgress();
}

/**
 * Render Kelurahan statistics based on spatial grouping
 * Includes both markers and routes in the per-kelurahan progress
 */
function renderKelurahanProgress() {
    const groups = {};
    
    // Initialize with all known Kelurahan centers to show 0% progress for empty areas
    KELURAHAN_CENTERS.forEach(k => {
        groups[k.name] = { total: 0, done: 0, progress: 0, points: [] };
    });

    // Count ONLY markers for progress calculation (routes are display-only)
    state.markers.forEach(m => {
        const kel = m.kelurahan;
        if (!groups[kel]) groups[kel] = { total: 0, done: 0, progress: 0, points: [] };
        groups[kel].total++;
        if (m.status === 'done') groups[kel].done++;
        if (m.status === 'progress') groups[kel].progress++;
        groups[kel].points.push([m.lng, m.lat]);
    });

    // Routes: only add points for convex hull visualization, NOT counted in progress
    state.routes.forEach(r => {
        const kel = r.kelurahan || 'Lainnya';
        if (!groups[kel]) groups[kel] = { total: 0, done: 0, progress: 0, points: [] };
        const normalized = normalizeRoutePoints(r.points);
        normalized.forEach(pt => {
            groups[kel].points.push([pt[1], pt[0]]); // Turf expects [lng, lat]
        });
    });

    areaGroup.clearLayers();
    const isHighlightActive = dom.highlightBtn.classList.contains('active');

    let list = document.getElementById('area-progress-list');
    if (!list) {
        const section = document.createElement('div');
        section.className = 'area-section';
        section.innerHTML = `<h3>Progres Per Kelurahan</h3><div id="area-progress-list"></div>`;
        dom.sidebar.insertBefore(section, dom.sidebar.querySelector('.marker-list-section'));
        list = document.getElementById('area-progress-list');
    }

    const sortedEntries = Object.entries(groups)
        .filter(([name, stats]) => stats.total > 0)
        .sort((a, b) => a[0].localeCompare(b[0]));

    list.innerHTML = sortedEntries.map(([name, stats]) => {
        const p = Math.round((stats.done / stats.total) * 100);
        const inProgress = stats.progress > 0;
        const barColor = p === 100 ? 'var(--success)' : inProgress ? 'var(--warning)' : '#ef4444';

        // Highlight Polygon (Convex Hull) on map if highlight is active
        if (isHighlightActive && stats.points.length >= 3) {
            try {
                const hull = turf.convex(turf.featureCollection(stats.points.map(pt => turf.point(pt))));
                if (hull) {
                    L.geoJSON(hull, {
                        style: {
                            color: p < 100 ? COLORS.pending : COLORS.done,
                            weight: 2,
                            fillOpacity: 0.15,
                            dashArray: '5, 5'
                        }
                    }).bindTooltip(`Kelurahan ${name}: ${p}% (${stats.done}/${stats.total})`).addTo(areaGroup);
                }
            } catch (e) {}
        }

        const routeCount = state.routes.filter(r => (r.kelurahan || 'Lainnya') === name).length;
        const markerCount = state.markers.filter(m => m.kelurahan === name).length;

        return `
            <div class="area-stat-card">
                <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 600;">
                    <span>Kel. ${name}</span>
                    <span>${p}% <span style="opacity:0.6;font-weight:400;font-size:0.72rem;">(${stats.done}/${stats.total})</span></span>
                </div>
                <div class="progress-bar-container" style="height: 4px; margin: 4px 0;">
                    <div class="progress-bar" style="width: ${p}%; background: ${barColor};"></div>
                </div>
                <div style="display:flex;gap:8px;font-size:0.7rem;opacity:0.65;margin-top:2px;">
                    ${markerCount > 0 ? `<span><i class="fas fa-map-marker-alt" style="margin-right:2px;"></i>${markerCount} marker</span>` : ''}
                    ${routeCount > 0 ? `<span><i class="fas fa-route" style="margin-right:2px;"></i>${routeCount} rute</span>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function renderCables() {
    cableGroup.clearLayers();
    BASE_CABLES.forEach(seg => {
        if (seg.value && seg.value.length > 0) {
            L.polyline(seg.value.map(p => [p.lat, p.lng]), {
                color: COLORS.cable,
                weight: 2,
                opacity: 0.5
            }).addTo(cableGroup);
        }
    });
}

// --- Route Drawing: Manual Polyline (no external API, works in all contexts incl. embed) ---
let currentRouteLine   = null;   // L.polyline saat sedang menggambar
let currentRouteMarkers = [];    // marker titik bernomor
let currentRouteLatLngs = [];    // array L.LatLng sementara
let pendingRoutePoints  = null;  // array [lat,lng] yang siap disimpan

function startRouting() {
    // Bersihkan sesi gambar sebelumnya
    if (currentRouteLine)  { map.removeLayer(currentRouteLine);  currentRouteLine = null; }
    currentRouteMarkers.forEach(m => map.removeLayer(m));
    currentRouteMarkers  = [];
    currentRouteLatLngs  = [];
    pendingRoutePoints   = null;

    // Garis titik-titik (dashed) saat sedang menggambar
    currentRouteLine = L.polyline([], {
        color: COLORS.progress,
        weight: 5,
        opacity: 0.9,
        dashArray: '10, 6'
    }).addTo(map);
}

function addRoutePoint(latlng) {
    currentRouteLatLngs.push(latlng);
    currentRouteLine.setLatLngs(currentRouteLatLngs);

    const idx = currentRouteLatLngs.length;
    const marker = L.marker(latlng, {
        icon: L.divIcon({
            className: '',
            html: `<div style="background:#1e40af;color:white;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);">${idx}</div>`,
            iconSize: [24, 24], iconAnchor: [12, 12]
        }),
        draggable: true
    }).addTo(map);

    // Saat titik di-drag, update polyline secara real-time
    marker.on('drag', (e) => {
        currentRouteLatLngs[idx - 1] = e.target.getLatLng();
        currentRouteLine.setLatLngs(currentRouteLatLngs);
        pendingRoutePoints = currentRouteLatLngs.map(ll => [ll.lat, ll.lng]);
        _refreshRouteInfo();
    });

    currentRouteMarkers.push(marker);
    pendingRoutePoints = currentRouteLatLngs.map(ll => [ll.lat, ll.lng]);
    _updateRouteUI();
    _refreshRouteInfo();
}

function _refreshRouteInfo() {
    const count = currentRouteLatLngs.length;
    if (count >= 2) {
        const km = _calcDistanceKm(currentRouteLatLngs).toFixed(2);
        if (dom.routeDistanceInfo) dom.routeDistanceInfo.textContent = `✓ Panjang rute: ${km} km`;
        if (dom.routeSaveBtn) { dom.routeSaveBtn.disabled = false; dom.routeSaveBtn.style.opacity = '1'; }
    } else {
        if (dom.routeDistanceInfo) dom.routeDistanceInfo.textContent = 'Belum ada rute — tambahkan minimal 2 titik';
        if (dom.routeSaveBtn) { dom.routeSaveBtn.disabled = true; dom.routeSaveBtn.style.opacity = '0.5'; }
    }
}

function _calcDistanceKm(latlngs) {
    let total = 0;
    for (let i = 1; i < latlngs.length; i++) {
        total += latlngs[i - 1].distanceTo(latlngs[i]);
    }
    return total / 1000;
}

function undoRoutePoint() {
    if (currentRouteLatLngs.length === 0) return;
    currentRouteLatLngs.pop();
    currentRouteLine.setLatLngs(currentRouteLatLngs);
    const last = currentRouteMarkers.pop();
    if (last) map.removeLayer(last);
    pendingRoutePoints = currentRouteLatLngs.length > 0
        ? currentRouteLatLngs.map(ll => [ll.lat, ll.lng])
        : null;
    _updateRouteUI();
    _refreshRouteInfo();
}

function _updateRouteUI() {
    const count = currentRouteLatLngs.length;
    if (dom.routePointCount) dom.routePointCount.textContent = `${count} titik`;
    if (dom.routeInstruction) {
        if (count === 0)      dom.routeInstruction.textContent = 'Klik titik pertama di peta untuk mulai';
        else if (count === 1) dom.routeInstruction.textContent = 'Klik titik berikutnya — minimal 2 titik';
        else                  dom.routeInstruction.textContent = `${count} titik — tambah lebih banyak atau simpan`;
    }
}

function stopRouting(save) {
    const routeName = dom.routeNameInput ? dom.routeNameInput.value.trim() : '';
    if (save && pendingRoutePoints && pendingRoutePoints.length > 1) {
        const firstPoint = pendingRoutePoints[0];
        const newRoute = {
            id: 'route_' + Date.now(),
            points: pendingRoutePoints,
            name: routeName || 'Jalur Baru',
            status: 'pending',
            notes: '',
            date: new Date().toISOString().split('T')[0],
            kelurahan: getRouteAssignedKelurahan(firstPoint[0], firstPoint[1])
        };
        state.routes.push(newRoute);
        saveAll();
        openModal(newRoute, 'route');
    }
    // Bersihkan layer gambar sementara
    if (currentRouteLine)  { map.removeLayer(currentRouteLine);  currentRouteLine = null; }
    currentRouteMarkers.forEach(m => map.removeLayer(m));
    currentRouteMarkers = [];
    currentRouteLatLngs = [];
    pendingRoutePoints  = null;
    document.getElementById('map').style.cursor = '';
}

function normalizeRoutePoints(points) {
    if (!Array.isArray(points)) return [];
    return points
        .map(p => {
            if (Array.isArray(p) && p.length >= 2) return [Number(p[0]), Number(p[1])];
            if (p && typeof p.lat === 'number' && typeof p.lng === 'number') return [p.lat, p.lng];
            if (p && typeof p.latitude === 'number' && typeof p.longitude === 'number') {
                return [p.latitude, p.longitude];
            }
            return null;
        })
        .filter(p => p && Number.isFinite(p[0]) && Number.isFinite(p[1]));
}

function renderUserRoutes() {
    userRoutesGroup.clearLayers();
    state.routes.forEach(route => {
        const latlngs = normalizeRoutePoints(route.points);
        if (latlngs.length < 2) return;
        route.points = latlngs;
        const color = COLORS[route.status] || COLORS.cable;
        const polyline = L.polyline(latlngs, {
            color: color,
            weight: 5,
            opacity: 0.85
        }).addTo(userRoutesGroup);
        polyline.bindTooltip(route.name || 'Jalur', { sticky: true });
        polyline.on('click', () => openModal(route, 'route'));
    });
}

function createCustomIcon(status) {
    const color = COLORS[status] || COLORS.pending;
    return L.divIcon({
        className: 'custom-div-icon',
        html: `<div class="marker-pin" style="background: ${color}"></div>`,
        iconSize: [30, 42],
        iconAnchor: [15, 42]
    });
}

function renderMarkers() {
    markerGroup.clearLayers();
    dom.markerList.innerHTML = '';
    renderUserRoutes();

    const searchTerm = dom.search.value.toLowerCase();
    
    // Add map markers — ALWAYS clickable (stops propagation, won't add route waypoint)
    state.markers.forEach(m => {
        const matchesStatus = state.filter === 'all' || m.status === state.filter;
        if (matchesStatus) {
            const leafletMarker = L.marker([m.lat, m.lng], {
                icon: createCustomIcon(m.status)
            }).addTo(markerGroup);

            leafletMarker.on('click', (ev) => {
                L.DomEvent.stopPropagation(ev); // Jangan tambah waypoint saat klik DP
                openModal(m, 'marker');
            });
        }
    });

    const allItems = [
        ...state.markers.map(m => ({ ...m, type: 'marker' })),
        ...state.routes.map(r => ({ ...r, type: 'route', kelurahan: r.kelurahan || 'Lainnya' }))
    ];

    const filtered = allItems.filter(item => {
        const matchesStatus = state.filter === 'all' || item.status === state.filter;
        const matchesSearch = (item.notes || '').toLowerCase().includes(searchTerm) || (item.name || '').toLowerCase().includes(searchTerm);
        return matchesStatus && matchesSearch;
    });

    filtered.forEach(item => {
        const div = document.createElement('div');
        div.className = 'marker-item';
        div.innerHTML = `
            <div style="font-weight: 600; font-size: 0.9rem;">
                <span class="marker-status-dot status-${item.status}"></span>
                ${item.type === 'route' ? '<i class="fas fa-route" style="margin-right: 4px;"></i>' : ''}
                ${item.name}
            </div>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">
                Kel. ${item.kelurahan}
                ${item.type === 'route' ? '<span style="margin-left:4px;opacity:0.6;">· Jalur</span>' : ''}
            </div>
        `;
        div.onclick = () => {
            if (item.type === 'marker') {
                map.flyTo([item.lat, item.lng], 18);
            } else if (item.points && item.points.length > 0) {
                map.flyToBounds(L.polyline(item.points).getBounds());
            }
            openModal(item, item.type);
        };
        dom.markerList.appendChild(div);
    });

    if (filtered.length === 0) {
        dom.markerList.innerHTML = '<div class="empty-state">Tidak ada data ditemukan</div>';
    }
}

// --- Marker Actions ---
function openModal(item = null, type = 'marker') {
    if (item) {
        if (type === 'marker') {
            state.currentMarker = item;
            state.currentRouteObj = null;
            document.getElementById('modal-title').innerText = 'Marker Detail';
        } else {
            state.currentRouteObj = item;
            state.currentMarker = null;
            document.getElementById('modal-title').innerText = 'Jalur Detail';
        }
        dom.notes.value = item.notes || '';
        dom.status.value = item.status || 'pending';
        dom.date.value = item.date || new Date().toISOString().split('T')[0];

        // Populate kelurahan dropdown
        const kelSelect = document.getElementById('marker-kelurahan');
        if (kelSelect) {
            const sortedKels = [...KELURAHAN_CENTERS].sort((a, b) => a.name.localeCompare(b.name));
            kelSelect.innerHTML = sortedKels.map(k => 
                `<option value="${k.name}">${k.name}</option>`
            ).join('') + '<option value="Lainnya">Lainnya</option>';
            kelSelect.value = item.kelurahan || 'Lainnya';
        }

        dom.deleteBtn.style.display = 'block';
        dom.modal.style.display = 'flex';
    }
}

function closeModal() {
    dom.modal.style.display = 'none';
    state.currentMarker = null;
    state.currentRouteObj = null;
    state.addMode = false;
    dom.addModeBtn.innerHTML = '<i class="fas fa-plus"></i>';
    dom.addModeBtn.setAttribute('title', 'Tambah Marker');
    dom.addModeBtn.style.background = 'var(--primary)';
}

function saveAll() {
    state.routes = state.routes.map(r => ({
        ...r,
        points: normalizeRoutePoints(r.points)
    })).filter(r => r.points.length >= 2);

    const data = { markers: state.markers, routes: state.routes };
    writeStorage('canvas_markers', state.markers);
    writeStorage('canvas_routes', state.routes);
    saveToCloud(data);
    renderMarkers();
    updateDashboard();
}

function saveMarkers() { saveAll(); }
function saveRoutes() { saveAll(); }

// --- Event Listeners ---
map.on('click', (e) => {
    if (state.drawRouteMode) {
        addRoutePoint(e.latlng);
        return;
    }
    if (!state.addMode) return;
    const newMarker = {
        id: 'manual_' + Date.now(),
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        name: 'Marker Baru',
        status: 'pending',
        notes: '',
        date: new Date().toISOString().split('T')[0],
        kelurahan: getDpKelurahan('Marker Baru', e.latlng.lat, e.latlng.lng)
    };
    state.markers.push(newMarker);
    saveMarkers();
    openModal(newMarker, 'marker');
});

/**
 * Auto-update nearby DP markers (within ~50 meters) to same status
 * when user saves a marker. This prevents double-work for adjacent DPs.
 */
function autoUpdateNearbyMarkers(savedMarker, newStatus) {
    const RADIUS_M = 50; // meters
    state.markers.forEach((m, i) => {
        if (m.id === savedMarker.id) return; // skip diri sendiri
        // Haversine distance in meters
        const R = 6371000;
        const dLat = (m.lat - savedMarker.lat) * Math.PI / 180;
        const dLng = (m.lng - savedMarker.lng) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 + Math.cos(savedMarker.lat * Math.PI/180) * Math.cos(m.lat * Math.PI/180) * Math.sin(dLng/2)**2;
        const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        if (dist <= RADIUS_M && m.status === 'pending') {
            state.markers[i] = { ...state.markers[i], status: newStatus, date: savedMarker.date || new Date().toISOString().split('T')[0] };
        }
    });
}

dom.form.onsubmit = (e) => {
    e.preventDefault();
    const kelSelect = document.getElementById('marker-kelurahan');
    const selectedKel = kelSelect ? kelSelect.value : 'Lainnya';

    if (state.currentMarker) {
        const index = state.markers.findIndex(m => m.id === state.currentMarker.id);
        if (index !== -1) {
            state.markers[index] = {
                ...state.markers[index],
                status: dom.status.value,
                notes: dom.notes.value,
                date: dom.date.value,
                kelurahan: selectedKel
            };
            // Auto-update DP terdekat (radius 50m) jika status bukan pending
            if (dom.status.value !== 'pending') {
                autoUpdateNearbyMarkers(state.markers[index], dom.status.value);
            }
        }
        saveMarkers();
    } else if (state.currentRouteObj) {
        const index = state.routes.findIndex(r => r.id === state.currentRouteObj.id);
        if (index !== -1) {
            state.routes[index] = {
                ...state.routes[index],
                status: dom.status.value,
                notes: dom.notes.value,
                date: dom.date.value,
                kelurahan: selectedKel
            };
        }
        saveRoutes();
    }
    closeModal();
};

dom.deleteBtn.onclick = () => {
    if (state.currentMarker) {
        state.markers = state.markers.filter(m => m.id !== state.currentMarker.id);
        saveMarkers();
    } else if (state.currentRouteObj) {
        state.routes = state.routes.filter(r => r.id !== state.currentRouteObj.id);
        saveRoutes();
    }
    closeModal();
};

dom.routeBtn.onclick = () => {
    // Toggle hanya untuk MEMULAI mode rute; menyimpan dilakukan oleh route-save-btn
    state.drawRouteMode = !state.drawRouteMode;
    const routeBar = document.getElementById('route-mode-bar');
    if (state.drawRouteMode) {
        dom.routeBtn.innerHTML = '<i class="fas fa-times-circle"></i>';
        dom.routeBtn.setAttribute('title', 'Keluar Mode Rute');
        dom.routeBtn.classList.add('active');
        state.addMode = false;
        dom.addModeBtn.classList.remove('active');
        if (routeBar) routeBar.style.display = 'flex';
        // Reset input nama rute
        if (dom.routeNameInput) dom.routeNameInput.value = '';
        if (dom.routeSaveBtn) { dom.routeSaveBtn.disabled = true; dom.routeSaveBtn.style.opacity = '0.5'; }
        if (dom.routePointCount) dom.routePointCount.textContent = '0 titik';
        if (dom.routeInstruction) dom.routeInstruction.textContent = 'Klik titik pertama di peta untuk mulai';
        if (dom.routeDistanceInfo) dom.routeDistanceInfo.textContent = 'Belum ada rute — tambahkan minimal 2 titik';
        // Ubah kursor peta jadi crosshair
        document.getElementById('map').style.cursor = 'crosshair';
        startRouting();
    } else {
        _exitRouteMode();
    }
};

function _exitRouteMode(save = false) {
    state.drawRouteMode = false;
    dom.routeBtn.innerHTML = '<i class="fas fa-route"></i>';
    dom.routeBtn.setAttribute('title', 'Buat Rute Baru');
    dom.routeBtn.classList.remove('active');
    const routeBar = document.getElementById('route-mode-bar');
    if (routeBar) routeBar.style.display = 'none';
    document.getElementById('map').style.cursor = '';
    stopRouting(save); // save=true → simpan rute, save=false → buang
}

dom.highlightBtn.onclick = () => {
    dom.highlightBtn.classList.toggle('active');
    updateDashboard();
};

dom.addModeBtn.onclick = () => {
    state.addMode = !state.addMode;
    if (state.addMode) {
        dom.addModeBtn.innerHTML = '<i class="fas fa-times"></i>';
        dom.addModeBtn.setAttribute('title', 'Keluar Mode Tambah Marker');
        dom.addModeBtn.style.background = COLORS.done;
    } else {
        dom.addModeBtn.innerHTML = '<i class="fas fa-plus"></i>';
        dom.addModeBtn.setAttribute('title', 'Tambah Marker');
        dom.addModeBtn.style.background = 'var(--primary)';
    }
};

dom.filterChips.forEach(chip => {
    chip.onclick = () => {
        dom.filterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.filter = chip.dataset.status;
        renderMarkers();
    };
});

dom.search.oninput = renderMarkers;
document.querySelector('.close-modal').onclick = closeModal;
dom.toggleSidebar.onclick = () => dom.sidebar.classList.add('active');
dom.closeSidebar.onclick = () => dom.sidebar.classList.remove('active');

// Simpan rute — gunakan _exitRouteMode(true) agar stopRouting dipanggil dengan save=true
document.getElementById('route-save-btn')?.addEventListener('click', () => {
    _exitRouteMode(true);
});

// Batal — buang semua titik
document.getElementById('route-cancel-btn')?.addEventListener('click', () => {
    _exitRouteMode(false);
});

// Undo titik terakhir
document.getElementById('route-undo-btn')?.addEventListener('click', () => {
    undoRoutePoint();
});

function mergeCloudData(cloudData) {
    if (!cloudData) return;

    if (Array.isArray(cloudData.markers)) {
        cloudData.markers.forEach(cm => {
            const idx = state.markers.findIndex(m => m.id === cm.id);
            if (idx !== -1) {
                state.markers[idx] = { ...state.markers[idx], ...cm };
            } else {
                cm.kelurahan = cm.kelurahan || getDpKelurahan(cm.name, cm.lat, cm.lng);
                state.markers.push(cm);
            }
        });
    }

    if (Array.isArray(cloudData.routes)) {
        cloudData.routes.forEach(cr => {
            const normalized = {
                ...cr,
                points: normalizeRoutePoints(cr.points)
            };
            if (normalized.points.length < 2) return;
            if (!normalized.kelurahan && normalized.points.length > 0) {
                normalized.kelurahan = getRouteAssignedKelurahan(normalized.points[0][0], normalized.points[0][1]);
            }
            const idx = state.routes.findIndex(r => r.id === normalized.id);
            if (idx !== -1) {
                state.routes[idx] = { ...state.routes[idx], ...normalized };
            } else {
                state.routes.push(normalized);
            }
        });
    }

    writeStorage('canvas_markers', state.markers);
    writeStorage('canvas_routes', state.routes);
}

// --- Initialization ---
const savedView = readStorage('canvas_map_view', null, { array: false });
if (savedView && Number.isFinite(savedView.lat) && Number.isFinite(savedView.lng)) {
    map.setView([savedView.lat, savedView.lng], savedView.zoom || 14);
}

renderCables();
renderMarkers();
updateDashboard();
map.invalidateSize();

(async () => {
    try {
        const cloudData = await loadFromCloud();
        mergeCloudData(cloudData);
    } catch (e) {
        console.warn('Cloud sync skipped:', e);
    } finally {
        renderMarkers();
        updateDashboard();
        setTimeout(() => map.invalidateSize(), 1000);
    }
})();

map.on('moveend', () => {
    const center = map.getCenter();
    const zoom = map.getZoom();
    writeStorage('canvas_map_view', { lat: center.lat, lng: center.lng, zoom }, { array: false });
});

// Export
document.getElementById('export-btn').onclick = () => {
    const exportData = {
        markers: state.markers,
        routes: state.routes
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData));
    const dl = document.createElement('a');
    dl.setAttribute("href", dataStr);
    dl.setAttribute("download", "canvas_data.json");
    dl.click();
};
