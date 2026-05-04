// src/services/templateService.js
const API_URL = 'http://localhost:8080/api/staff/templates';

const getAuthHeader = () => {
    const token = localStorage.getItem('authToken');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
};

export const getTemplates = async () => {
    try {
        const response = await fetch(API_URL, { headers: getAuthHeader() });
        if (!response.ok) throw new Error('Failed to fetch templates');
        return response.json();
    } catch (error) {
        console.error('Error fetching templates:', error);
        throw error;
    }
};

export const getTemplateById = async (id) => {
    try {
        const response = await fetch(`${API_URL}/${id}`, { headers: getAuthHeader() });
        if (!response.ok) throw new Error('Failed to fetch template');
        return response.json();
    } catch (error) {
        console.error('Error fetching template:', error);
        throw error;
    }
};

export const createTemplate = async (templateData) => {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: getAuthHeader(),
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
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: getAuthHeader(),
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
        const response = await fetch(`${API_URL}/${id}/toggle`, {
            method: 'PATCH',
            headers: getAuthHeader(),
        });
        if (!response.ok) throw new Error('Failed to toggle template');
    } catch (error) {
        console.error('Error toggling template:', error);
        throw error;
    }
};

export const getTemplateSubmissions = async(templateId) =>{
    try{
        const response = await fetch(
             `http://localhost:8080/api/staff/templates/${templateId}/submissions`,
            { headers:getAuthHeader()}
        );
        if (!response.ok) throw new Error('Failed to fetch submissions');
        return response.json();
    } catch(error){
        console.error('Error fetching submission:', error);
        throw error;
    }
};

export const deleteTemplate = async (id) => {
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE',
            headers: getAuthHeader(),
        });
        if (!response.ok) throw new Error('Failed to delete template');
    } catch (error) {
        console.error('Error deleting template:', error);
        throw error;
    }
};

export const getAllSubmissions = async () => {
    try {
        const response = await fetch(
            'http://localhost:8080/api/staff/templates/submissions/all',
            { headers: getAuthHeader() }
        );
        if (!response.ok) throw new Error('Failed to fetch submissions');
        return response.json();
    } catch (error) {
        console.error('Error fetching submissions:', error);
        throw error;
    }
};