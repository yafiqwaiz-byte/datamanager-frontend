import { authService } from './authService'; // adjust path if needed

const API_URL = 'http://localhost:8080/api/staff/templates';

export const getTemplates = async () => {
    try {
        const response = await authService.fetchWithAuth(API_URL);
        if (!response.ok) throw new Error('Failed to fetch templates');
        return response.json();
    } catch (error) {
        console.error('Error fetching templates:', error);
        throw error;
    }
};

export const getTemplateById = async (id) => {
    try {
        const response = await authService.fetchWithAuth(`${API_URL}/${id}`);
        if (!response.ok) throw new Error('Failed to fetch template');
        return response.json();
    } catch (error) {
        console.error('Error fetching template:', error);
        throw error;
    }
};

export const createTemplate = async (templateData) => {
    try {
        const response = await authService.fetchWithAuth(API_URL, {
            method: 'POST',
            body: JSON.stringify(templateData),
        });
        if (!response.ok) throw new Error('Failed to create template');
        return response.json();
    } catch (error) {
        console.error('Error creating template:', error);
        throw error;
    }
};

export const updateTemplate = async (id, templateData) => {
    try {
        const response = await authService.fetchWithAuth(`${API_URL}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(templateData),
        });
        if (!response.ok) throw new Error('Failed to update template');
        return response.json();
    } catch (error) {
        console.error('Error updating template:', error);
        throw error;
    }
};

export const toggleTemplate = async (id) => {
    try {
        const response = await authService.fetchWithAuth(`${API_URL}/${id}/toggle`, {
            method: 'PATCH',
        });
        if (!response.ok) throw new Error('Failed to toggle template');
    } catch (error) {
        console.error('Error toggling template:', error);
        throw error;
    }
};

export const getTemplateSubmissions = async (templateId, page = 0, size = 10) => {
    try {
        const response = await authService.fetchWithAuth(
            `${API_URL}/${templateId}/submissions?page=${page}&size=${size}`
        );
        if (!response.ok) throw new Error('Failed to fetch submissions');
        return response.json();
    } catch (error) {
        console.error('Error fetching submission:', error);
        throw error;
    }
};

export const deleteTemplate = async (id) => {
    try {
        const response = await authService.fetchWithAuth(`${API_URL}/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete template');
    } catch (error) {
        console.error('Error deleting template:', error);
        throw error;
    }
};

export const getAllSubmissions = async (page = 0, size = 10) => {
    try {
        const response = await authService.fetchWithAuth(
            `${API_URL}/submissions/all?page=${page}&size=${size}`
        );
        if (!response.ok) throw new Error('Failed to fetch submissions');
        return response.json();
    } catch (error) {
        console.error('Error fetching submissions:', error);
        throw error;
    }
};