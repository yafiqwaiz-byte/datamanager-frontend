import { authService } from './authService';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api';

export const geocodingService = {
  // Returns [{ placeId, description }, ...]
  autocomplete: async (input) => {
    if (!input || !input.trim()) return [];

    const response = await authService.fetchWithAuth(
      `${API_BASE_URL}/geocode/autocomplete?input=${encodeURIComponent(input)}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      // Fail quietly — suggestions are a nice-to-have, not worth blocking the form
      return [];
    }

    return response.json();
  },

  // Returns { lat, lng, formattedAddress }
  getPlaceDetails: async (placeId) => {
    const response = await authService.fetchWithAuth(
      `${API_BASE_URL}/geocode/place-details?placeId=${encodeURIComponent(placeId)}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to fetch place details');
    }

    return response.json();
  },
};