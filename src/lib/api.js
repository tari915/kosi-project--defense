import { getAccessToken, getSupabase } from './authClient.js';

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

export async function createOrder(file) {
    const ticket = await request('/api/uploads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream'
        })
    });

    const client = await getSupabase();
    if (!client) {
        throw new Error('Accounts are not configured. Add the Supabase browser keys and try again.');
    }

    let uploadError = null;

    try {
        const result = await client.storage
            .from(ticket.bucket)
            .uploadToSignedUrl(ticket.path, ticket.token, file, {
                contentType: file.type || 'application/octet-stream'
            });
        uploadError = result.error;
    } catch (error) {
        uploadError = error;
    }

    if (uploadError) {
        const error = new Error(
            'We could not upload your file. Check your connection and try again.'
        );
        error.status = 502;
        throw error;
    }

    return request('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id: ticket.id,
            path: ticket.path,
            originalName: file.name
        })
    });
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
