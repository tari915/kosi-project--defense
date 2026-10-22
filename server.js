require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const supabase = require('./lib/supabase.js');
const { requireUser } = require('./lib/auth.js');
const { extractText } = require('./lib/extract.js');
const { generateStudyPack } = require('./lib/study-pack.js');
const { waitUntil } = require('@vercel/functions');

const PORT = process.env.PORT || 3100;
const PRICE_KOBO = Number(process.env.PRICE_KOBO) || 100000; // 100000 kobo = ₦1,000
const PRICE_LABEL = '₦' + (PRICE_KOBO / 100).toLocaleString('en-NG');
const MAX_FILE_MB = 10;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt'];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PUBLIC_DIR = path.join(__dirname, 'public');

function cleanFileName(value) {
    const name = String(value || '')
        .split(/[\\/]/)
        .pop()
        .trim();

    if (name.length <= 180) return name;

    const extension = path.extname(name);
    return name.slice(0, Math.max(0, 180 - extension.length)) + extension;
}

function startProcessing(orderId) {
    const job = processOrder(orderId);

    if (process.env.VERCEL && typeof waitUntil === 'function') {
        try {
            waitUntil(job);
            return;
        } catch (error) {
            console.error('Could not register background job:', error);
        }
    }

    job.catch((error) => {
        console.error('Background generation failed for order ' + orderId + ':', error);
    });
}

/* ============================================================
   APP
   ============================================================ */
const app = express();
app.use(express.json());

app.get('/api/config', (req, res) => {
    res.json({
        paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY,
        amount: PRICE_KOBO,
        priceLabel: PRICE_LABEL
    });
});

// 1a. Create a signed upload URL. The browser uploads directly to Supabase,
// so Vercel's 4.5 MB function request limit does not apply.
app.post('/api/uploads', requireUser, async (req, res) => {
    const originalName = cleanFileName(req.body && req.body.name);
    const extension = path.extname(originalName).toLowerCase();
    const size = Number(req.body && req.body.size);

    if (!req.user.email) {
        return res.status(400).json({ error: 'Your account has no email address.' });
    }

    if (!originalName || !ALLOWED_EXTENSIONS.includes(extension)) {
        return res.status(400).json({ error: 'Only PDF, DOCX or TXT files are allowed.' });
    }

    if (!Number.isFinite(size) || size <= 0) {
        return res.status(400).json({ error: 'That file looks empty. Choose another file.' });
    }

    if (size > MAX_FILE_BYTES) {
        return res.status(400).json({
            error: 'That file is larger than ' + MAX_FILE_MB + 'MB.'
        });
    }

    const id = crypto.randomUUID();
    const storagePath = 'orders/' + req.user.id + '/' + id + extension;

    try {
        const uploadTicket = await supabase.createSignedUploadUrl(storagePath);
        return res.json({
            id,
            path: storagePath,
            bucket: uploadTicket.bucket,
            token: uploadTicket.token
        });
    } catch (error) {
        console.error('Could not create upload URL:', error);
        return res.status(502).json({ error: 'We could not prepare your upload. Please try again.' });
    }
});

// 1b. Finalize the order after the browser has put the file in Supabase Storage.
app.post('/api/orders', requireUser, async (req, res) => {
    const id = String((req.body && req.body.id) || '').trim();
    const originalName = cleanFileName(req.body && req.body.originalName);
    const extension = path.extname(originalName).toLowerCase();
    const suppliedPath = String((req.body && req.body.path) || '').trim();

    if (!UUID_PATTERN.test(id)) {
        return res.status(400).json({ error: 'That upload is not valid. Choose your file again.' });
    }

    if (!originalName || !ALLOWED_EXTENSIONS.includes(extension)) {
        return res.status(400).json({ error: 'Only PDF, DOCX or TXT files are allowed.' });
    }

    if (!req.user.email) {
        return res.status(400).json({ error: 'Your account has no email address.' });
    }

    const storagePath = 'orders/' + req.user.id + '/' + id + extension;

    if (suppliedPath && suppliedPath !== storagePath) {
        return res.status(400).json({ error: 'That upload is not valid. Choose your file again.' });
    }

    let metadata;

    try {
        metadata = await supabase.getObjectMetadata(storagePath);
    } catch (error) {
        console.error('Could not check upload:', error);
        return res.status(502).json({ error: 'We could not check your upload. Please try again.' });
    }

    if (!metadata) {
        return res.status(400).json({
            error: 'We could not find that upload. Please choose your file again.'
        });
    }

    if (!metadata.size) {
        return res.status(400).json({
            error: 'That upload looks empty. Please choose your file again.'
        });
    }

    if (metadata.size > MAX_FILE_BYTES) {
        await supabase.removeObject(storagePath).catch(() => {});
        return res.status(400).json({
            error: 'That file is larger than ' + MAX_FILE_MB + 'MB.'
        });
    }

    const order = {
        id,
        user_id: req.user.id,
        email: req.user.email,
        original_name: originalName,
        storage_path: storagePath,
        reference: 'SF-' + crypto.randomBytes(8).toString('hex'),
        amount: PRICE_KOBO
    };

    try {
        await supabase.insertOrder(order);
    } catch (error) {
        const duplicate = /duplicate key|23505/i.test(error.message || '');
        const existing = duplicate
            ? await supabase.getOrderForUser(id, req.user.id).catch(() => null)
            : null;

        if (existing && existing.storage_path === storagePath) {
            return res.json({
                id: existing.id,
                reference: existing.reference,
                amount: existing.amount
            });
        }

        if (!duplicate) {
            await supabase.removeObject(storagePath).catch(() => {});
        }

        console.error('Could not create order:', error);
        return res.status(502).json({ error: 'We could not save your upload. Please try again.' });
    }

    res.json({ id: order.id, reference: order.reference, amount: order.amount });
});

// 2. Verify payment with Paystack (never trust the browser's "success")
app.post('/api/orders/:id/verify', requireUser, async (req, res) => {
    let order;

    try {
        order = await supabase.getOrderForUser(req.params.id, req.user.id);
    } catch (error) {
        console.error('Could not load order:', error);
        return res.status(503).json({ error: 'We could not load this order. Try again in a moment.' });
    }

    if (!order) return res.status(404).json({ error: 'Order not found.' });

    if (order.status !== 'pending') {
        return res.json({ status: order.status });
    }

    let body;

    try {
        const response = await fetch(
            'https://api.paystack.co/transaction/verify/' + encodeURIComponent(order.reference),
            { headers: { Authorization: 'Bearer ' + process.env.PAYSTACK_SECRET_KEY } }
        );
        body = await response.json();
    } catch (error) {
        console.error('Verify failed:', error);
        return res.status(502).json({ error: 'Could not reach the payment provider. Try again.' });
    }

    const data = body.data || {};

    const paid =
        body.status === true &&
        data.status === 'success' &&
        data.amount === order.amount &&
        data.currency === 'NGN';

    if (!paid) {
        return res.status(402).json({ error: 'Payment not confirmed yet. Please try again.' });
    }

    try {
        // Only the first verify wins, so a double click cannot start two jobs.
        const claimed = await supabase.markPaid(order.id);
        if (claimed) startProcessing(order.id);
    } catch (error) {
        console.error('Could not start order ' + order.id + ':', error);
        return res.status(500).json({
            error: 'Payment confirmed, but we could not start your pack. Please try again.'
        });
    }

    res.json({ status: 'processing' });
});

// 3. The dashboard lists the signed-in user's orders
app.get('/api/me/orders', requireUser, async (req, res) => {
    try {
        const orders = await supabase.listOrdersForUser(req.user.id);
        res.json({ orders: orders || [] });
    } catch (error) {
        console.error('Could not load orders:', error);
        res.status(503).json({ error: 'Could not load your packs right now. Try again.' });
    }
});

// 4. The browser polls this until status is "ready"
app.get('/api/orders/:id', requireUser, async (req, res) => {
    let order;

    try {
        order = await supabase.getOrderForUser(req.params.id, req.user.id);
    } catch (error) {
        console.error('Could not load order:', error);
        return res.status(503).json({ error: 'We could not load this order. Try again in a moment.' });
    }

    if (!order) return res.status(404).json({ error: 'Order not found.' });

    let result = null;

    if (order.status === 'ready' && order.result) {
        if (typeof order.result === 'string') {
            try {
                result = JSON.parse(order.result);
            } catch (error) {
                console.error('Stored result is not valid JSON for order ' + order.id);
            }
        } else {
            result = order.result;
        }
    }

    res.json({
        id: order.id,
        status: order.status,
        reference: order.reference,
        original_name: order.original_name,
        amount: order.amount,
        created_at: order.created_at,
        paid_at: order.paid_at,
        result
    });
});

// API 404s stay JSON instead of falling through to the SPA
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Not found.' });
});

/* ============================================================
   STUDY PACK GENERATION
   Download -> extract text -> Gemini -> save JSON.
   ============================================================ */
async function processOrder(orderId) {
    try {
        await supabase.setStatus(orderId, 'processing');

        const order = await supabase.getOrder(orderId);
        if (!order) throw new Error('Order disappeared before processing.');

        const file = await supabase.downloadObject(order.storage_path);
        const text = await extractText(file, order.original_name);
        const result = await generateStudyPack(text, order.original_name);

        await supabase.saveResult(orderId, result);

        // The source file is no longer needed once the pack is saved.
        await supabase.removeObject(order.storage_path).catch((error) => {
            console.error('Could not delete upload for order ' + orderId + ':', error);
        });
    } catch (error) {
        console.error('Processing failed for order ' + orderId + ':', error);
        await supabase.setStatus(orderId, 'failed').catch((failure) => {
            console.error('Could not mark order ' + orderId + ' as failed:', failure);
        });
    }
}

/* ============================================================
   STATIC FRONTEND
   ============================================================ */
if (fs.existsSync(PUBLIC_DIR)) {
    app.use(express.static(PUBLIC_DIR));

    app.get(/^(?!\/api).*/, (req, res) => {
        res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
    });
} else {
    app.get('/', (req, res) => {
        res.send('StudyFlow API is running. Run "npm run build" to serve the React app.');
    });
}

/* ---------- Error handler ---------- */
app.use((error, req, res, next) => {
    console.error('Request failed:', error);
    res.status(400).json({ error: error.message || 'Something went wrong.' });
});

function looksLikePlaceholder(value) {
    return !value || /x{8,}|your[-_]/i.test(value);
}

function startServer() {
    app.listen(PORT, () => {
        console.log('StudyFlow running at http://localhost:' + PORT);

        if (!supabase.isConfigured()) {
            console.warn(
                'WARNING: Supabase is not configured — orders and uploads will fail until .env is filled in.'
            );
        }
        if (!process.env.GEMINI_API_KEY) {
            console.warn('WARNING: GEMINI_API_KEY is not set — study pack generation will fail.');
        }
        if (
            looksLikePlaceholder(process.env.PAYSTACK_PUBLIC_KEY) ||
            looksLikePlaceholder(process.env.PAYSTACK_SECRET_KEY)
        ) {
            console.warn(
                'WARNING: Paystack keys look like placeholders — add your real test or live keys to .env.'
            );
        }
    });
}

if (require.main === module) {
    startServer();
}

module.exports = app;
module.exports.config = { maxDuration: 300 };
