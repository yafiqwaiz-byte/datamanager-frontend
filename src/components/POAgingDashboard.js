import React, { useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, PieChart, Pie, Cell, Legend,
    ResponsiveContainer
} from 'recharts';
import { authService } from '../services/authService';
import '../styles/POAgingDashboard.css';

const API = 'http://localhost:8080/api';

// ── Mark colour helpers ────────────────────────────────────────────────────────
const MARK_CLASS = { 1: 'm1', 2: 'm2', 3: 'm3' };
const MARK_COLOR = { 1: '#ef4444', 2: '#f59e0b', 3: '#22c55e' };
const MARK_LABEL = { 1: 'High', 2: 'Medium', 3: 'Low' };

// ── Small reusable pieces ──────────────────────────────────────────────────────
function MarkBadge({ mark }) {
    return (
        <span className={`poa-mark ${MARK_CLASS[mark] || 'm3'}`}>
            {mark}
        </span>
    );
}

function ProgressBar({ pct, mark }) {
    const cls = MARK_CLASS[mark] || 'm3';
    return (
        <div className="poa-progress-wrap">
            <div className="poa-progress-bar">
                <div
                    className={`poa-progress-fill ${cls}`}
                    style={{ width: `${Math.min(pct || 0, 100)}%` }}
                />
            </div>
            <span className="poa-progress-pct">{(pct || 0).toFixed(1)}%</span>
        </div>
    );
}

function DiffPill({ original, updated }) {
    const cleared = (original || 0) - (updated || 0);
    if (cleared <= 0) return null;
    return (
        <span className="poa-diff-pill positive">
            ↓ {cleared} cleared
        </span>
    );
}

// ── Partial payment pill ───────────────────────────────────────────────────────
function PartialPill({ count }) {
    if (!count || count <= 0) return null;
    return (
        <span className="poa-diff-pill" style={{
            background: '#fefce8', color: '#854f0b',
            border: '0.5px solid #fde68a'
        }}>
            ⏳ {count} partial
        </span>
    );
}

function formatRM(value) {
    if (value == null) return 'RM 0.00';
    return `RM ${Number(value).toLocaleString('en-MY', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function POAgingDashboard() {
    const [dashboard, setDashboard] = useState(null);
    const [uploadId, setUploadId]   = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading]     = useState(false);
    const [error, setError]         = useState(null);
    const [analyze,setAnalyzing]    = useState(false);
    const [cooldown,setCooldown]    = useState(0);
    const [analysis,setAnalysis]    = useState(null);

    // ── Upload raw PO file ─────────────────────────────────────────────────────
    const handleRawUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        e.target.value = '';
        setLoading(true);
        setError(null);

        try {
            const fd = new FormData();
            fd.append('file', file);

            const res = await authService.fetchWithAuth(
                `${API}/po-aging/upload/raw`,
                { method: 'POST', body: fd }
            );
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'PO processing failed');
            }
            const data = await res.json();
            setUploadId(data.uploadId);   // uploadId returned by backend
            setDashboard(data);
            setActiveTab('overview');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // ── Upload cleared PO file ─────────────────────────────────────────────────
    const handleClearedUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !uploadId) return;
        e.target.value = '';
        setLoading(true);
        setError(null);

        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await authService.fetchWithAuth(
                `${API}/po-aging/upload/cleared/${uploadId}`,
                { method: 'POST', body: fd }
            );
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Update failed');
            }
            const data = await res.json();
            setDashboard(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const TABS = [
        { key: 'overview', label: '📊 Overview'  },
        { key: 'stations', label: '📍 Stations'  },
        { key: 'subzone',  label: '🗺️ Subzone'   },
        { key: 'table',    label: '📋 Table'      },
    ];

    // Has cleared file been uploaded? (any PO fully cleared or partially paid)
    const hasClearedData = dashboard &&
        ((dashboard.totalPOCleared || 0) > 0 ||
         (dashboard.totalPOPartiallyPaid || 0) > 0);

    const handleAnalyze = async () => {
    if (!uploadId) return;
    setAnalyzing(true);
    setAnalysis(null);

    try {
        const res = await authService.fetchWithAuth(
            `${API}/gemini/analyze/po-aging/${uploadId}`,
            { method: 'POST' }
        );

        if (res.status === 429) {
            const data = await res.json();
            let secs = 60;
            setCooldown(secs);
            const timer = setInterval(() => {
                secs -= 1;
                setCooldown(secs);
                if(secs <=0) clearInterval(timer);
            },1000);
            throw new Error(data.message || 'AI Service busy. Please wait 1 minute.');
        }

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.message || 'Analysis failed');
        }

        const data = await res.json();
        setAnalysis(data);
    } catch (error) {
        setError(error.message);
    } finally {
        setAnalyzing(false);
    }
};

    return (
        <>
            {/* ── Upload Row ─────────────────────────────────────────────────── */}
            <div className="poa-upload-row">

                {/* Raw upload */}
                <div className="poa-upload-card">
                    <p className="poa-upload-title">📁 Raw PO Data</p>
                    <p className="poa-upload-desc">
                        Upload the full PO outstanding Excel file.
                        Stations with &gt;180 days will be extracted automatically.
                    </p>
                    <label>
                        <span
                            className={`poa-upload-btn primary${loading ? ' disabled' : ''}`}
                            style={{ display: 'block' }}
                        >
                            {loading ? (
                                <span style={{ display: 'flex', alignItems: 'center',
                                               justifyContent: 'center', gap: 6 }}>
                                    <span className="poa-spinner" />
                                    Processing…
                                </span>
                            ) : '📤 Upload Excel File'}
                        </span>
                        <input
                            type="file" accept=".xlsx,.xls"
                            onChange={handleRawUpload}
                            disabled={loading}
                            style={{ display: 'none' }}
                        />
                    </label>
                </div>

                {/* Cleared upload */}
                <div className="poa-upload-card">
                    <p className="poa-upload-title">✅ Cleared PO Update</p>
                    <p className="poa-upload-desc">
                        Upload cleared PO file with&nbsp;<strong>PO No.</strong>&nbsp;
                        and&nbsp;<strong>GR/SA Value</strong>&nbsp;columns to
                        update outstanding amounts automatically.
                    </p>
                    <label>
                        <span
                            className={`poa-upload-btn success${!uploadId || loading ? ' disabled' : ''}`}
                            style={{
                                display: 'block',
                                opacity: !uploadId ? 0.4 : 1,
                                cursor: !uploadId ? 'not-allowed' : 'pointer'
                            }}
                        >
                            📤 Upload Cleared File
                        </span>
                        <input
                            type="file" accept=".xlsx,.xls"
                            onChange={handleClearedUpload}
                            disabled={!uploadId || loading}
                            style={{ display: 'none' }}
                        />
                    </label>
                    {!uploadId && (
                        <p className="poa-upload-hint">
                            Upload raw data first to enable this.
                        </p>
                    )}
                </div>
            </div>

            {/* ── Error banner ───────────────────────────────────────────────── */}
            {error && (
                <div className="poa-alert error">
                    <span>⚠️ {error}</span>
                    <button className="poa-alert-close" onClick={() => setError(null)}>✕</button>
                </div>
            )}

            {/* ── Empty state ────────────────────────────────────────────────── */}
            {!dashboard && !loading && (
                <div className="sl-activity-card">
                    <div className="poa-empty">
                        <span className="poa-empty-icon">📊</span>
                        <p className="poa-empty-title">No data yet</p>
                        <p className="poa-empty-desc">
                            Upload a PO outstanding Excel file to generate the dashboard.
                        </p>
                    </div>
                </div>
            )}

            {/* ── Dashboard ──────────────────────────────────────────────────── */}
            {dashboard && (
                <>
                    {/* ── KPI Row ────────────────────────────────────────────── */}
                    <div className="poa-kpi-row">
                        <KPICard
                            icon="⚠️"
                            colorClass="red"
                            value={dashboard.updatedTotalPOOver180}
                            label="PO > 180 Days"
                            updated={dashboard.totalPOOver180 !== dashboard.updatedTotalPOOver180
                                ? `was ${dashboard.totalPOOver180}` : null}
                        />
                        <KPICard
                            icon="💰"
                            colorClass="amber"
                            value={formatRM(dashboard.updatedTotalOutstandingValue)}
                            label="Total Outstanding"
                            updated={hasClearedData
                                ? `${formatRM(dashboard.totalClearedAmount)} cleared`
                                : null}
                        />
                        <KPICard
                            icon="✅"
                            colorClass="green"
                            value={dashboard.totalPOCleared || 0}
                            label="Fully Cleared POs"
                            updated={(dashboard.totalPOPartiallyPaid || 0) > 0
                                ? `${dashboard.totalPOPartiallyPaid} partially paid`
                                : null}
                        />
                        <KPICard
                            icon="🔴"
                            colorClass="red"
                            value={`${dashboard.highAgingStations} stations`}
                            label="High Aging (Mark 1)"
                        />
                    </div>

                    {/* ── Percentile info ────────────────────────────────────── */}
                    <div className="poa-percentile-row">
                        <span className="poa-percentile-label">
                            Percentile thresholds:
                        </span>
                        <span className="poa-percentile-chip p33">
                            33rd — {(dashboard.percentile33 || 0).toFixed(1)}%
                        </span>
                        <span className="poa-percentile-divider">→</span>
                        <span className="poa-percentile-chip p66">
                            66th — {(dashboard.percentile66 || 0).toFixed(1)}%
                        </span>
                        <span className="poa-percentile-label" style={{ marginLeft: 'auto' }}>
                            ≤ 33rd = Mark 3 · ≤ 66th = Mark 2 · &gt; 66th = Mark 1
                        </span>
                    </div>

                    {/* ── Tabs ───────────────────────────────────────────────── */}
                    <div className="poa-tabs">
                        {TABS.map(t => (
                            <button
                                key={t.key}
                                className={`poa-tab${activeTab === t.key ? ' active' : ''}`}
                                onClick={() => setActiveTab(t.key)}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* ── Tab content ────────────────────────────────────────── */}
                    {activeTab === 'overview' && <OverviewTab dashboard={dashboard} />}
                    {activeTab === 'stations' && <StationsTab data={dashboard.stationData} />}
                    {activeTab === 'subzone'  && <SubzoneTab  data={dashboard.subzoneSummary} />}
                    {activeTab === 'table'    && <TableTab    data={dashboard.stationData} />}

                 {/* ── Analyze Button — below chart tabs ─────────────────────────────── */}
                {dashboard && (
                    <div className="poa-analyze-row">
                        <button
                            className="poa-analyze-btn"
                            onClick={handleAnalyze}
                            disabled={analyze || !uploadId}
                        >
                            {analyze ? (
                                <>
                                    <span className="poa-spinner" />
                                    Analyzing…
                                </>
                            ) : '🤖 Analyze Dashboard'}
                        </button>
                    </div>
                )}

                {/* ── Analysis Result Panel ──────────────────────────────────────────── */}
                {analysis && (
                    <div className="poa-analysis-panel">
                        <div className="poa-analysis-header">
                            <span className="poa-analysis-title">🤖 AI Analysis</span>
                            <span className="poa-analysis-badge">Gemini</span>
                        </div>
                        <p className="poa-analysis-body">{analysis}</p>
                    </div>
                )}
                </>
                
            )}
        </>
    );
}

// ── KPI Card ───────────────────────────────────────────────────────────────────
function KPICard({ icon, colorClass, value, label, updated }) {
    return (
        <div className={`poa-kpi-card ${colorClass}`}>
            <span className="poa-kpi-icon">{icon}</span>
            <div className="poa-kpi-value">{value}</div>
            {updated && <div className="poa-kpi-updated">↓ {updated}</div>}
            <div className="poa-kpi-label">{label}</div>
        </div>
    );
}

// ── Overview Tab ───────────────────────────────────────────────────────────────
function OverviewTab({ dashboard }) {
    const pieData = [
        { name: 'High Aging (1)',   value: dashboard.highAgingStations,   color: '#ef4444' },
        { name: 'Medium Aging (2)', value: dashboard.mediumAgingStations, color: '#f59e0b' },
        { name: 'Low Aging (3)',    value: dashboard.lowAgingStations,    color: '#22c55e' },
    ].filter(d => d.value > 0);

    const top10 = (dashboard.stationData || []).slice(0, 10);

    return (
        <div className="poa-chart-grid">
            {/* Pie — mark distribution */}
            <div className="poa-section-card">
                <div className="poa-section-header">
                    <span className="poa-section-title">🎯 Mark Distribution</span>
                    <span className="poa-section-badge">{dashboard.totalStations} stations</span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%"
                             innerRadius={55} outerRadius={85}
                             paddingAngle={3} dataKey="value">
                            {pieData.map((entry, i) => (
                                <Cell key={i} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(val, name) => [`${val} stations`, name]}
                            contentStyle={{ fontSize: 12, borderRadius: 8 }}
                        />
                        <Legend iconType="circle" iconSize={8}
                                wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Bar — top 10 stations by PO count */}
            <div className="poa-section-card">
                <div className="poa-section-header">
                    <span className="poa-section-title">📊 Top Stations by PO Count</span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={top10}
                              margin={{ top: 0, right: 0, left: -20, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f7" />
                        <XAxis dataKey="stationName" tick={{ fontSize: 9 }}
                               angle={-40} textAnchor="end" interval={0} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip
                            contentStyle={{ fontSize: 12, borderRadius: 8 }}
                            formatter={(val) => [val, 'PO > 180 days']}
                        />
                        <Bar dataKey="updatedCountPOOver180"
                             name="PO > 180 Days" radius={[4, 4, 0, 0]}>
                            {top10.map((entry, i) => (
                                <Cell key={i}
                                      fill={MARK_COLOR[entry.updatedMarks] || '#6b7280'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

// ── Stations Tab ───────────────────────────────────────────────────────────────
function StationsTab({ data = [] }) {
    return (
        <div className="poa-section-card">
            <div className="poa-section-header">
                <span className="poa-section-title">📍 Outstanding Amount by Station</span>
            </div>
            <ResponsiveContainer width="100%"
                                 height={Math.max(300, data.length * 22)}>
                <BarChart
                    data={[...data].sort(
                        (a, b) => (b.updatedOutstandingValue || 0) -
                                  (a.updatedOutstandingValue || 0)
                    )}
                    layout="vertical"
                    margin={{ top: 0, right: 16, left: 130, bottom: 0 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f7" />
                    <XAxis type="number" tick={{ fontSize: 10 }}
                           tickFormatter={v =>
                               v >= 1_000_000
                                   ? `RM ${(v / 1_000_000).toFixed(1)}M`
                                   : `RM ${(v / 1_000).toFixed(0)}K`
                           } />
                    <YAxis dataKey="stationName" type="category"
                           width={125} tick={{ fontSize: 10 }} />
                    <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                        formatter={v => [formatRM(v), 'Outstanding']}
                    />
                    <Bar dataKey="updatedOutstandingValue" radius={[0, 4, 4, 0]}>
                        {data.map((entry, i) => (
                            <Cell key={i}
                                  fill={MARK_COLOR[entry.updatedMarks] || '#6b7280'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

// ── Subzone Tab ────────────────────────────────────────────────────────────────
function SubzoneTab({ data = [] }) {
    return (
        <div className="poa-subzone-grid">
            {data.map((sz, i) => (
                <div key={i}
                     className={`poa-subzone-card ${MARK_CLASS[sz.marks] || 'm3'}`}>
                    <div className="poa-subzone-header">
                        <span className="poa-subzone-code">{sz.subzone}</span>
                        <MarkBadge mark={sz.marks} />
                    </div>
                    <p className="poa-subzone-label">{sz.subzoneLabel}</p>

                    <div className="poa-subzone-divider" />

                    <div className="poa-subzone-stats">
                        <div className="poa-subzone-stat">
                            <span className="poa-subzone-stat-label">Stations</span>
                            <span className="poa-subzone-stat-value">{sz.totalStations}</span>
                        </div>
                        <div className="poa-subzone-stat">
                            <span className="poa-subzone-stat-label">PO &gt; 180</span>
                            <span className="poa-subzone-stat-value">
                                {sz.updatedTotalPOOver180}
                                {sz.totalPOOver180 !== sz.updatedTotalPOOver180 && (
                                    <span style={{ color: '#22c55e', fontWeight: 600,
                                                   marginLeft: 4, fontSize: 10 }}>
                                        ↓{sz.totalPOOver180 - sz.updatedTotalPOOver180}
                                    </span>
                                )}
                            </span>
                        </div>
                        <div className="poa-subzone-stat">
                            <span className="poa-subzone-stat-label">Outstanding</span>
                            <span className="poa-subzone-stat-value" style={{ fontSize: 10 }}>
                                {formatRM(sz.updatedOutstandingValue)}
                            </span>
                        </div>
                    </div>

                    <div className="poa-subzone-divider" style={{ marginTop: 8 }} />

                    {/* Mini mark breakdown */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                        {[
                            { m: 1, count: sz.highAgingCount },
                            { m: 2, count: sz.mediumAgingCount },
                            { m: 3, count: sz.lowAgingCount },
                        ].map(({ m, count }) => (
                            <div key={m} style={{ display: 'flex',
                                                  alignItems: 'center', gap: 3 }}>
                                <MarkBadge mark={m} />
                                <span style={{ fontSize: 10, color: '#6b7280' }}>
                                    ×{count || 0}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ── Table Tab ──────────────────────────────────────────────────────────────────
function TableTab({ data = [] }) {
    return (
        <div className="poa-section-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="poa-table-wrap">
                <table className="poa-table">
                    <thead>
                        <tr>
                            <th>Station</th>
                            <th>BA</th>
                            <th>Subzone</th>
                            <th>PO &gt; 180</th>
                            <th>Updated</th>
                            <th>Outstanding (RM)</th>
                            <th>% Aging</th>
                            <th>Mark</th>
                            <th>Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, i) => (
                            <tr key={i}>
                                <td style={{ fontWeight: 500 }}>{row.stationName}</td>
                                <td className="muted">{row.busArea}</td>
                                <td>
                                    <span className="sl-type-badge">{row.subzone}</span>
                                </td>
                                <td className="muted">{row.countPOOver180}</td>
                                <td>
                                    <div style={{ display: 'flex',
                                                  alignItems: 'center', gap: 4,
                                                  flexWrap: 'wrap' }}>
                                        <span style={{ fontWeight: 600 }}>
                                            {row.updatedCountPOOver180}
                                        </span>
                                        <DiffPill
                                            original={row.countPOOver180}
                                            updated={row.updatedCountPOOver180}
                                        />
                                        <PartialPill count={row.partiallyPaidCount} />
                                    </div>
                                </td>
                                <td style={{ fontFamily: 'DM Mono, monospace',
                                             fontSize: 11 }}>
                                    {formatRM(row.updatedOutstandingValue)}
                                    {/* Show cleared amount if any */}
                                    {(row.totalClearedAmount || 0) > 0 && (
                                        <div style={{ fontSize: 10, color: '#22c55e',
                                                      marginTop: 2 }}>
                                            -{formatRM(row.totalClearedAmount)} cleared
                                        </div>
                                    )}
                                </td>
                                <td>
                                    <ProgressBar
                                        pct={row.updatedPercentAging}
                                        mark={row.updatedMarks}
                                    />
                                </td>
                                <td>
                                    <div style={{ display: 'flex',
                                                  alignItems: 'center', gap: 6 }}>
                                        <MarkBadge mark={row.updatedMarks} />
                                        <span style={{ fontSize: 10, color: '#6b7280' }}>
                                            {MARK_LABEL[row.updatedMarks]}
                                        </span>
                                    </div>
                                </td>
                                {/* Remarks — shows cleared/partial summary */}
                                <td style={{ fontSize: 11, color: '#6b7280',
                                             maxWidth: 200, whiteSpace: 'normal',
                                             lineHeight: 1.4 }}>
                                    {row.remarks || '—'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}