require('dotenv').config();

const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const PORT = process.env.PORT || 3000;
const PRICE_KOBO = 100000; // ₦1,000 in kobo
const MAX_FILE_MB = 10;
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt'];

/* ============================================================
   DATABASE (SQL)
   This uses SQLite so it runs with zero setup. To move to MySQL
   or PostgreSQL later, keep the same SQL and swap the driver
   (mysql2 / pg). Only the .run/.get calls change.
   ============================================================ */
const db = new Database(path.join(__dirname, 'studyflow.db'));

db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
        id             TEXT PRIMARY KEY,
        email          TEXT NOT NULL,
        original_name  TEXT NOT NULL,
        stored_name    TEXT NOT NULL,
        reference      TEXT NOT NULL UNIQUE,
        amount         INTEGER NOT NULL,
        status         TEXT NOT NULL DEFAULT 'pending',
        result         TEXT,
        created_at     TEXT NOT NULL DEFAULT (datetime('now')),
        paid_at        TEXT
    )
`);

const insertOrder = db.prepare(`
    INSERT INTO orders (id, email, original_name, stored_name, reference, amount)
    VALUES (@id, @email, @original_name, @stored_name, @reference, @amount)
`);

const getOrder = db.prepare(`SELECT * FROM orders WHERE id = ?`);

// Only moves pending -> paid once, so a double verify cannot start two jobs
const markPaid = db.prepare(`
    UPDATE orders SET status = 'paid', paid_at = datetime('now')
    WHERE id = ? AND status = 'pending'
`);

const setStatus = db.prepare(`UPDATE orders SET status = ? WHERE id = ?`);

const saveResult = db.prepare(`UPDATE orders SET status = 'ready', result = ? WHERE id = ?`);

/* ============================================================
   FILE UPLOADS
   ============================================================ */
const storage = multer.diskStorage({
    destination: path.join(__dirname, 'uploads'),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, crypto.randomUUID() + ext);
    }
});

const upload = multer({
    storage,
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

// Only the "public" folder is served, so server.js, .env and uploads stay private
app.use(express.static(path.join(__dirname, 'public')));

// Safe settings the browser needs (the public key is meant to be public)
app.get('/api/config', (req, res) => {
    res.json({ paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY, amount: PRICE_KOBO });
});

// 1. Create an order and store the uploaded file
app.post('/api/orders', upload.single('file'), (req, res) => {
    const email = (req.body.email || '').trim();

    if (!req.file) {
        return res.status(400).json({ error: 'Please upload a file.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Enter a valid email address.' });
    }

    const order = {
        id: crypto.randomUUID(),
        email,
        original_name: req.file.originalname,
        stored_name: req.file.filename,
        reference: 'SF-' + crypto.randomBytes(8).toString('hex'),
        amount: PRICE_KOBO
    };

    insertOrder.run(order);

    res.json({ id: order.id, reference: order.reference, amount: order.amount });
});

// 2. Verify payment with Paystack (never trust the browser's "success")
app.post('/api/orders/:id/verify', async (req, res) => {
    const order = getOrder.get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    if (order.status !== 'pending') {
        return res.json({ status: order.status });
    }

    try {
        const response = await fetch(
            'https://api.paystack.co/transaction/verify/' + encodeURIComponent(order.reference),
            { headers: { Authorization: 'Bearer ' + process.env.PAYSTACK_SECRET_KEY } }
        );
        const body = await response.json();
        const data = body.data || {};

        const paid =
            body.status === true &&
            data.status === 'success' &&
            data.amount === order.amount &&
            data.currency === 'NGN';

        if (!paid) {
            return res.status(402).json({ error: 'Payment not confirmed yet. Please try again.' });
        }

        if (markPaid.run(order.id).changes === 1) {
            processOrder(order.id); // runs in the background
        }

        res.json({ status: 'processing' });
    } catch (error) {
        console.error('Verify failed:', error);
        res.status(502).json({ error: 'Could not reach the payment provider. Try again.' });
    }
});

// 3. The browser polls this until status is "ready"
app.get('/api/orders/:id', (req, res) => {
    const order = getOrder.get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    res.json({
        id: order.id,
        status: order.status,
        result: order.status === 'ready' ? JSON.parse(order.result) : null
    });
});

/* ============================================================
   STUDY PACK GENERATION
   ============================================================ */
async function processOrder(orderId) {
    try {
        setStatus.run('processing', orderId);

        const order = getOrder.get(orderId);
        const filePath = path.join(__dirname, 'uploads', order.stored_name);

        const result = await generateStudyPack(filePath, order.original_name);

        saveResult.run(JSON.stringify(result), orderId);
    } catch (error) {
        console.error('Processing failed for order ' + orderId + ':', error);
        setStatus.run('failed', orderId);
    }
}

// PLACEHOLDER: replace the body with your real logic:
//   1. extract text (pdf-parse for PDF, mammoth for DOCX, fs.readFile for TXT)
//   2. send the text to your AI API
//   3. return an object in the same shape as below
async function generateStudyPack(filePath, originalName) {
    await new Promise((resolve) => setTimeout(resolve, 3000));

    return {
        summary: 'Sample summary for ' + originalName + '. Replace this with AI-generated content.',
        flashcards: [
            { q: 'Sample question 1?', a: 'Sample answer 1.' },
            { q: 'Sample question 2?', a: 'Sample answer 2.' }
        ],
        mcqs: [
            {
                question: 'Sample multiple-choice question?',
                options: ['A. First', 'B. Second', 'C. Third', 'D. Fourth'],
                answer: 'B'
            }
        ]
    };
}

/* ---------- Error handler (upload errors, etc.) ---------- */
app.use((error, req, res, next) => {
    const message =
        error.code === 'LIMIT_FILE_SIZE'
            ? 'That file is larger than ' + MAX_FILE_MB + 'MB.'
            : error.message || 'Something went wrong.';
    res.status(400).json({ error: message });
});

app.listen(PORT, () => {
    console.log('StudyFlow running at http://localhost:' + PORT);
});
