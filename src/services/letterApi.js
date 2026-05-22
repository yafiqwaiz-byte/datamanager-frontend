import { authService } from './authService'; // adjust path if needed

const BASE_URL = 'http://localhost:8080/api';

export const uploadTemplate = async (staffId, templateName, file) => {
    const formData = new FormData();
    formData.append('staffId', staffId);
    formData.append('templateName', templateName);
    formData.append('file', file);

    const response = await authService.fetchWithAuth(`${BASE_URL}/letters/templates/upload`, {
        method: 'POST',
        // NOTE: Do NOT set Content-Type here — browser sets it automatically
        // with the correct multipart boundary when body is FormData
        headers: {},
        body: formData,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
    }
    return response.json();
};

export const getAllTemplates = async () => {
    const response = await authService.fetchWithAuth(`${BASE_URL}/letters/templates/all`);
    return response.json();
};

export const getTemplatePreview = async (templateId) => {
    const response = await authService.fetchWithAuth(`${BASE_URL}/letters/templates/preview/${templateId}`);
    return response.json();
};

export const savePlaceholders = async (templateId, placeholders) => {
    const response = await authService.fetchWithAuth(`${BASE_URL}/letters/templates/placeholders/${templateId}`, {
        method: 'POST',
        body: JSON.stringify(placeholders),
    });
    return response.json();
};

export const getTemplateByStaff = async (staffId) => {
    const response = await authService.fetchWithAuth(`${BASE_URL}/letters/templates/staff/${staffId}`);
    return response.json();
};

export const uploadOCrImage = async (uploadId, file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await authService.fetchWithAuth(`${BASE_URL}/ocr/process/${uploadId}`, {
        method: 'POST',
        headers: {},   // let browser set multipart boundary
        body: formData,
    });
    return response.json();
};

export const autoMap = async (ocrId, templateId) => {
    const response = await authService.fetchWithAuth(
        `${BASE_URL}/letters/mapping/auto?ocrId=${ocrId}&templateId=${templateId}`,
        { method: 'POST' }
    );
    return response.json();
};

export const confirmMapping = async (mappingId, correctedFields) => {
    const response = await authService.fetchWithAuth(`${BASE_URL}/letters/mapping/confirm/${mappingId}`, {
        method: 'PUT',
        body: JSON.stringify({ correctedFields }),
    });
    return response.json();
};

export const generateLetter = async (mappingId) => {
    const response = await authService.fetchWithAuth(`${BASE_URL}/letters/generate/${mappingId}`, {
        method: 'POST',
    });
    return response.json();
};

// Downloads open in a new tab — cookies are sent automatically by the browser
export const downloadDocx = (letterId) => {
    window.open(`${BASE_URL}/letters/download/docx/${letterId}`, '_blank');
};

export const downloadPdf = (letterId) => {
    window.open(`${BASE_URL}/letters/download/pdf/${letterId}`, '_blank');
};