export function formatDateTime(value) {
    if (value == null || value === '') return null;
    const date = value instanceof Date ? value : new Date(String(value).trim());
    if (Number.isNaN(date.getTime())) return null;

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    let hour = date.getHours();
    const minute = String(date.getMinutes()).padStart(2, '0');
    const ampm = hour >= 12 ? 'pm' : 'am';
    hour = hour % 12 || 12;

    return `${day}/${month}/${year} ${hour}:${minute} ${ampm}`;
}
