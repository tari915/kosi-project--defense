import { getAccessToken } from './authClient.js';

async function request(path, options = {}) {
    const token = await getAccessToken();
    const headers = { ...(options.headers || {}) };

    if (token) {
        headers.Authorization = 'Bearer ' + token;
    }

    let response;

    try {
        response = await fetch(path, { ...options, headers });
    } catch {
        throw new Error('Could not reach the server. Check your connection and try again.');
    }

    let data = {};

    try {
        data = await response.json();
    } catch {
        // The response had no JSON body.
    }

    if (!response.ok) {
        const error = new Error(data.error || 'Something went wrong. Please try again.');
        error.status = response.status;
        throw error;
    }

    return data;
}

export function createOrder(file) {
    const form = new FormData();
    form.append('file', file);

    return request('/api/orders', { method: 'POST', body: form });
}

export function verifyOrder(id) {
    return request('/api/orders/' + encodeURIComponent(id) + '/verify', { method: 'POST' });
}

export function fetchOrder(id) {
    return request('/api/orders/' + encodeURIComponent(id));
}

export function fetchMyOrders() {
    return request('/api/me/orders');
}
