import React, { useState, useEffect } from 'react';
import '../styles/TemplateFormModal.css';

let _keySeq = 0;
const nextKey = () => `k${++_keySeq}`;

const emptyField = () => ({
    _key: nextKey(),
    fieldLabel: '',
    fieldType: 'text',
    isRequired: false,
    fieldOrder: 1,
    placeholder: '',
    imageLabelsText: '',
    imageLabels: [],
});

export default function TemplateFormModal({ template, onSave, onClose }) {

    const [templateName, setTemplateName] = useState('');
    const [description, setDescription] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [fields, setFields] = useState([emptyField()]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (template) {
            setTemplateName(template.templateName ?? '');
            setDescription(template.description ?? '');
            setIsActive(template.isActive ?? true);
            setFields(template.fields && template.fields.length > 0
                ? template.fields.map(f => ({
                    ...f,
                    // Stable per-row identity for React's key prop.
                    // Prefer the real fieldId (already stable + unique) so edits to an
                    // existing field never change its key; fall back to a freshly
                    // generated key only if this field somehow has no fieldId yet.
                    _key: f.fieldId ?? nextKey(),
                    // Normalize any null/undefined values coming from the backend —
                    // React inputs need "" not null/undefined, or they flip from
                    // controlled to uncontrolled and render as blank.
                    fieldLabel: f.fieldLabel ?? '',
                    fieldType: f.fieldType ?? 'text',
                    placeholder: f.placeholder ?? '',
                    isRequired: f.isRequired ?? false,
                    fieldOrder: f.fieldOrder ?? 1,
                    // Reconstruct the textarea text from imageLabels if a template is being edited
                    imageLabelsText: f.imageLabelsText || (f.imageLabels ? f.imageLabels.join('\n') : ''),
                    imageLabels: f.imageLabels || [],
                }))
                : [emptyField()]);
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

    // Allows updating multiple keys on a field at once (used by the labeled_images textarea)
    const updateFieldMulti = (index, updates) => {
        setFields(fields.map((field, i) => i === index ? { ...field, ...updates } : field));
    };

    const handleSubmit = async () => {
        if (!templateName.trim()) return alert('Template name is required');

        // Validate labeled_images fields have at least one label
        const badLabeled = fields.find(
            f => f.fieldType === 'labeled_images' && (!f.imageLabels || f.imageLabels.length === 0)
        );
        if (badLabeled) {
            return alert(`Field "${badLabeled.fieldLabel || 'Labeled Images'}" needs at least one image label`);
        }

        setLoading(true);
        try {
            // Strip helper-only fields before saving: imageLabelsText is UI-only scratch
            // state, and _key is a React-only identity tag — neither should reach the API.
            const cleanedFields = fields.map(({ imageLabelsText, _key, ...rest }) => rest);
            await onSave({ templateName, description, isActive, fields: cleanedFields });
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
                        <div key={field._key} className='field-row' style={{ flexWrap: 'wrap' }}>
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
                                <option value="datetime">Date & Time</option>
                                <option value="textarea">Text Area</option>
                                <option value="phone">Phone</option>
                                <option value="dropdown">Dropdown</option>
                                <option value="radio">Radio</option>
                                <option value="checkbox">Checkbox</option>
                                <option value="yesno">Yes / No</option>
                                <option value="rating">Rating</option>
                                <option value="labeled_images">Labeled Images</option>
                                <option value="location">Location</option>
                                <option value="attachimage">Attach Image</option>
                                <option value="attachfile">Attach File</option>
                            </select>
                             <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <input className='field-placeholder-input'
                                placeholder={
                                    ['dropdown', 'radio', 'checkbox'].includes(field.fieldType)
                                        ? 'e.g. Option A, Option B, Option C'
                                        : ['attachimage', 'attachfile', 'yesno', 'rating', 'labeled_images', 'location'].includes(field.fieldType)
                                        ? 'Not required for this type'
                                        : 'Placeholder text'
                                }
                                    value={field.placeholder}
                                    disabled={['attachimage', 'attachfile', 'yesno', 'rating', 'labeled_images', 'location'].includes(field.fieldType)}
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
                                {['labeled_images'].includes(field.fieldType) && (
                                    <span style={{ fontSize: 11, color: '#888' }}>
                                        💡 User uploads one photo per label below
                                    </span>
                                )}
                                {['location'].includes(field.fieldType) && (
                                    <span style={{ fontSize: 11, color: '#888' }}>
                                        💡 User shares their current location (GPS)
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

                            {/* Image label editor — only shown for labeled_images fields */}
                            {field.fieldType === 'labeled_images' && (
                                <div style={{ flexBasis: '100%', marginTop: 8 }}>
                                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                                        Image labels (one per line)
                                    </label>
                                    <textarea
                                        rows={4}
                                        style={{
                                            width: '100%',
                                            padding: 8,
                                            borderRadius: 6,
                                            border: '1px solid #ccc',
                                            fontSize: 13,
                                        }}
                                        placeholder={'Tracking Board\nPermit Khas\nCSQA'}
                                        value={field.imageLabelsText || ''}
                                        onChange={e => {
                                            const text = e.target.value;
                                            const labels = text.split('\n').map(l => l.trim()).filter(Boolean);
                                            updateFieldMulti(index, {
                                                imageLabelsText: text,
                                                imageLabels: labels,
                                            });
                                        }}
                                    />
                                    <span style={{ fontSize: 11, color: '#888' }}>
                                        {(field.imageLabels || []).length} label{(field.imageLabels || []).length === 1 ? '' : 's'} defined
                                    </span>
                                </div>
                            )}
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