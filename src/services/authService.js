// Authentication Service for API calls
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api';

export const authService = {
  // Signin API call
  signin: async (username, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/accounts/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Signin failed');
      }

      const data = await response.json();
      if (data.token) {
        localStorage.setItem('authToken', data.token);
      }
      localStorage.setItem('username', data.username);
      localStorage.setItem('role', data.role);
      localStorage.setItem('user', JSON.stringify(data.user || {}));
      return data;
    } catch (error) {
      console.error('Signin error:', error);
      throw error;
    }
  },

  // Google Signin
  signinWithGoogle: async (idToken, role = 'USER') => {
    try {
      const response = await fetch(`${API_BASE_URL}/accounts/signin/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken, role }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Google signin failed');
      }

      const data = await response.json();
      if (data.token) {
        localStorage.setItem('authToken', data.token);
      }
      localStorage.setItem('username', data.username);
      localStorage.setItem('role', data.role);
      localStorage.setItem('user', JSON.stringify(data.user || {}));

      // Save extra info for complete profile page if new user
      if (data.newUser) {
        localStorage.setItem('fullName', data.fullName || '');
        localStorage.setItem('email', data.email || '');
      }

      return data;
    } catch (error) {
      console.error('Google signin error:', error);
      throw error;
    }
  },

  // Complete User Profile (after Google signin)
  completeUserProfile: async (profileData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/accounts/complete-profile/user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to complete profile');
      }

      const data = await response.json();
      localStorage.setItem('user', JSON.stringify(data.user || {}));
      return data;
    } catch (error) {
      console.error('Complete user profile error:', error);
      throw error;
    }
  },

  // Complete Staff Profile (after Google signin)
  completeStaffProfile: async (profileData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/accounts/complete-profile/staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to complete profile');
      }

      const data = await response.json();
      localStorage.setItem('user', JSON.stringify(data.user || {}));
      return data;
    } catch (error) {
      console.error('Complete staff profile error:', error);
      throw error;
    }
  },

  // Signup API call for User
  signupUser: async (accountData, userData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/accounts/signup/user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: accountData.username,
          password: accountData.password,
          fullName: userData.fullName,
          companyName: userData.companyName,
          phoneNo: userData.phoneNo,
          companyAddress: userData.address,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'User registration failed');
      }

      const data = await response.json();
      if (data.token) {
        localStorage.setItem('authToken', data.token);
      }
      localStorage.setItem('username', data.username);
      localStorage.setItem('role', data.role);
      localStorage.setItem('user', JSON.stringify(data.user || {}));
      return data;
    } catch (error) {
      console.error('User signup error:', error);
      throw error;
    }
  },

  // Signup API call for Staff
  signupStaff: async (accountData, staffData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/accounts/signup/staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: accountData.username,
          password: accountData.password,
          fullName: staffData.fullName,
          department: staffData.department,
          position: staffData.position,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Staff registration failed');
      }

      const data = await response.json();
      if (data.token) {
        localStorage.setItem('authToken', data.token);
      }
      localStorage.setItem('username', data.username);
      localStorage.setItem('role', data.role);
      localStorage.setItem('user', JSON.stringify(data.user || {}));
      return data;
    } catch (error) {
      console.error('Staff signup error:', error);
      throw error;
    }
  },

  // Logout
  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    localStorage.removeItem('fullName');
    localStorage.removeItem('email');
  },

  // Get current user
  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  // Get JWT token
  getToken: () => {
    return localStorage.getItem('authToken');
  },

  // Check if user is logged in
  isLoggedIn: () => {
    return !!localStorage.getItem('authToken');
  },

  // Helper: Get Authorization header for API calls
  getAuthHeaders: () => {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  },

  // Helper: Make authenticated API call
  fetchWithAuth: async (url, options = {}) => {
    const headers = authService.getAuthHeaders();
    return fetch(url, {
      ...options,
      headers: { ...headers, ...options.headers },
    });
  },
};