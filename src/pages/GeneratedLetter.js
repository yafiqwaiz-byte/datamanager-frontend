import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import '../styles/GeneratedLetter.css';

const BASE_URL = "http://localhost:8080/api";

export default function GeneratedLetters() {

    const { mappingId } = useParams();
    const navigate = useNavigate();

    const [letter, setLetter] = useState(null);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState(null);


    // Check if letter already generated on mount
    useEffect(() => {
        const fetchExistingLetter = async () => {
            try {
               const res = await authService.fetchWithAuth(`${BASE_URL}/letters/generated/${mappingId}`);
               const data = await res.json();
               if(data && data.length > 0){
                setLetter(data[0]);
               }
            } catch (e) {
                // No letter yet — that's fine
                console.log('No existing letter found');
            } finally {
                setFetching(false);
            }
        };

        if (mappingId) fetchExistingLetter();
    }, [mappingId]);

    const handleGenerate = async () => {
        setLoading(true);
        setError(null);
        try {const res = await authService.fetchWithAuth(`${BASE_URL}/letters/generate/${mappingId}`,{
            method: 'POST',
        });
        if (!res.ok) throw new Error('Generation Failed');
        const data = await res.json();
        setLetter(data);
    } catch (e) {
            setError("Generation failed: " + e.message);
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadDocx = () => {
        window.open(
            `${BASE_URL}/letters/download/docx/${letter.letterId}`,'_blank');
    };

    const handleDownloadPdf = () => {
        window.open(
            `${BASE_URL}/letters/download/pdf/${letter.letterId}`,'_blank');
    };

    // Loading state
    if (fetching) {
        return (
            <div className="generated-letters-container">
                <p style={{ color: '#666' }}>Loading...</p>
            </div>
        );
    }

    return (
        <div className="generated-letters-container">

            {/* Header */}
            <div className="generated-letters-header">
                <button
                    className="generated-letters-back"
                    onClick={() => navigate('/user-home')}
                >
                    ← Back
                </button>
                <h2 className="generated-letters-title">
                    Generate & Download Letter
                </h2>
            </div>

            <div className="generated-letters-card">
                {!letter ? (
                    <>
                        <p className="generated-letters-info">
                            Mapping is confirmed. Click below to generate
                            the letter in DOCX and PDF format.
                        </p>

                        {error && (
                            <p style={{ color: '#e53e3e', fontSize: 13,
                                        marginBottom: 16 }}>
                                {error}
                            </p>
                        )}

                        <button
                            className="generated-letters-btn"
                            onClick={handleGenerate}
                            disabled={loading}
                        >
                            {loading ? "Generating..." : "Generate Letter"}
                        </button>
                    </>
                ) : (
                    <>
                        <p className="generated-letters-success">
                            ✅ Letter generated successfully!
                        </p>

                        <p style={{ fontSize: 13, color: '#6b7280',
                                    marginBottom: 20 }}>
                            🕐 Generated at:{" "}
                            {new Date(letter.generatedAt)
                                .toLocaleString('en-MY')}
                        </p>

                        <div className="generated-letters-download-row">
                            <button
                                className="generated-letters-btn-docx"
                                onClick={handleDownloadDocx}
                            >
                                📄 Download DOCX
                            </button>
                            <button
                                className="generated-letters-btn-pdf"
                                onClick={handleDownloadPdf}
                            >
                                📑 Download PDF
                            </button>
                        </div>

                        {/* Regenerate option */}
                        <button
                            className="generated-letters-btn-secondary"
                            onClick={() => {
                                setLetter(null);
                                setError(null);
                            }}
                            style={{ marginTop: 12 }}
                        >
                            🔄 Regenerate
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}