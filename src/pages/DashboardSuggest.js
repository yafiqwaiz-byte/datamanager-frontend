import { useState } from "react";
import { authService } from "../services/authService";

const BASE_URL = "http://localhost:8080/api";

export default function DashboardSuggest({ excelId, onSuggestionsReady }) {

    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState(null);
    const [error, setError] = useState(null);
    const [cooldown,setCooldown] = useState(false);
    const [cooldownSecs,setCooldownSecs] = useState(0);


    const startcooldown = (seconds =60) => {
        setCooldown(true);
        setCooldownSecs(seconds);
        const timer = setInterval(() =>{
            setCooldownSecs(prev => {
                if(prev <= 1){
                clearInterval(timer);
                setCooldown(false);
                return 0;
            }
            return prev -1;
            });
        },1000);
    };

    const handleAnalyze = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await authService.fetchWithAuth(
                `${BASE_URL}/ai/analyze/${excelId}`
            );

            if(res.status === 429){
                const errData = await res.json();
                setError('⚠️ AI service is busy. Please wait 1 minute and try again.');
                startcooldown(60);
                return;
            }

            if(!res.ok){
                const errData = await res.json();
                setError(errData.message || 'Analysis failed');
                return;
            }

            const data = await res.json();

            if (data.error){
                setError(data.message || 'Analysis failed.');
                return;
            }

            setAnalysis(data);
            if (onSuggestionsReady) onSuggestionsReady(data);
        } catch (e) {
            setError("AI analysis failed: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: 16, background: '#f9fafb', 
                      borderRadius: 8, marginTop: 16 }}>
            
            <h3 style={{ margin: '0 0 8px' }}>🤖 AI Dashboard Assistant</h3>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 12px' }}>
                Let AI analyze your data and suggest the best dashboard charts
            </p>

            <button
                onClick={handleAnalyze}
                disabled={loading || cooldown}
                style={{
                    background:  cooldown ? '#6b7280' : '#4f46e5', color: 'white',
                    border: 'none', padding: '8px 16px',
                    borderRadius: 6, cursor: loading || cooldown ? 'not-allowed' : 'pointer',
                    fontSize: 14,
                    transition: 'background 0.2s'
                }}
            > 
            {cooldown
                ? `⏳ Wait ${cooldownSecs}s...`
                : loading
                    ? '🔍 Analyzing...'
                    : '✨ Analyze & Suggest Dashboard'}
            </button>

            {error && (
                <p style={{ color: 'red', fontSize: 13, marginTop: 8 }}>
                    {error}
                </p>
            )}

            {analysis && (
                <div style={{ marginTop: 16 }}>
                    {/* Dataset Type */}
                    <div style={{ 
                        background: '#ede9fe', padding: 8, 
                        borderRadius: 6, marginBottom: 12 
                    }}>
                        <strong>📊 Dataset Type:</strong> {analysis.datasetType}
                    </div>

                    {/* Key Insights */}
                    {analysis.keyInsights && (
                        <div style={{ marginBottom: 12 }}>
                            <strong>💡 Key Insights:</strong>
                            <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                                {analysis.keyInsights.map((insight, i) => (
                                    <li key={i} style={{ fontSize: 13 }}>
                                        {insight}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Suggested Charts */}
                    {analysis.suggestedCharts && (
                        <div>
                            <strong>📈 Suggested Charts:</strong>
                            <div style={{ marginTop: 8 }}>
                                {analysis.suggestedCharts.map((chart, i) => (
                                    <div key={i} style={{
                                        background: 'white',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: 6,
                                        padding: 10,
                                        marginBottom: 8
                                    }}>
                                        <div style={{ 
                                            fontWeight: 600, fontSize: 14 
                                        }}>
                                            {chart.title}
                                        </div>
                                        <div style={{ 
                                            fontSize: 12, color: '#6b7280',
                                            marginTop: 2 
                                        }}>
                                            Type: {chart.type} | 
                                            Column: {chart.column} | 
                                            Aggregation: {chart.aggregation}
                                        </div>
                                        <div style={{ 
                                            fontSize: 12, color: '#374151',
                                            marginTop: 4 
                                        }}>
                                            {chart.description}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Recommended Columns */}
                    {analysis.recommendedColumns && (
                        <div style={{ marginTop: 12 }}>
                            <strong>⭐ Key Columns:</strong>
                            <div style={{ 
                                display: 'flex', flexWrap: 'wrap', 
                                gap: 6, marginTop: 4 
                            }}>
                                {analysis.recommendedColumns.map((col, i) => (
                                    <span key={i} style={{
                                        background: '#dbeafe',
                                        padding: '2px 8px',
                                        borderRadius: 12,
                                        fontSize: 12
                                    }}>
                                        {col}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}