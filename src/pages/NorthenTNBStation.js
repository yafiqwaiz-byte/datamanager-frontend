import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polygon, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import html2canvas from 'html2canvas';
import '../styles/NorthenTNBStation.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const subzoneColors = {
  SBJ:       { bg: '#dc2626', label: 'Seberang Jaya' },
  P1:        { bg: '#2563eb', label: 'Pulau Pinang 1' },
  P2:        { bg: '#1d4ed8', label: 'Pulau Pinang 2' },
  'SGP/KLM': { bg: '#16a34a', label: 'Sungai Petani / Kulim' },
  'ALS/KAN': { bg: '#7c3aed', label: 'Alor Setar / Kangar' },
  A1:        { bg: '#ca8a04', label: 'Perak A1' },
  A2:        { bg: '#ea580c', label: 'Perak A2' },
  A3:        { bg: '#0d9488', label: 'Perak A3' },
};

// State colors matching the reference image
const STATE_COLORS = {
  perlis:  { fill: '#1d4ed8', stroke: '#1e3a8a', label: 'Perlis' },
  kedah:   { fill: '#dc2626', stroke: '#991b1b', label: 'Kedah' },
  penang:  { fill: '#0d9488', stroke: '#0f766e', label: 'Pulau Pinang' },
  perak:   { fill: '#d97706', stroke: '#b45309', label: 'Perak' },
};

// State boundary polygons as [lat, lng] pairs — accurate outlines
const PERLIS = [
  [6.715,100.095],[6.720,100.195],[6.710,100.280],[6.680,100.340],
  [6.640,100.380],[6.580,100.420],[6.530,100.430],[6.490,100.400],
  [6.450,100.360],[6.420,100.290],[6.400,100.220],[6.390,100.080],
  [6.430,100.020],[6.490,99.980],[6.560,99.960],[6.620,99.970],
  [6.670,100.010],[6.700,100.060],
];

const KEDAH = [
  [6.450,100.360],[6.530,100.430],[6.580,100.420],[6.640,100.380],
  [6.680,100.340],[6.710,100.280],[6.720,100.195],[6.715,100.095],
  [6.700,100.060],[6.670,100.010],[6.620,99.970],[6.560,99.960],
  [6.490,99.980],[6.430,100.020],[6.390,100.080],[6.400,100.220],
  [6.380,100.150],[6.330,100.090],[6.260,100.020],[6.210,99.990],
  [6.170,100.020],[6.130,100.060],[6.080,100.090],[6.050,100.150],
  [6.020,100.220],[5.980,100.280],[5.960,100.360],[5.950,100.440],
  [5.960,100.530],[5.990,100.610],[6.030,100.680],[6.090,100.740],
  [6.160,100.790],[6.250,100.810],[6.340,100.790],[6.420,100.750],
  [6.490,100.700],[6.540,100.640],[6.570,100.560],[6.570,100.480],
  [6.540,100.410],[6.490,100.400],
];

const LANGKAWI = [
  [6.430,99.650],[6.450,99.710],[6.470,99.780],[6.480,99.850],
  [6.470,99.910],[6.440,99.960],[6.400,99.990],[6.350,100.000],
  [6.300,99.990],[6.260,99.960],[6.240,99.910],[6.240,99.850],
  [6.260,99.790],[6.300,99.740],[6.350,99.710],[6.400,99.690],
];

const PENANG_ISLAND = [
  [5.490,100.190],[5.500,100.220],[5.480,100.280],[5.450,100.320],
  [5.420,100.340],[5.380,100.350],[5.340,100.340],[5.300,100.310],
  [5.270,100.270],[5.260,100.230],[5.270,100.185],[5.300,100.155],
  [5.340,100.140],[5.390,100.140],[5.430,100.155],[5.465,100.175],
];

const PENANG_MAINLAND = [
  [5.560,100.380],[5.560,100.430],[5.540,100.490],[5.510,100.530],
  [5.470,100.550],[5.420,100.550],[5.370,100.530],[5.320,100.510],
  [5.290,100.490],[5.260,100.460],[5.240,100.430],[5.240,100.390],
  [5.260,100.360],[5.300,100.340],[5.350,100.330],[5.410,100.340],
  [5.460,100.350],[5.510,100.360],
];

const PERAK = [
  [5.960,100.530],[5.950,100.440],[5.960,100.360],[5.980,100.280],
  [6.020,100.220],[6.050,100.150],[6.080,100.090],[6.130,100.060],
  [6.170,100.020],[6.210,99.990],[6.260,100.020],[6.330,100.090],
  [6.380,100.150],[6.420,100.290],[6.450,100.360],[6.490,100.400],
  [6.540,100.410],[6.570,100.480],[6.570,100.560],[6.540,100.640],
  [6.490,100.700],[6.420,100.750],[6.340,100.790],[6.250,100.810],
  [6.160,100.790],[6.090,100.740],[6.050,100.820],[5.990,100.900],
  [5.930,100.970],[5.870,101.040],[5.790,101.100],[5.700,101.150],
  [5.600,101.180],[5.500,101.200],[5.420,101.190],[5.350,101.170],
  [5.280,101.130],[5.210,101.080],[5.140,101.020],[5.060,100.950],
  [4.980,100.880],[4.900,100.820],[4.810,100.780],[4.720,100.760],
  [4.630,100.770],[4.540,100.800],[4.450,100.840],[4.370,100.900],
  [4.290,100.970],[4.210,101.040],[4.130,101.100],[4.040,101.160],
  [3.960,101.230],[3.880,101.310],[3.800,101.400],[3.730,101.490],
  [3.680,101.570],[3.660,101.380],[3.680,101.270],[3.710,101.170],
  [3.750,101.070],[3.800,100.970],[3.850,100.880],[3.900,100.800],
  [3.950,100.720],[3.990,100.640],[4.010,100.560],[4.010,100.490],
  [3.990,100.430],[3.990,100.310],[4.050,100.290],[4.130,100.300],
  [4.200,100.330],[4.260,100.380],[4.310,100.440],[4.340,100.510],
  [4.350,100.590],[4.330,100.670],[4.300,100.730],[4.240,100.830],
  [4.250,100.960],[4.300,101.000],[4.370,101.020],[4.440,101.010],
  [4.560,100.960],[4.660,100.900],[4.790,100.870],[4.930,100.880],
  [5.040,100.930],[5.080,100.960],[5.100,101.000],[5.100,101.100],
  [5.050,101.170],[4.960,101.200],[4.860,101.170],[4.790,101.080],
  [4.790,100.960],[4.820,100.910],[4.860,100.870],[5.080,100.720],
  [5.160,100.620],[5.240,100.530],[5.260,100.460],[5.290,100.490],
  [5.420,100.550],[5.560,100.430],[5.560,100.380],[5.650,100.340],
  [5.750,100.310],[5.850,100.330],[5.940,100.400],[5.960,100.460],
  [5.960,100.530],
];

const MAP_LAYERS = {
  street:    { label:'Street',    icon:'🗺️', description:'2D Street Map',    url:'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',                                                                 attribution:'&copy; OpenStreetMap contributors', maxZoom:19 },
  satellite: { label:'Satellite', icon:'🛰️', description:'3D Satellite View', url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',                    attribution:'Tiles &copy; Esri',                 maxZoom:19 },
  terrain:   { label:'Terrain',   icon:'⛰️', description:'2D Terrain Map',    url:'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',                                                                  attribution:'Map data: &copy; OpenStreetMap',    maxZoom:17 },
  states:    { label:'States',    icon:'🏛️', description:'2D State Zones',    url:'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',                                              attribution:'&copy; OpenStreetMap &copy; CARTO', maxZoom:19 },
};

function parseKML(kmlText) {
  const parser = new DOMParser();
  const kml = parser.parseFromString(kmlText, 'application/xml');
  const placemarks = kml.querySelectorAll('Placemark');
  const stations = [];
  placemarks.forEach((p, i) => {
    const name = p.querySelector('name')?.textContent || '';
    const coords = p.querySelector('coordinates')?.textContent?.trim() || '';
    const [lng, lat] = coords.split(',').map(Number);
    const data = {};
    p.querySelectorAll('Data').forEach(d => { data[d.getAttribute('name')] = d.querySelector('value')?.textContent; });
    if (lat && lng) stations.push({ no: i + 1, name, ba: data.ba || '', subzone: data.subzone || '', lat, lng });
  });
  return stations;
}

// Component to handle map reference
function MapRef({ mapRef }) {
  const map = useMap();
  useEffect(() => { mapRef.current = map; }, [map, mapRef]);
  return null;
}

// Component to auto-fit bounds to show all stations (Option 4)
function FitBounds({ stations }) {
  const map = useMap();
  
  useEffect(() => {
    if (stations.length > 0) {
      const bounds = L.latLngBounds(
        stations.map(s => [s.lat, s.lng])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [stations, map]);
  
  return null;
}

// Function to create custom pin marker icon (Option 5)
function createCustomIcon(station, color, isSelected) {
  const size = isSelected ? 50 : 40;
  const pinHeight = isSelected ? 60 : 50;
  
  return L.divIcon({
    className: 'custom-station-marker',
    html: `
      <div class="marker-container">
        <div class="marker-pin" style="
          width: ${size}px;
          height: ${size}px;
          background: ${color};
          border: 4px solid white;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        ">
          <div style="
            transform: rotate(45deg);
            color: white;
            font-weight: 700;
            font-size: ${isSelected ? 16 : 13}px;
            font-family: IBM Plex Mono, monospace;
          ">${station.no}</div>
        </div>
        ${isSelected ? `<div class="marker-pulse" style="
          position: absolute;
          top: 0;
          left: 0;
          width: ${size}px;
          height: ${size}px;
          background: ${color};
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          opacity: 0.6;
          animation: pulse 2s infinite;
        "></div>` : ''}
      </div>
    `,
    iconSize: [size, pinHeight],
    iconAnchor: [size / 2, pinHeight],
    popupAnchor: [0, -pinHeight],
  });
}

export default function NorthenTNBStation() {
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [filter, setFilter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [activeLayer, setActiveLayer] = useState('street');
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    fetch('/stations.kml')
      .then(r => r.text())
      .then(t => { setStations(parseKML(t)); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filteredStations = filter ? stations.filter(s => s.subzone === filter) : stations;
  const isStateLayer = activeLayer === 'states';
  const currentLayer = MAP_LAYERS[activeLayer];

  const handleExport = async () => {
    if (!mapContainerRef.current) return;
    setExporting(true);
    try {
      await new Promise(r => setTimeout(r, 400));
      const canvas = await html2canvas(mapContainerRef.current, { useCORS: true, allowTaint: true, scale: 2, logging: false, backgroundColor: '#ffffff' });
      const ctx = canvas.getContext('2d');
      const w = canvas.width, h = canvas.height, bh = 56;
      ctx.fillStyle = 'rgba(15,23,42,0.82)'; ctx.fillRect(0, h - bh, w, bh);
      ctx.fillStyle = '#ffffff'; ctx.font = `bold ${Math.round(w * 0.016)}px sans-serif`;
      ctx.fillText('TNB Northern Region Station Map', 20, h - bh + 22);
      ctx.fillStyle = '#f59e0b'; ctx.font = `${Math.round(w * 0.011)}px monospace`;
      const now = new Date().toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' });
      ctx.fillText(`Exported: ${now}  ·  ${filter ? `Zone: ${filter}` : 'All Zones'}  ·  ${filteredStations.length} stations  ·  Layer: ${currentLayer.label}`, 20, h - bh + 42);
      const link = document.createElement('a');
      link.download = `TNB_Northern_Map_${activeLayer}_${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png'); link.click();
    } catch { alert('Export failed.'); }
    setExporting(false);
  };

  return (
    <div className="north-container">
      <div className="north-wrapper">

        {/* HEADER */}
        <div className="north-header">
          <div className="north-logo">⚡</div>
          <div style={{ flex: 1 }}>
            <h1 className="north-title">TNB Northern Region Map</h1>
            <p className="north-subtitle">Live Station View · {stations.length} Stations</p>
          </div>
          <button className="north-export-btn" onClick={handleExport} disabled={exporting || loading}>
            {exporting ? <><span className="north-export-spinner" /> Exporting...</> : <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg> Export Map</>}
          </button>
        </div>

        {/* LAYER SWITCHER */}
        <div className="north-controls-row">
          <div className="north-layer-switcher">
            <span className="north-filter-label">Layer</span>
            {Object.entries(MAP_LAYERS).map(([key, layer]) => (
              <button key={key} className={`north-layer-btn ${activeLayer === key ? 'active' : ''}`}
                onClick={() => setActiveLayer(key)} title={layer.description}>
                <span className="north-layer-icon">{layer.icon}</span>
                <span className="north-layer-text">
                  <span className="north-layer-label">{layer.label}</span>
                  <span className="north-layer-desc">{layer.description}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ZONE FILTER */}
        <div className="north-filter">
          <span className="north-filter-label">Zone</span>
          {Object.entries(subzoneColors).map(([key, val]) => {
            const isActive = filter === key;
            const count = stations.filter(s => s.subzone === key).length;
            return (
              <button key={key} className={`north-filter-btn ${isActive ? 'active' : ''}`}
                style={isActive ? { background: val.bg, color: '#fff', borderColor: val.bg } : {}}
                onClick={() => setFilter(isActive ? null : key)} title={val.label}>
                <span className="north-filter-dot" style={{ background: val.bg }} />
                {key}
                <span style={{ fontSize: 11, opacity: 0.7, fontFamily: 'IBM Plex Mono,monospace' }}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* MAP */}
        {loading ? (
          <div className="north-loading">⚡ LOADING STATIONS...</div>
        ) : (
          <div className="north-map" ref={mapContainerRef}>
            <MapContainer center={[5.3, 100.8]} zoom={8} style={{ height: '620px', width: '100%' }}>
              <MapRef mapRef={mapRef} />
              <FitBounds stations={filteredStations} />

              {/* Tile layer */}
              <TileLayer
                key={activeLayer}
                url={currentLayer.url}
                attribution={currentLayer.attribution}
                maxZoom={currentLayer.maxZoom}
                crossOrigin="anonymous"
              />

              {/* State color polygons — only shown on states layer */}
              {isStateLayer && (
                <>
                  <Polygon
                    positions={PERAK}
                    pathOptions={{ color: STATE_COLORS.perak.stroke, fillColor: STATE_COLORS.perak.fill, fillOpacity: 0.55, weight: 2 }}
                  >
                    <Tooltip permanent direction="center" className="state-label-tooltip">PERAK</Tooltip>
                  </Polygon>

                  <Polygon
                    positions={KEDAH}
                    pathOptions={{ color: STATE_COLORS.kedah.stroke, fillColor: STATE_COLORS.kedah.fill, fillOpacity: 0.60, weight: 2 }}
                  >
                    <Tooltip permanent direction="center" className="state-label-tooltip">KEDAH</Tooltip>
                  </Polygon>

                  <Polygon
                    positions={LANGKAWI}
                    pathOptions={{ color: STATE_COLORS.kedah.stroke, fillColor: STATE_COLORS.kedah.fill, fillOpacity: 0.60, weight: 2 }}
                  >
                    <Tooltip permanent direction="center" className="state-label-tooltip">LANGKAWI</Tooltip>
                  </Polygon>

                  <Polygon
                    positions={PENANG_ISLAND}
                    pathOptions={{ color: STATE_COLORS.penang.stroke, fillColor: STATE_COLORS.penang.fill, fillOpacity: 0.70, weight: 2 }}
                  >
                    <Tooltip permanent direction="center" className="state-label-tooltip">PENANG</Tooltip>
                  </Polygon>

                  <Polygon
                    positions={PENANG_MAINLAND}
                    pathOptions={{ color: STATE_COLORS.penang.stroke, fillColor: STATE_COLORS.penang.fill, fillOpacity: 0.70, weight: 2 }}
                  />

                  <Polygon
                    positions={PERLIS}
                    pathOptions={{ color: STATE_COLORS.perlis.stroke, fillColor: STATE_COLORS.perlis.fill, fillOpacity: 0.65, weight: 2 }}
                  >
                    <Tooltip permanent direction="center" className="state-label-tooltip">PERLIS</Tooltip>
                  </Polygon>
                </>
              )}

              {/* Station markers with custom pin icons */}
              {filteredStations.map(station => {
                const color = subzoneColors[station.subzone]?.bg || '#dc2626';
                const isSelected = selectedStation?.no === station.no;
                
                return (
                  <Marker 
                    key={station.no} 
                    position={[station.lat, station.lng]} 
                    icon={createCustomIcon(station, color, isSelected)}
                    eventHandlers={{ click: () => setSelectedStation(station) }}
                  >
                    <Popup>
                      <div style={{ fontFamily: 'IBM Plex Sans,sans-serif', minWidth: 170 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: '#1a202c' }}>{station.name}</div>
                        <div style={{ fontSize: 12, color: '#555', marginBottom: 3 }}>BA: <b style={{ color: '#1a202c' }}>{station.ba}</b></div>
                        <div style={{ fontSize: 12 }}>Zone: <b style={{ color }}>{station.subzone}</b>
                          <span style={{ marginLeft: 6, fontSize: 11, color: '#888' }}>— {subzoneColors[station.subzone]?.label}</span>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>

            {/* Layer badge */}
            <div className="north-layer-badge">{currentLayer.icon} {currentLayer.description}</div>

            {/* State legend overlay — only on states layer */}
            {isStateLayer && (
              <div className="north-map-state-overlay-legend">
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>States</div>
                {Object.entries(STATE_COLORS).map(([key, val]) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 14, height: 14, borderRadius: 3, background: val.fill, opacity: 0.85, border: '1px solid rgba(255,255,255,0.25)', flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: '#e2e8f0', fontWeight: 500 }}>{val.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* INFO PANEL */}
        {selectedStation && (() => {
          const color = subzoneColors[selectedStation.subzone]?.bg || '#f59e0b';
          return (
            <div className="north-info">
              <div className="north-info-badge" style={{ borderColor: color }}>⚡</div>
              <div className="north-info-body">
                <p className="north-info-name">{selectedStation.name}</p>
                <div className="north-info-tags">
                  <span className="north-info-tag ba">BA: {selectedStation.ba}</span>
                  <span className="north-info-tag subzone" style={{ background: `${color}22`, color, borderColor: `${color}55` }}>
                    {subzoneColors[selectedStation.subzone]?.label || selectedStation.subzone}
                  </span>
                  <span className="north-info-tag subzone">#{selectedStation.no} of {stations.length}</span>
                </div>
              </div>
              <button className="north-info-close" onClick={() => setSelectedStation(null)}>✕ Close</button>
            </div>
          );
        })()}

      </div>
    </div>
  );
}