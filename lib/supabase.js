/* ============================================================
   SUPABASE
   Server-only REST access. The service role key bypasses RLS,
   so it must never be sent to the browser.
   ============================================================ */
const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
const SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const BUCKET = (process.env.SUPABASE_BUCKET || 'studyflow-uploads').trim();

function isConfigured() {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return false;
    return !/your-project|your-service-role-key/i.test(SUPABASE_URL + ' ' + SERVICE_ROLE_KEY);
}

function assertConfigured() {
    if (!isConfigured()) {
        const error = new Error(
            'Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.'
        );
        error.code = 'SUPABASE_NOT_CONFIGURED';
        throw error;
    }
}

async function request(path, { method = 'GET', body, prefer } = {}) {
    assertConfigured();

    const response = await fetch(SUPABASE_URL + path, {
        method,
        headers: {
            apikey: SERVICE_ROLE_KEY,
            Authorization: 'Bearer ' + SERVICE_ROLE_KEY,
            ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
            ...(prefer ? { Prefer: prefer } : {})
        },
        body: body === undefined ? undefined : JSON.stringify(body)
    });

    if (!response.ok) {
        const detail = (await response.text().catch(() => '')).slice(0, 300);
        throw new Error(
            'Supabase ' + method + ' ' + path + ' failed (' + response.status + '): ' + detail
        );
    }

    if (response.status === 204) return null;

    const text = await response.text();
    return text ? JSON.parse(text) : null;
}

/* ---------- Auth ---------- */
async function getUserByToken(accessToken) {
    assertConfigured();

    const response = await fetch(SUPABASE_URL + '/auth/v1/user', {
        headers: {
            apikey: SERVICE_ROLE_KEY,
            Authorization: 'Bearer ' + accessToken
        }
    });

    if (response.status === 401 || response.status === 403) return null;

    if (!response.ok) {
        const detail = (await response.text().catch(() => '')).slice(0, 300);
        throw new Error('Supabase auth check failed (' + response.status + '): ' + detail);
    }

    return response.json();
}

/* ---------- Orders ---------- */
async function insertOrder(order) {
    await request('/rest/v1/orders', { method: 'POST', body: order });
    return order;
}

async function getOrder(id) {
    const rows = await request(
        '/rest/v1/orders?id=eq.' + encodeURIComponent(id) + '&select=*'
    );
    return rows[0] || null;
}

async function getOrderForUser(id, userId) {
    const rows = await request(
        '/rest/v1/orders?id=eq.' +
            encodeURIComponent(id) +
            '&user_id=eq.' +
            encodeURIComponent(userId) +
            '&select=*'
    );
    return rows[0] || null;
}

async function listOrdersForUser(userId) {
    return request(
        '/rest/v1/orders?user_id=eq.' +
            encodeURIComponent(userId) +
            '&select=id,original_name,reference,amount,status,created_at,paid_at' +
            '&order=created_at.desc&limit=50'
    );
}

// Only moves pending -> paid once, so a double verify cannot start two jobs.
async function markPaid(id) {
    const rows = await request(
        '/rest/v1/orders?id=eq.' + encodeURIComponent(id) + '&status=eq.pending&select=id',
        {
            method: 'PATCH',
            body: { status: 'paid', paid_at: new Date().toISOString() },
            prefer: 'return=representation'
        }
    );
    return rows.length === 1;
}

async function setStatus(id, status) {
    await request('/rest/v1/orders?id=eq.' + encodeURIComponent(id), {
        method: 'PATCH',
        body: { status }
    });
}

async function saveResult(id, result) {
    await request('/rest/v1/orders?id=eq.' + encodeURIComponent(id), {
        method: 'PATCH',
        body: { status: 'ready', result }
    });
}

/* ---------- Storage ---------- */
function encodeObjectPath(objectPath) {
    return objectPath.split('/').map(encodeURIComponent).join('/');
}

let bucketReady = null;

// Idempotent: creates the private bucket if schema.sql has not been run yet.
async function ensureBucket() {
    if (bucketReady) return bucketReady;

    bucketReady = (async () => {
        assertConfigured();

        const response = await fetch(SUPABASE_URL + '/storage/v1/bucket', {
            method: 'POST',
            headers: {
                apikey: SERVICE_ROLE_KEY,
                Authorization: 'Bearer ' + SERVICE_ROLE_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false })
        });

        if (response.ok) return;

        const detail = await response.text().catch(() => '');
        if (/already exists/i.test(detail) || response.status === 409) return;

        throw new Error(
            'Could not create the storage bucket "' + BUCKET + '": ' + detail.slice(0, 200)
        );
    })().catch((error) => {
        bucketReady = null;
        throw error;
    });

    return bucketReady;
}

async function createSignedUploadUrl(objectPath) {
    await ensureBucket();

    const response = await fetch(
        SUPABASE_URL +
            '/storage/v1/object/upload/sign/' +
            BUCKET +
            '/' +
            encodeObjectPath(objectPath),
        {
            method: 'POST',
            headers: {
                apikey: SERVICE_ROLE_KEY,
                Authorization: 'Bearer ' + SERVICE_ROLE_KEY,
                'Content-Type': 'application/json'
            },
            body: '{}'
        }
    );

    if (!response.ok) {
        const detail = (await response.text().catch(() => '')).slice(0, 300);
        throw new Error(
            'Could not create an upload URL (' + response.status + '): ' + detail
        );
    }

    const payload = await response.json();
    if (!payload || !payload.url) {
        throw new Error('Storage did not return a signed upload URL.');
    }

    const signedUrl = /^https?:\/\//i.test(payload.url)
        ? payload.url
        : SUPABASE_URL + '/storage/v1' + (payload.url.startsWith('/') ? '' : '/') + payload.url;
    const token = new URL(signedUrl).searchParams.get('token');

    if (!token) throw new Error('Storage did not return an upload token.');

    return { bucket: BUCKET, path: objectPath, token, signedUrl };
}

async function getObjectMetadata(objectPath) {
    assertConfigured();

    // Supabase's object HEAD response omits Content-Length, so read the
    // info endpoint instead; it reports the stored size reliably.
    const response = await fetch(
        SUPABASE_URL + '/storage/v1/object/info/' + BUCKET + '/' + encodeObjectPath(objectPath),
        {
            headers: {
                apikey: SERVICE_ROLE_KEY,
                Authorization: 'Bearer ' + SERVICE_ROLE_KEY
            }
        }
    );

    if (response.status === 400 || response.status === 404) return null;

    if (!response.ok) {
        throw new Error('Storage metadata check failed (' + response.status + ') for ' + objectPath);
    }

    const info = await response.json();
    const size = Number(info && info.size);

    return {
        size: Number.isFinite(size) ? size : null,
        contentType: (info && info.content_type) || ''
    };
}

async function uploadObject(objectPath, buffer, contentType) {
    await ensureBucket();

    const response = await fetch(
        SUPABASE_URL + '/storage/v1/object/' + BUCKET + '/' + encodeObjectPath(objectPath),
        {
            method: 'POST',
            headers: {
                apikey: SERVICE_ROLE_KEY,
                Authorization: 'Bearer ' + SERVICE_ROLE_KEY,
                'Content-Type': contentType || 'application/octet-stream',
                'x-upsert': 'false'
            },
            body: buffer
        }
    );

    if (!response.ok) {
        const detail = (await response.text().catch(() => '')).slice(0, 300);
        throw new Error('Storage upload failed (' + response.status + '): ' + detail);
    }

    return objectPath;
}

async function downloadObject(objectPath) {
    assertConfigured();

    const response = await fetch(
        SUPABASE_URL + '/storage/v1/object/' + BUCKET + '/' + encodeObjectPath(objectPath),
        {
            headers: {
                apikey: SERVICE_ROLE_KEY,
                Authorization: 'Bearer ' + SERVICE_ROLE_KEY
            }
        }
    );

    if (!response.ok) {
        throw new Error('Storage download failed (' + response.status + ') for ' + objectPath);
    }

    return Buffer.from(await response.arrayBuffer());
}

async function removeObject(objectPath) {
    assertConfigured();

    const response = await fetch(
        SUPABASE_URL + '/storage/v1/object/' + BUCKET + '/' + encodeObjectPath(objectPath),
        {
            method: 'DELETE',
            headers: {
                apikey: SERVICE_ROLE_KEY,
                Authorization: 'Bearer ' + SERVICE_ROLE_KEY
            }
        }
    );

    if (!response.ok && response.status !== 404) {
        throw new Error('Storage delete failed (' + response.status + ') for ' + objectPath);
    }
}

module.exports = {
    isConfigured,
    getUserByToken,
    insertOrder,
    getOrder,
    getOrderForUser,
    listOrdersForUser,
    markPaid,
    setStatus,
    saveResult,
    ensureBucket,
    createSignedUploadUrl,
    getObjectMetadata,
    uploadObject,
    downloadObject,
    removeObject
};
