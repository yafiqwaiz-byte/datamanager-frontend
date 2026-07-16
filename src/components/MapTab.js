import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip as LeafletTooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { STATION_COORDS_BY_BA } from './StationCoords';

const MARK_COLOR = { 1: '#ef4444', 2: '#f59e0b', 3: '#22c55e' };
const MARK_LABEL = { 1: 'High', 2: 'Medium', 3: 'Low' };

function formatRM(value) {
    if (value == null) return 'RM 0.00';
    return `RM ${Number(value).toLocaleString('en-MY', {
        minimumFractionDigits: 2, maximumFractionDigits: 2
    })}`;
}

// Marker radius scales with outstanding value so the map itself communicates
// magnitude at a glance — clamped so a single huge outlier doesn't swallow
// the rest of the map. sqrt so *area* scales linearly with value, not radius.
function radiusForValue(value, maxValue) {
    if (!maxValue || maxValue <= 0) return 8;
    const minR = 7, maxR = 26;
    const ratio = Math.sqrt(Math.max(value, 0) / maxValue);
    return minR + ratio * (maxR - minR);
}

// Normalizes a BA code for lookup — station data may store it as a number
// (6231) or string ("6231") or with whitespace, so coerce consistently.
function normalizeBA(ba) {
    if (ba == null) return null;
    return String(ba).trim();
}

function MapLegend() {
    return (
        <div className="poa-map-legend">
            {[1, 2, 3].map(m => (
                <div key={m} className="poa-map-legend-item">
                    <span className="poa-map-legend-dot" style={{ background: MARK_COLOR[m] }} />
                    <span>{MARK_LABEL[m]} aging</span>
                </div>
            ))}
            <div className="poa-map-legend-hint">Bubble size = outstanding amount</div>
        </div>
    );
}

export default function MapTab({ data = [] }) {
    const [selectedMark, setSelectedMark] = useState(null);
    const [selectedStation, setSelectedStation] = useState(null);

    // Join each PO Aging station row against the KML-derived coordinate table
    // by BA (Business Area) code — a stable identifier, unlike station names
    // which can vary in formatting ("TNB IPOH" vs "Ipoh" vs punctuation).
    const { located, unmatched } = useMemo(() => {
        const located = [];
        const unmatched = [];
        for (const s of data) {
            const key = normalizeBA(s.busArea ?? s.ba);
            const coord = key ? STATION_COORDS_BY_BA[key] : null;
            if (coord) {
                located.push({ ...s, latitude: coord.lat, longitude: coord.lng });
            } else {
                unmatched.push(s);
            }
        }
        return { located, unmatched };
    }, [data]);

    const maxOutstanding = useMemo(
        () => located.reduce((max, s) => Math.max(max, s.updatedOutstandingValue || 0), 0),
        [located]
    );

    // Map center: average of all located stations, falls back to the
    // Northern Region's approximate center if nothing matched yet.
    const center = useMemo(() => {
        if (located.length === 0) return [5.2, 100.6];
        const avgLat = located.reduce((sum, s) => sum + s.latitude, 0) / located.length;
        const avgLng = located.reduce((sum, s) => sum + s.longitude, 0) / located.length;
        return [avgLat, avgLng];
    }, [located]);

    const visibleStations = useMemo(() => {
        let rows = located;
        if (selectedMark) rows = rows.filter(s => s.updatedMarks === selectedMark);
        return rows;
    }, [located, selectedMark]);

    const handleMarkerClick = (station) => {
        setSelectedStation(prev => (prev?.stationName === station.stationName ? null : station));
    };

    const handleLegendClick = (mark) => {
        setSelectedMark(prev => (prev === mark ? null : mark));
        setSelectedStation(null);
    };

    if (located.length === 0) {
        return (
            <div className="poa-section-card">
                <div className="poa-empty">
                    <span className="poa-empty-icon">🗺️</span>
                    <p className="poa-empty-title">No stations matched to the map</p>
                    <p className="poa-empty-desc">
                        None of the uploaded stations' BA codes matched the Northern Region
                        station list. Check that your PO data includes a Business Area
                        (BA) code matching one of the 32 mapped stations.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="poa-map-layout">
            <div className="poa-section-card poa-map-card">
                <div className="poa-section-header">
                    <span className="poa-section-title">🗺️ PO Aging by Station Location</span>
                    <span className="poa-section-badge">{located.length} mapped</span>
                </div>

                <div className="poa-map-toolbar">
                    {[1, 2, 3].map(m => (
                        <button
                            key={m}
                            className={`poa-map-filter-chip${selectedMark === m ? ' active' : ''}`}
                            style={{
                                borderColor: MARK_COLOR[m],
                                color: selectedMark === m ? '#fff' : MARK_COLOR[m],
                                background: selectedMark === m ? MARK_COLOR[m] : 'transparent',
                            }}
                            onClick={() => handleLegendClick(m)}
                        >
                            {MARK_LABEL[m]}
                        </button>
                    ))}
                    {(selectedMark || selectedStation) && (
                        <button
                            className="poa-map-clear-btn"
                            onClick={() => { setSelectedMark(null); setSelectedStation(null); }}
                        >
                            Clear filter ✕
                        </button>
                    )}
                </div>

                <div className="poa-map-container">
                    <MapContainer
                        center={center}
                        zoom={located.length > 1 ? 8 : 12}
                        scrollWheelZoom={true}
                        style={{ height: '100%', width: '100%' }}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {located
                            .filter(s => !selectedMark || s.updatedMarks === selectedMark)
                            .map((station, i) => (
                                <CircleMarker
                                    key={station.stationName ?? i}
                                    center={[station.latitude, station.longitude]}
                                    radius={radiusForValue(station.updatedOutstandingValue, maxOutstanding)}
                                    pathOptions={{
                                        color: MARK_COLOR[station.updatedMarks] || '#6b7280',
                                        fillColor: MARK_COLOR[station.updatedMarks] || '#6b7280',
                                        fillOpacity: selectedStation && selectedStation.stationName !== station.stationName ? 0.25 : 0.55,
                                        weight: selectedStation?.stationName === station.stationName ? 3 : 1.5,
                                    }}
                                    eventHandlers={{ click: () => handleMarkerClick(station) }}
                                >
                                    <LeafletTooltip direction="top" offset={[0, -4]} opacity={1}>
                                        {station.stationName}
                                    </LeafletTooltip>
                                    <Popup>
                                        <div className="poa-map-popup">
                                            <p className="poa-map-popup-title">{station.stationName}</p>
                                            <p className="poa-map-popup-row">
                                                <span>Outstanding</span>
                                                <strong>{formatRM(station.updatedOutstandingValue)}</strong>
                                            </p>
                                            <p className="poa-map-popup-row">
                                                <span>PO &gt; 180 days</span>
                                                <strong>{station.updatedCountPOOver180}</strong>
                                            </p>
                                            <p className="poa-map-popup-row">
                                                <span>Aging</span>
                                                <strong style={{ color: MARK_COLOR[station.updatedMarks] }}>
                                                    {MARK_LABEL[station.updatedMarks] || '—'}
                                                </strong>
                                            </p>
                                        </div>
                                    </Popup>
                                </CircleMarker>
                            ))}
                    </MapContainer>
                </div>

                <MapLegend />

                {unmatched.length > 0 && (
                    <p className="poa-map-missing-note">
                        ℹ️ {unmatched.length} station{unmatched.length > 1 ? 's' : ''} not shown —
                        BA code didn't match the Northern Region station list.
                    </p>
                )}
            </div>

            {/* ── Filtered table — same cross-filter pattern used by the
                 bar/pie charts elsewhere in this dashboard, so clicking the
                 map behaves consistently with the rest of the UI. ── */}
            <div className="poa-section-card poa-map-table-card">
                <div className="poa-section-header">
                    <span className="poa-section-title">
                        {selectedStation
                            ? `📍 ${selectedStation.stationName}`
                            : selectedMark
                                ? `${MARK_LABEL[selectedMark]} Aging Stations`
                                : 'All Mapped Stations'}
                    </span>
                    <span className="poa-section-badge">{visibleStations.length}</span>
                </div>
                <div className="poa-table-wrap poa-map-table-wrap">
                    <table className="poa-table">
                        <thead>
                            <tr>
                                <th>Station</th>
                                <th>PO &gt; 180</th>
                                <th>Outstanding</th>
                                <th>Mark</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleStations
                                .filter(s => !selectedStation || s.stationName === selectedStation.stationName)
                                .map((s, i) => (
                                    <tr
                                        key={s.stationName ?? i}
                                        className="poa-map-table-row"
                                        onClick={() => handleMarkerClick(s)}
                                    >
                                        <td style={{ fontWeight: 500 }}>{s.stationName}</td>
                                        <td className="muted">{s.updatedCountPOOver180}</td>
                                        <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 11 }}>
                                            {formatRM(s.updatedOutstandingValue)}
                                        </td>
                                        <td>
                                            <span
                                                className="poa-map-mark-pill"
                                                style={{
                                                    background: `${MARK_COLOR[s.updatedMarks]}1a`,
                                                    color: MARK_COLOR[s.updatedMarks],
                                                }}
                                            >
                                                {MARK_LABEL[s.updatedMarks] || '—'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            {visibleStations.length === 0 && (
                                <tr>
                                    <td colSpan={4} style={{ textAlign: 'center', color: '#9ca3af', padding: '20px 0' }}>
                                        No stations match this filter.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}