import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import '../styles/Auth.css';
import { Link } from "react-router-dom";
import AuthCircuitGrid from "../components/AuthCircuitGrid";

export default function ForgotPassword() {

    const [step, setStep] = useState(1);
    const [username, setUsername] = useState('');
    const [securityQuestion, setSecurityQuestion] = useState('');
    const [securityAnswer, setSecurityAnswer] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleFindAccount = async () => {

        if (!username) {
            setError('Please enter your username'); return;
        } setLoading(true); setError('');

        try {
            const res = await fetch(`http://localhost:8080/api/accounts/security-question/${username}`);
            if (!res.ok) throw new Error('Username not found');
            const data = await res.json();
            setSecurityQuestion(data.securityQuestion);
            setStep(2);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyAnswer = async () => {
        if (!securityAnswer) {
            setError('Please enter your answer'); return;
        }
        setError('');
        setStep(3);
    };

    const handleResetPassword = async () => {
        if (!newPassword || !confirmPassword) {
            setError('Please fill in all fields'); return;
        }
        if (newPassword !== confirmPassword) {
            setError('Password do not match'); return;
        }
        if (newPassword.length < 6) {
            setError('Password at least 6 characters'); return;
        }

        setLoading(true); setError('');

        try {
            const res = await fetch('http://localhost:8080/api/accounts/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, securityAnswer, newPassword })
            });
            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg || 'Reset Failed');
            }
            alert('Password reset successfully');
            navigate('/signin');
        } catch (e) {
            setError(e.message);
            setStep(2);
        } finally {
            setLoading(false);
        }
    }

    const STEP_COPY = {
        1: {
            eyebrow: 'Account recovery',
            headline: "Let's find your account.",
            sub: "Enter your username and we'll look up the security question on file for your account.",
        },
        2: {
            eyebrow: 'Account recovery',
            headline: 'Verify it\'s really you.',
            sub: 'Answer the security question you set when you created your account.',
        },
        3: {
            eyebrow: 'Account recovery',
            headline: 'Choose a new password.',
            sub: 'Pick something you haven\'t used before — at least 6 characters.',
        },
    };

    return (
        <div className="auth-container">

            {/* ── LEFT — illustrated panel ──────────────────────────────────── */}
            <div className="auth-panel">
                <AuthCircuitGrid />
                <div className="auth-panel-fade" />

                <div className="auth-panel-logo">
                    <div className="auth-panel-logo-icon">⚡</div>
                    <span className="auth-panel-logo-text">DataManager</span>
                </div>

                <div className="auth-panel-caption">
                    <div className="auth-panel-eyebrow">
                        <span className="auth-panel-eyebrow-dot" />
                        {STEP_COPY[step].eyebrow}
                    </div>
                    <h2 className="auth-panel-headline">
                        {STEP_COPY[step].headline}
                    </h2>
                    <p className="auth-panel-sub">
                        {STEP_COPY[step].sub}
                    </p>
                </div>
            </div>

            {/* ── RIGHT — form panel ────────────────────────────────────────── */}
            <div className="auth-form-panel">
                <div className="auth-card">
                    <div className="auth-card-top">
                        <h1>Forgot password</h1>
                        <p className="auth-subtitle">Reset your password in 3 steps</p>
                    </div>

                    {/* Step indicators */}
                    <div className="auth-step-row">
                        {[1, 2, 3].map(s => (
                            <React.Fragment key={s}>
                                <div className={`auth-step-dot${step >= s ? ' active' : ''}`}>
                                    {step > s ? '✓' : s}
                                </div>
                                {s < 3 && (
                                    <div className={`auth-step-line${step > s ? ' active' : ''}`} />
                                )}
                            </React.Fragment>
                        ))}
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    {/* Step 1 — Enter username */}
                    {step === 1 && (
                        <div>
                            <div className="form-group">
                                <label>Username</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    placeholder="Enter your username"
                                    onKeyDown={e => e.key === 'Enter' && handleFindAccount()}
                                />
                            </div>
                            <button className="btn btn-primary" onClick={handleFindAccount} disabled={loading}>
                                {loading ? 'Finding…' : 'Find Account'}
                            </button>
                        </div>
                    )}

                    {/* Step 2 — Answer security question */}
                    {step === 2 && (
                        <div>
                            <div className="auth-question-box">
                                <span className="auth-question-label">Security question</span>
                                <p className="auth-question-text">{securityQuestion}</p>
                            </div>
                            <div className="form-group">
                                <label>Your answer</label>
                                <input
                                    type="text"
                                    value={securityAnswer}
                                    onChange={e => setSecurityAnswer(e.target.value)}
                                    placeholder="Enter your answer"
                                    onKeyDown={e => e.key === 'Enter' && handleVerifyAnswer()}
                                />
                            </div>
                            <button className="btn btn-primary" onClick={handleVerifyAnswer}>
                                Verify Answer
                            </button>
                        </div>
                    )}

                    {/* Step 3 — New password */}
                    {step === 3 && (
                        <div>
                            <div className="form-group">
                                <label>New password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder="Enter new password"
                                />
                            </div>
                            <div className="form-group">
                                <label>Confirm password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm new password"
                                    onKeyDown={e => e.key === 'Enter' && handleResetPassword()}
                                />
                            </div>
                            <button className="btn btn-primary" onClick={handleResetPassword} disabled={loading}>
                                {loading ? 'Resetting…' : 'Reset Password'}
                            </button>
                        </div>
                    )}

                    <div className="auth-footer">
                        <p>
                            Remember your password?{' '}
                            <Link to="/signin" className="link">Sign In</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}