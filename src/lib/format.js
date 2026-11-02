export const STATUS_LABELS = {
    pending: 'Not completed',
    paid: 'Queued',
    processing: 'Preparing your pack',
    ready: 'Ready',
    failed: 'Needs attention'
};

export const STATUS_NOTES = {
    pending: 'This older pack was not completed. Start a new pack whenever you are ready.',
    paid: 'Your pack is queued.',
    processing: 'We are building your pack now. It will appear here when it is ready.',
    ready: 'Your pack is ready. Open it whenever you want to revise.',
    failed: 'This upload counted against your plan, but the pack could not be built. Keep the reference below if you need to follow it up.'
};

const DATE_FORMAT = new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
});

const SHORT_DATE_FORMAT = new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'short'
});

const MONEY_FORMAT = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
});

export function formatDate(value, short = false) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return (short ? SHORT_DATE_FORMAT : DATE_FORMAT).format(date);
}

export function formatMoney(kobo) {
    return MONEY_FORMAT.format((Number(kobo) || 0) / 100);
}

export function statusTone(status) {
    if (status === 'ready') return 'ready';
    if (status === 'pending') return 'pending';
    if (status === 'failed') return 'failed';
    return 'working';
}

export function displayName(email) {
    if (!email) return 'there';
    const local = String(email).split('@')[0] || '';
    const word = local.split(/[._-]/).filter(Boolean)[0] || 'there';
    return word.charAt(0).toUpperCase() + word.slice(1);
}

export function fileTitle(name) {
    return String(name || 'Your notes').replace(/\.[^.]+$/, '');
}
