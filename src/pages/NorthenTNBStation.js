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

// SBJ removed — TNB Seberang Jaya is now under P1
const subzoneColors = {
  P1:        { bg: '#2563eb', label: 'Pulau Pinang 1' },
  P2:        { bg: '#1d4ed8', label: 'Pulau Pinang 2' },
  'SGP/KLM': { bg: '#16a34a', label: 'Sungai Petani / Kulim' },
  'ALS/KAN': { bg: '#7c3aed', label: 'Alor Setar / Kangar' },
  A1:        { bg: '#ca8a04', label: 'Perak A1' },
  A2:        { bg: '#ea580c', label: 'Perak A2' },
  A3:        { bg: '#0d9488', label: 'Perak A3' },
};

// Terrain and States layers removed
const MAP_LAYERS = {
  street:    { label: 'Street',    icon: '🗺️', description: '2D Street Map',    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',                                              attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 },
  satellite: { label: 'Satellite', icon: '🛰️', description: '3D Satellite View', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: 'Tiles &copy; Esri',                 maxZoom: 19 },
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

// Component to auto-fit bounds to show all stations
function FitBounds({ stations }) {
  const map = useMap();
  useEffect(() => {
    if (stations.length > 0) {
      const bounds = L.latLngBounds(stations.map(s => [s.lat, s.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [stations, map]);
  return null;
}

// Function to create custom pin marker icon
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

        {/* LAYER SWITCHER — Street & Satellite only */}
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

        {/* ZONE FILTER — SBJ removed */}
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

              <TileLayer
                key={activeLayer}
                url={currentLayer.url}
                attribution={currentLayer.attribution}
                maxZoom={currentLayer.maxZoom}
                crossOrigin="anonymous"
              />

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