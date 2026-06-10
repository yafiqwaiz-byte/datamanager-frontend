// Authentication Service for API calls
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api';

// ─────────────────────────────────────────────────────────────────────
//  All fetch calls use credentials: 'include' so the browser
//  automatically sends and receives httpOnly cookies.
//  Tokens are NO LONGER stored in localStorage — they live in cookies.
//  Only non-sensitive info (username, role, user profile) stays in
//  localStorage so the UI can read it without touching the token.
// ─────────────────────────────────────────────────────────────────────

export const authService = {

  // ── SIGNIN ──────────────────────────────────────────────────────────
  signin: async (username, password) => {
    const response = await fetch(`${API_BASE_URL}/accounts/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',                          // sends/receives httpOnly cookies
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Signin failed');
    }

    const data = await response.json();
    // Token is now in httpOnly cookie — don't store it in localStorage
    authService._saveUserInfo(data);
    return data;
  },

  // ── GOOGLE SIGNIN ────────────────────────────────────────────────────
  signinWithGoogle: async (idToken, role = 'USER') => {
    const response = await fetch(`${API_BASE_URL}/accounts/signin/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ idToken, role }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Google signin failed');
    }

    const data = await response.json();
    authService._saveUserInfo(data);

    if (data.newUser) {
      localStorage.setItem('fullName', data.fullName || '');
      localStorage.setItem('email', data.email || '');
    }

    return data;
  },

  // ── COMPLETE USER PROFILE (Google new user) ──────────────────────────
  completeUserProfile: async (profileData) => {
    const response = await fetch(`${API_BASE_URL}/accounts/complete-profile/user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',                          // cookie carries the token
      body: JSON.stringify(profileData),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to complete profile');
    }

    const data = await response.json();
    localStorage.setItem('user', JSON.stringify(data.user || {}));
    return data;
  },

  // ── COMPLETE STAFF PROFILE (Google new staff) ────────────────────────
  completeStaffProfile: async (profileData) => {
    const response = await fetch(`${API_BASE_URL}/accounts/complete-profile/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(profileData),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to complete profile');
    }

    const data = await response.json();
    localStorage.setItem('user', JSON.stringify(data.user || {}));
    return data;
  },

  // ── SIGNUP USER ──────────────────────────────────────────────────────
  signupUser: async (accountData, userData) => {
    const response = await fetch(`${API_BASE_URL}/accounts/signup/user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        username:         accountData.username,
        password:         accountData.password,
        securityQuestion: accountData.securityQuestion,
        securityAnswer:   accountData.securityAnswer,
        fullName:         userData.fullName,
        companyName:      userData.companyName,
        phoneNo:          userData.phoneNo,
        companyAddress:   userData.address,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'User registration failed');
    }

    const data = await response.json();
    authService._saveUserInfo(data);
    return data;
  },

  // ── SIGNUP STAFF ─────────────────────────────────────────────────────
  signupStaff: async (accountData, staffData) => {
    const response = await fetch(`${API_BASE_URL}/accounts/signup/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        username:         accountData.username,
        password:         accountData.password,
        securityQuestion: accountData.securityQuestion,
        securityAnswer:   accountData.securityAnswer,
        fullName:         staffData.fullName,
        department:       staffData.department,
        position:         staffData.position,
        inviteCode:       staffData.inviteCode,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Staff registration failed');
    }

    const message = await response.text();
    return message;
  },

  // ── TOKEN REFRESH ────────────────────────────────────────────────────
  // Call this when any API returns 401. The browser sends the refresh
  // token cookie automatically — no token handling needed here.
  refreshToken: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      // Refresh failed — session is dead, force re-login
      authService._clearUserInfo();
      window.location.href = '/signin';
      return false;
    }

    return true;
  },

  // ── LOGOUT ───────────────────────────────────────────────────────────
  logout: async () => {
    try {
      // Tell the backend to revoke refresh tokens + clear cookies
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout request failed:', err);
    } finally {
      // Always clear local state regardless of network result
      authService._clearUserInfo();
      window.location.href = '/signin';
    }
  },

  // ── AUTHENTICATED FETCH ──────────────────────────────────────────────
  // Use this instead of plain fetch() for all protected API calls.
  // It automatically retries once with a token refresh on 401.
  fetchWithAuth: async (url, options = {}) => {

    const headers = {...options.headers};

    if (options.body && !(options.body instanceof FormData) && !(options.body instanceof ArrayBuffer)) {
      headers['Content-Type'] = 'application/json';
    }
    const response = await fetch(url, {
      ...options,
      credentials: 'include',                         
      headers:headers ,
    });

    // Token expired — try refresh once, then retry
    if (response.status === 401) {
      const refreshed = await authService.refreshToken();
      if (refreshed) {

        const retryHeaders = {...options.headers};
         if (options.body && !(options.body instanceof FormData) && !(options.body instanceof ArrayBuffer)) {
        retryHeaders['Content-Type'] = 'application/json';
      }
        return fetch(url, {
          ...options,
          credentials: 'include',
          headers: retryHeaders,
        });
      }
      // refreshToken() already redirects to /signin if failed
      return response;
    }

    return response;
  },

  // ── HELPERS (UI state only — no tokens) ─────────────────────────────
  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  getUsername: () => localStorage.getItem('username'),

  getRole: () => localStorage.getItem('role'),

  // Checks localStorage for session info — NOT the token itself
  isLoggedIn: () => !!localStorage.getItem('username'),

  // ── Private helpers ──────────────────────────────────────────────────
  _saveUserInfo: (data) => {
    // Never save the token here — it lives in the httpOnly cookie
    if (data.username) localStorage.setItem('username', data.username);
    if (data.role)     localStorage.setItem('role', data.role);
    if (data.user)     localStorage.setItem('user', JSON.stringify(data.user));

    if (data.user?.staffId) {
      localStorage.setItem('staffId', data.user.staffId);
    }
  },

  _clearUserInfo: () => {
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    localStorage.removeItem('staffId');
    localStorage.removeItem('fullName');
    localStorage.removeItem('email');
  },
};