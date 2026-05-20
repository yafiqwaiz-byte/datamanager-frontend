import React from "react";
import { useNavigate } from "react-router-dom";
import '../styles/Dashboard.css';
import '../styles/OcrSelectionPage.css';

export default function OcrSelectionPage() {
    const navigate = useNavigate();

    return (
        <div className="dashboard-container user-theme">
            <nav className="dashboard-nav">
                <div className="nav-brand">
                    <span className="brand-icon">⚡</span>
                    <span className="brand-name">DataManager</span>
                </div>
                <div className="nav-info">
                    <span className="nav-role user-badge">USER</span>
                    <button className="signout-btn" onClick={() => navigate('/user-home')}>← Back</button>
                </div>
            </nav>

            <main className="dashboard-main">
                <div className="welcome-section">
                    <h1 className="welcome-heading">OCR Services</h1>
                    <p className="welcome-subtitle">Choose the service you need</p>
                </div>

                <div className="menu-grid ocr-selection-grid">
                    {/* Basic OCR Scan Card */}
                    <div 
                        className="menu-card ocr-selection-card"
                        onClick={() => navigate('/user/ocr-scan')}
                        style={{ '--card-color': '#3b82f6' }}
                    >
                        <div className="ocr-card-content">
                            <div className="ocr-card-icon">🔍</div>
                            <h2 className="card-title ocr-card-title">OCR Scan</h2>
                            <p className="card-description ocr-card-description">
                                Extract text from images or documents. Get plain text output that you can copy and use anywhere.
                            </p>
                            
                            <ul className="ocr-features-list">
                                <li className="ocr-feature-item">
                                    <span className="ocr-check">✓</span> Upload image
                                </li>
                                <li className="ocr-feature-item">
                                    <span className="ocr-check">✓</span> Mapped into forms
                                </li>
                                <li className="ocr-feature-item">
                                    <span className="ocr-check">✓</span> Form generated
                                </li>
                            </ul>

                            <div className="ocr-badge ocr-badge-blue">
                                Simple Form Auto-Submission
                            </div>
                        </div>
                    </div>

                    {/* Generate Letter Card */}
                    <div 
                        className="menu-card ocr-selection-card"
                        onClick={() => navigate('/user/ocr-letter')}
                        style={{ '--card-color': '#10b981' }}
                    >
                        <div className="ocr-card-content">
                            <div className="ocr-card-icon">📝</div>
                            <h2 className="card-title ocr-card-title">Generate Letter</h2>
                            <p className="card-description ocr-card-description">
                                Upload a document, extract text, and automatically map fields to your letter template for instant generation.
                            </p>
                            
                            <ul className="ocr-features-list">
                                <li className="ocr-feature-item">
                                    <span className="ocr-check">✓</span> Select template
                                </li>
                                <li className="ocr-feature-item">
                                    <span className="ocr-check">✓</span> Extract text via OCR
                                </li>
                                <li className="ocr-feature-item">
                                    <span className="ocr-check">✓</span> Auto-map to template
                                </li>
                                <li className="ocr-feature-item">
                                    <span className="ocr-check">✓</span> Review & generate
                                </li>
                            </ul>

                            <div className="ocr-badge ocr-badge-green">
                                OCR + Auto-Mapping
                            </div>
                        </div>
                    </div>
                </div>

                {/* Info section */}
                <div className="ocr-info-box">
                    <p className="ocr-info-text">
                        💡 <strong>Tip:</strong> Use <strong>OCR Scan</strong> for quick text extraction from any document. 
                        Use <strong>Generate Letter</strong> when you need to map extracted data to a predefined template format.
                    </p>
                    <p className="ocr-info-text">
                        💡<strong>Tip:</strong> Gunakan <strong>OCR Scan</strong> sekiranya ingin mengisi borang atau lampiran secara automatik dan pantas.
                        Gunakan <strong>Generate Letter</strong> sekiranya ingin menghasilkan permindahan data yang akan dipetakan ke dalam format surat yang dikehendaki pengguna.
                    </p>
                </div>
            </main>
        </div>
    );
}