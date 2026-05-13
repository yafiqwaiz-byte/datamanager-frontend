
const BASE_URL = 'http://localhost:8080/api';

const getAuthHeaders = () => {
        const token = localStorage.getItem('authToken');
        return { 'Authorization': `Bearer ${token}` };
    };

export const uploadTemplate = async (staffId, templateName, file) => {
    const formData = new FormData();
    formData.append('staffId', staffId);
    formData.append('templateName', templateName);
    formData.append('file', file);

    const response = await fetch(`${BASE_URL}/letters/templates/upload`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
    }
    return response.json();
};

export const getAllTemplates = async () => {
    const response = await fetch(`${BASE_URL}/letters/templates/all`,{ headers: getAuthHeaders() });
    return response.json();
};

export const getTemplatePreview = async (templateId) => {
    const token = localStorage.getItem('authToken');
    const res = await fetch(`${BASE_URL}/letters/templates/preview/${templateId}`,
        { headers: getAuthHeaders()}
    );
    return res.json();
};

export const savePlaceholders = async (templateId,placeholders) => {
    const token = localStorage.getItem('authToken');

    const res = await fetch(`${BASE_URL}/letters/templates/placeholders/${templateId}`,
        {
            method: 'POST',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(placeholders)
        }
    );
    return res.json();
};

export const getTemplateByStaff = async (staffId) => {
    const response = await fetch(`${BASE_URL}/letters/templates/staff/${staffId}`,{ headers: getAuthHeaders() });
    return response.json();
};

export const uploadOCrImage = async (uploadId,file) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${BASE_URL}/ocr/process/${uploadId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
    });
    return response.json();
};

export const autoMap = async (ocrId, templateId) => {
    const response = await fetch(`${BASE_URL}/letters/mapping/auto?ocrId=${ocrId}&templateId=${templateId}`,
         { method: 'POST',
              headers: getAuthHeaders(),
          });
    return response.json();
};

 export const confirmMapping = async (mappingId, correctedFields) => {
    const res = await fetch(`${BASE_URL}/letters/mapping/confirm/${mappingId}`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(),'Content-Type': 'application/json' },
        body: JSON.stringify({ correctedFields }),
    });
    return res.json();
};

 export const generateLetter = async (mappingId) => { 
    const res = await fetch(`${BASE_URL}/letters/generate/${mappingId}`, { method: 'POST', headers: getAuthHeaders() });
    return res.json();
};

export const downloadDocx = async (letterId) => {
    window.open(`${BASE_URL}/letters/download/docx/${letterId}`, '_blank');
};

export const downloadPdf = async (letterId) => {
    window.open(`${BASE_URL}/letters/download/pdf/${letterId}`, '_blank');
};