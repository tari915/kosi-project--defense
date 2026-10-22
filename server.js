require('dotenv').config();

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const supabase = require('./lib/supabase.js');
const { requireUser } = require('./lib/auth.js');
const { extractText } = require('./lib/extract.js');
const { generateStudyPack } = require('./lib/study-pack.js');

const PORT = process.env.PORT || 3100;
const PRICE_KOBO = Number(process.env.PRICE_KOBO) || 100000; // 100000 kobo = ₦1,000
const PRICE_LABEL = '₦' + (PRICE_KOBO / 100).toLocaleString('en-NG');
const MAX_FILE_MB = 10;
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt'];
const MIME_BY_EXTENSION = {
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.txt': 'text/plain'
};

const DIST_DIR = path.join(__dirname, 'dist');

/* ============================================================
   FILE UPLOADS
   Kept in memory just long enough to reach Supabase Storage.
   ============================================================ */
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_MB * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            return cb(new Error('Only PDF, DOCX or TXT files are allowed.'));
        }
        cb(null, true);
    }
});

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

// 1. Create an order and store the uploaded file (signed-in users only)
app.post('/api/orders', requireUser, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Please upload a file.' });
    }
    if (!req.user.email) {
        return res.status(400).json({ error: 'Your account has no email address.' });
    }

    const id = crypto.randomUUID();
    const extension = path.extname(req.file.originalname).toLowerCase();
    const storagePath = 'orders/' + id + extension;

    const order = {
        id,
        user_id: req.user.id,
        email: req.user.email,
        original_name: req.file.originalname,
        storage_path: storagePath,
        reference: 'SF-' + crypto.randomBytes(8).toString('hex'),
        amount: PRICE_KOBO
    };

    try {
        await supabase.uploadObject(
            storagePath,
            req.file.buffer,
            req.file.mimetype || MIME_BY_EXTENSION[extension]
        );
        await supabase.insertOrder(order);
    } catch (error) {
        console.error('Could not create order:', error);
        await supabase.removeObject(storagePath).catch(() => {});
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
        if (claimed) processOrder(order.id); // runs in the background
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
if (fs.existsSync(DIST_DIR)) {
    app.use(express.static(DIST_DIR));

    app.get(/^(?!\/api).*/, (req, res) => {
        res.sendFile(path.join(DIST_DIR, 'index.html'));
    });
} else {
    app.get('/', (req, res) => {
        res.send('StudyFlow API is running. Run "npm run build" to serve the React app.');
    });
}

/* ---------- Error handler (upload errors, etc.) ---------- */
app.use((error, req, res, next) => {
    const message =
        error.code === 'LIMIT_FILE_SIZE'
            ? 'That file is larger than ' + MAX_FILE_MB + 'MB.'
            : error.message || 'Something went wrong.';
    res.status(400).json({ error: message });
});

function looksLikePlaceholder(value) {
    return !value || /x{8,}|your[-_]/i.test(value);
}

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
