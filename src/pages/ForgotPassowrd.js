import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from '../services/authService';
import '../styles/Auth.css';
import { Link } from "react-router-dom";

function ForgotPassword(){

    const [step,setStep] = useState(1);
    const [username,setUsername] = useState('');
    const [securityQuestion,setSecurityQuestion] = useState('');
    const [securityAnswer,setSecurityAnswer] = useState('');
    const [newPassword,setNewPassword] = useState('');
    const [confirmPassword,setConfirmPassword] = useState('');
    const [error,setError] = useState('');
    const [loading,setLoading] = useState(false);
    const navigate = useNavigate();

    const handleFindAccount = async() =>{

        if (!username){
            setError('Please enter your username'); return;
        } setLoading(true); setError('');

        try{
            const res = await fetch(`http://localhost:8080/api/accounts/security-question/${username}`);
            if(!res.ok) throw new Error('Username not found');
            const data = await res.json();
            setSecurityQuestion(data.securityQuestion);
            setStep(2);
        } catch (e){
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyAnswer = async() => {
        if (!securityAnswer){
            setError('Please enter your answer'); return;
        } 
        setError('');
        setStep(3);
    };

    const handleResetPassword = async() => {
        if(!newPassword || !confirmPassword){
            setError('Please fill in all fields'); return;
        }
        if(newPassword !== confirmPassword){
            setError('Password do not match'); return;
        }
        if(newPassword < 6){
            setError('Password at least 6 characters'); return;
        }

        setLoading(true); setError('');

        try {
            const res = await fetch('http://localhost:8080/api/accounts/reset-password',{
                method : 'POST',
                headers : {'Content-Type': 'application/json'},
                body: JSON.stringify({username,securityAnswer,newPassword})
        });
        if (!res.ok){
            const msg = await res.text();
            throw new Error(msg || 'Reset Failed');
        }
        alert('Password reset successfully');
        navigate('/signin');
        } catch (e){
            setError(e.message);
            setStep(2);
        } finally{
            setLoading(false);
        }
    }
return (
        <div className="auth-container">
            <div className="auth-card">
                <h1>Forgot Password</h1>

                {/* Step indicators */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
                    {[1, 2, 3].map(s => (
                        <div key={s} style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: step >= s ? '#7c3aed' : '#e5e7eb',
                            color: step >= s ? '#fff' : '#9ca3af',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13, fontWeight: 600
                        }}>{s}</div>
                    ))}
                </div>

                {error && <div className="error-message">{error}</div>}

                {/* Step 1 — Enter username */}
                {step === 1 && (
                    <div>
                        <p style={{ color: '#6b7280', marginBottom: 16, fontSize: 14 }}>
                            Enter your username to find your account.
                        </p>
                        <div className="form-group">
                            <label>Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                placeholder="Enter your username"
                                className="form-control"
                            />
                        </div>
                        <button className="btn btn-primary" onClick={handleFindAccount} disabled={loading}>
                            {loading ? 'Finding...' : 'Find Account'}
                        </button>
                    </div>
                )}

                {/* Step 2 — Answer security question */}
                {step === 2 && (
                    <div>
                        <p style={{ color: '#6b7280', marginBottom: 16, fontSize: 14 }}>
                            Answer your security question.
                        </p>
                        <div className="form-group">
                            <label>Security Question</label>
                            <p style={{ fontWeight: 600, color: '#1a1a2e', fontSize: 14 }}>
                                {securityQuestion}
                            </p>
                        </div>
                        <div className="form-group">
                            <label>Your Answer</label>
                            <input
                                type="text"
                                value={securityAnswer}
                                onChange={e => setSecurityAnswer(e.target.value)}
                                placeholder="Enter your answer"
                                className="form-control"
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
                        <p style={{ color: '#6b7280', marginBottom: 16, fontSize: 14 }}>
                            Enter your new password.
                        </p>
                        <div className="form-group">
                            <label>New Password</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                placeholder="Enter new password"
                                className="form-control"
                            />
                        </div>
                        <div className="form-group">
                            <label>Confirm Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                                className="form-control"
                            />
                        </div>
                        <button className="btn btn-primary" onClick={handleResetPassword} disabled={loading}>
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </div>
                )}

                <div className="auth-footer" style={{ marginTop: 16 }}>
                    <p>
                        Remember your password?{' '}
                        <Link to="/signin" className="link">Sign In</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default ForgotPassword;

