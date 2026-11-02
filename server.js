require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const supabase = require('./lib/supabase.js');
const { requireUser } = require('./lib/auth.js');
const { generateStudyPack } = require('./lib/study-pack.js');
const {
    getEntitlement,
    limitMessage,
    FREE_UPLOAD_LIMIT,
    PREMIUM_UPLOAD_LIMIT,
    PREMIUM_DAYS
} = require('./lib/entitlements.js');
const { waitUntil } = require('@vercel/functions');

const PORT = process.env.PORT || 3100;
const PRICE_KOBO = Number(process.env.PRICE_KOBO) || 500000; // 500000 kobo = ₦5,000 / 30 days
const PRICE_LABEL = '₦' + (PRICE_KOBO / 100).toLocaleString('en-NG');
const BROWSER_SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '')
    .trim()
    .replace(/\/+$/, '');
const BROWSER_SUPABASE_ANON_KEY = (
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
).trim();
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
    const supabaseUrl = /your-project/i.test(BROWSER_SUPABASE_URL) ? '' : BROWSER_SUPABASE_URL;
    const supabaseAnonKey = /your-anon/i.test(BROWSER_SUPABASE_ANON_KEY)
        ? ''
        : BROWSER_SUPABASE_ANON_KEY;

    res.set('Cache-Control', 'no-store');
    res.json({
        paystackPublicKey: looksLikePlaceholder(process.env.PAYSTACK_PUBLIC_KEY)
            ? ''
            : process.env.PAYSTACK_PUBLIC_KEY,
        amount: PRICE_KOBO,
        priceLabel: PRICE_LABEL,
        premiumDays: PREMIUM_DAYS,
        freeUploadLimit: FREE_UPLOAD_LIMIT,
        premiumUploadLimit: PREMIUM_UPLOAD_LIMIT,
        supabaseUrl,
        supabaseAnonKey
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

    let entitlement;

    try {
        entitlement = await getEntitlement(req.user.id);
    } catch (error) {
        console.error('Could not check plan:', error);
        return res.status(503).json({ error: 'We could not check your plan. Try again in a moment.' });
    }

    if (!entitlement.canGenerate) {
        return res.status(402).json({
            error: limitMessage(entitlement),
            code: 'LIMIT_REACHED',
            subscription: entitlement
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

    let entitlement;

    try {
        entitlement = await getEntitlement(req.user.id);
    } catch (error) {
        console.error('Could not check plan:', error);
        await supabase.removeObject(storagePath).catch(() => {});
        return res.status(503).json({ error: 'We could not check your plan. Try again in a moment.' });
    }

    if (!entitlement.canGenerate) {
        await supabase.removeObject(storagePath).catch(() => {});
        return res.status(402).json({
            error: limitMessage(entitlement),
            code: 'LIMIT_REACHED',
            subscription: entitlement
        });
    }

    const order = {
        id,
        user_id: req.user.id,
        email: req.user.email,
        original_name: originalName,
        storage_path: storagePath,
        reference: 'SF-' + crypto.randomBytes(8).toString('hex'),
        amount: 0,
        plan: entitlement.plan,
        status: 'processing'
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
                status: existing.status,
                plan: existing.plan
            });
        }

        if (!duplicate) {
            await supabase.removeObject(storagePath).catch(() => {});
        }

        console.error('Could not create order:', error);
        return res.status(502).json({ error: 'We could not save your upload. Please try again.' });
    }

    startProcessing(order.id);

    res.json({
        id: order.id,
        reference: order.reference,
        status: order.status,
        plan: order.plan
    });
});

/* ============================================================
   PREMIUM SUBSCRIPTION
   One Paystack payment unlocks 30 days and 10 uploads.
   ============================================================ */
app.post('/api/subscriptions', requireUser, async (req, res) => {
    if (!req.user.email) {
        return res.status(400).json({ error: 'Your account has no email address.' });
    }

    if (
        looksLikePlaceholder(process.env.PAYSTACK_SECRET_KEY) ||
        looksLikePlaceholder(process.env.PAYSTACK_PUBLIC_KEY)
    ) {
        return res.status(503).json({ error: 'Upgrades are not configured yet. Try again later.' });
    }

    let active;

    try {
        active = await supabase.getActiveSubscription(req.user.id);
    } catch (error) {
        console.error('Could not check subscription:', error);
        return res.status(503).json({ error: 'We could not check your plan. Try again in a moment.' });
    }

    if (active) {
        return res.status(409).json({
            error:
                'Premium is already active until ' +
                new Date(active.expires_at).toISOString().slice(0, 10) +
                '.',
            code: 'ALREADY_PREMIUM',
            premiumUntil: active.expires_at
        });
    }

    const subscription = {
        id: crypto.randomUUID(),
        user_id: req.user.id,
        email: req.user.email,
        reference: 'SF-P-' + crypto.randomBytes(8).toString('hex'),
        amount: PRICE_KOBO,
        status: 'pending'
    };

    try {
        await supabase.insertSubscription(subscription);
    } catch (error) {
        console.error('Could not create subscription:', error);
        return res.status(502).json({ error: 'We could not start your upgrade. Please try again.' });
    }

    res.json({
        id: subscription.id,
        reference: subscription.reference,
        amount: subscription.amount,
        priceLabel: PRICE_LABEL,
        premiumDays: PREMIUM_DAYS
    });
});

app.post('/api/subscriptions/:id/verify', requireUser, async (req, res) => {
    let subscription;

    try {
        subscription = await supabase.getSubscriptionForUser(req.params.id, req.user.id);
    } catch (error) {
        console.error('Could not load subscription:', error);
        return res.status(503).json({ error: 'We could not load this upgrade. Try again in a moment.' });
    }

    if (!subscription) return res.status(404).json({ error: 'Upgrade not found.' });

    if (subscription.status === 'active') {
        return res.json({
            status: 'active',
            plan: 'premium',
            premiumUntil: subscription.expires_at
        });
    }

    if (subscription.status !== 'pending') {
        return res.status(409).json({ error: 'This upgrade is not awaiting payment.' });
    }

    let body;

    try {
        const response = await fetch(
            'https://api.paystack.co/transaction/verify/' +
                encodeURIComponent(subscription.reference),
            { headers: { Authorization: 'Bearer ' + process.env.PAYSTACK_SECRET_KEY } }
        );
        body = await response.json();
    } catch (error) {
        console.error('Upgrade verify failed:', error);
        return res.status(502).json({ error: 'Could not reach the payment provider. Try again.' });
    }

    const data = body.data || {};

    const paid =
        body.status === true &&
        data.status === 'success' &&
        data.amount === subscription.amount &&
        data.currency === 'NGN';

    if (!paid) {
        return res.status(402).json({ error: 'Payment not confirmed yet. Please try again.' });
    }

    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + PREMIUM_DAYS * 24 * 60 * 60 * 1000);

    try {
        const claimed = await supabase.markSubscriptionActive(
            subscription.id,
            startedAt.toISOString(),
            expiresAt.toISOString()
        );

        if (!claimed) {
            const current = await supabase.getSubscriptionForUser(
                subscription.id,
                req.user.id
            );

            if (current && current.status === 'active') {
                return res.json({
                    status: 'active',
                    plan: 'premium',
                    premiumUntil: current.expires_at
                });
            }

            return res.status(409).json({ error: 'This upgrade could not be activated.' });
        }
    } catch (error) {
        console.error('Could not activate subscription:', error);
        return res.status(500).json({
            error: 'Payment confirmed, but we could not activate Premium. Please try again.'
        });
    }

    res.json({
        status: 'active',
        plan: 'premium',
        premiumUntil: expiresAt.toISOString(),
        premiumDays: PREMIUM_DAYS
    });
});

app.get('/api/me/subscription', requireUser, async (req, res) => {
    try {
        const entitlement = await getEntitlement(req.user.id);
        res.json({
            ...entitlement,
            priceLabel: PRICE_LABEL,
            premiumDays: PREMIUM_DAYS,
            freeUploadLimit: FREE_UPLOAD_LIMIT,
            premiumUploadLimit: PREMIUM_UPLOAD_LIMIT
        });
    } catch (error) {
        console.error('Could not load subscription:', error);
        res.status(503).json({ error: 'Could not load your plan right now. Try again.' });
    }
});

// 2. The dashboard lists the signed-in user's orders
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
        plan: order.plan,
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
        // Loaded here so a parser problem can never take down the whole API.
        const { extractText } = require('./lib/extract.js');
        const text = await extractText(file, order.original_name);
        const plan = order.plan === 'premium' ? 'premium' : 'free';
        const result = await generateStudyPack(text, order.original_name, plan);

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
