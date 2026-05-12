import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import '../styles/FieldMapperReview.css';

const BASE_URL = "http://localhost:8080/api";

export default function FieldMapperReview() {

    const { mappingId } = useParams();
    const navigate = useNavigate();

    const [fields, setFields] = useState({});
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [confirmed, setConfirmed] = useState(false);
    const [error, setError] = useState(null);

    // Fetch mapping data on mount
    useEffect(() => {
        const fetchMapping = async () => {
            try {
                const token = localStorage.getItem('authToken');
                const res = await axios.get(
                    `${BASE_URL}/letters/mapping/${mappingId}`,
                    { headers: { 'Authorization': `Bearer ${token}` } }
                );

                // Parse mappedFields JSON string into object
                const mapped = JSON.parse(res.data.mappedFields);
                setFields(mapped);

                // If already confirmed, set confirmed state
                if (res.data.status === 'confirmed') {
                    setConfirmed(true);
                }
            } catch (e) {
                setError('Failed to load mapping data.');
                console.error(e);
            } finally {
                setFetching(false);
            }
        };

        if (mappingId) fetchMapping();
    }, [mappingId]);

    const handleChange = (placeholder, value) => {
        setFields((prev) => ({ ...prev, [placeholder]: value }));
    };

    const handleConfirm = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            await axios.put(
                `${BASE_URL}/letters/mapping/confirm/${mappingId}`,
                fields,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            setConfirmed(true);
        } catch (e) {
            alert('Failed to confirm mapping: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    // Loading state
    if (fetching) {
        return (
            <div className="field-mapper-container">
                <p style={{ color: '#666' }}>Loading mapping data...</p>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="field-mapper-container">
                <p style={{ color: '#e53e3e' }}>{error}</p>
            </div>
        );
    }

    return (
        <div className="field-mapper-container">
            <h2 className="field-mapper-title">Review and Confirm Mapped Fields</h2>
            <p className="field-mapper-subtitle">
                Please review the extracted fields and make any necessary 
                corrections before confirming.
            </p>

            {confirmed ? (
                <div className="field-mapper-confirmed-card">
                    <p className="field-mapper-confirmed-text">
                        ✅ Mapping confirmed! You can now generate the letter.
                    </p>
                    <button
                        className="field-mapper-btn"
                        style={{ marginTop: 16 }}
                        onClick={() => navigate(`/staff/letter/generate/${mappingId}`)}
                    >
                        Generate Letter →
                    </button>
                </div>
            ) : (
                <div className="field-mapper-card">
                    {Object.entries(fields).map(([placeholder, value]) => (
                        <div key={placeholder} className="field-mapper-row">
                            <div className="field-mapper-placeholder">
                                {placeholder}
                            </div>
                            <div className="field-mapper-arrow">→</div>
                            <input
                                className="field-mapper-input"
                                value={value}
                                onChange={(e) =>
                                    handleChange(placeholder, e.target.value)
                                }
                                placeholder="Enter value..."
                            />
                        </div>
                    ))}

                    <button
                        className="field-mapper-btn"
                        onClick={handleConfirm}
                        disabled={loading}
                    >
                        {loading ? 'Confirming...' : 'Confirm Mapping'}
                    </button>
                </div>
            )}
        </div>
    );
}