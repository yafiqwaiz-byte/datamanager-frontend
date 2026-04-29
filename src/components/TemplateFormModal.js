import React, { useState, useEffect } from 'react';
import '../styles/TemplateFormModal.css';

const emptyField = () => ({
    fieldLabel: '',
    fieldType: 'text',
    isRequired: false,
    fieldOrder: 1,
    placeholder: '',
});

export default function TemplateFormModal({ template, onSave, onClose }) {

    const [templateName, setTemplateName] = useState('');
    const [description, setDescription] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [fields, setFields] = useState([emptyField()]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (template) {
            setTemplateName(template.templateName);
            setDescription(template.description);
            setIsActive(template.isActive);
            setFields(template.fields && template.fields.length > 0 ? template.fields : [emptyField()]);
        }
    }, [template]);

    const addField = () => {
        setFields([...fields, { ...emptyField(), fieldOrder: fields.length + 1 }]);
    };

    const removeField = (index) => {
        setFields(fields.filter((_, i) => i !== index)
            .map((field, i) => ({ ...field, fieldOrder: i + 1 })));
    };

    const updateField = (index, key, value) => {
        setFields(fields.map((field, i) => i === index ? { ...field, [key]: value } : field));
    };

    const handleSubmit = async () => {
        if (!templateName.trim()) return alert('Template name is required');
        setLoading(true);
        try {
            await onSave({ templateName, description, isActive, fields });
            onClose();
        } catch (e) {
            alert(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className='overlay'>
            <div className='modal'>
                <div className='modal-header'>
                    <h2 className='modal-title'>
                        {template ? 'Edit template' : 'New template'}
                    </h2>
                    <button onClick={onClose} className='close-btn'>✕</button>
                </div>

                <div className='modal-body'>
                    <div className='form-group'>
                        <label className='label'>Template name</label>
                        <input className='input' value={templateName}
                            onChange={e => setTemplateName(e.target.value)}
                            placeholder="e.g. Customer Registration Form" />
                    </div>
                    <div className='form-group'>
                        <label className='label'>Description</label>
                        <textarea className='textarea' value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="What is this form for?" rows={2} />
                    </div>
                    <div className='form-group'>
                        <label className='label'>
                            <input type="checkbox" checked={isActive}
                                onChange={e => setIsActive(e.target.checked)} />
                            {' '}Active
                        </label>
                    </div>

                    <div className='fields-header'>
                        <span className='label'>Fields</span>
                        <button onClick={addField} className='add-field-btn'>+ Add field</button>
                    </div>

                    {fields.map((field, index) => (
                        <div key={index} className='field-row'>
                            <input className='field-label-input'
                                placeholder="Field label"
                                value={field.fieldLabel}
                                onChange={e => updateField(index, 'fieldLabel', e.target.value)} />
                            <select className='field-type-select'
                                value={field.fieldType}
                                onChange={e => updateField(index, 'fieldType', e.target.value)}>
                                <option value="text">Text</option>
                                <option value="number">Number</option>
                                <option value="email">Email</option>
                                <option value="date">Date</option>
                                <option value="datetime">Date & Time</option>
                                <option value="textarea">Text Area</option>
                                <option value="phone">Phone</option>
                                <option value="dropdown">Dropdown</option>
                                <option value="radio">Radio</option>
                                <option value="checkbox">Checkbox</option>
                                <option value="yesno">Yes / No</option>
                                <option value="rating">Rating</option>
                                <option value="attachimage">Attach Image</option>
                                <option value="attachfile">Attach File</option>
                            </select>
                             <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <input className='field-placeholder-input'
                                placeholder={
                                    ['dropdown', 'radio', 'checkbox'].includes(field.fieldType)
                                        ? 'e.g. Option A, Option B, Option C'
                                        : ['attachimage', 'attachfile', 'yesno', 'rating'].includes(field.fieldType)
                                        ? 'Not required for this type'
                                        : 'Placeholder text'
                                }
                                    value={field.placeholder}
                                    disabled={['attachimage', 'attachfile', 'yesno', 'rating'].includes(field.fieldType)}
                                    onChange={e => updateField(index, 'placeholder', e.target.value)} />
                                {['dropdown', 'radio', 'checkbox'].includes(field.fieldType) && (
                                    <span style={{ fontSize: 11, color: '#888' }}>
                                        💡 Separate options with commas
                                    </span>
                                )}
                                {['attachimage'].includes(field.fieldType) && (
                                    <span style={{ fontSize: 11, color: '#888' }}>
                                        💡 User will upload an image
                                    </span>
                                )}
                                {['attachfile'].includes(field.fieldType) && (
                                    <span style={{ fontSize: 11, color: '#888' }}>
                                        💡 User will upload a file (PDF, DOC, XLSX)
                                    </span>
                                )}
                                {['yesno'].includes(field.fieldType) && (
                                    <span style={{ fontSize: 11, color: '#888' }}>
                                        💡 User will choose Yes or No
                                    </span>
                                )}
                                {['rating'].includes(field.fieldType) && (
                                    <span style={{ fontSize: 11, color: '#888' }}>
                                        💡 User will rate from 1 to 5 stars
                                    </span>
                                )}
                            </div>
                            
                            <label className='required-label'>
                                <input type="checkbox" checked={field.isRequired || false}
                                    onChange={e => updateField(index, 'isRequired', e.target.checked)} />
                                {' '}Required
                            </label>
                            <button onClick={() => removeField(index)}
                                className='remove-btn'>✕</button>
                        </div>
                    ))}
                </div>

                <div className='modal-footer'>
                    <button onClick={onClose} className='cancel-btn'>Cancel</button>
                    <button onClick={handleSubmit} className='save-btn' disabled={loading}>
                        {loading ? 'Saving...' : 'Save template'}
                    </button>
                </div>
            </div>
        </div>
    );
}