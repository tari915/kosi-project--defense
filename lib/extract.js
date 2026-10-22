/* ============================================================
   TEXT EXTRACTION
   PDF, DOCX and TXT in; cleaned plain text out.
   ============================================================ */
const path = require('path');
const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');

const MAX_TEXT_CHARS = Number(process.env.MAX_TEXT_CHARS) || 60000;
const MIN_TEXT_CHARS = 120;

function clean(text) {
    return String(text || '')
        .replace(/\r\n?/g, '\n')
        .replace(/\u0000/g, '')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

async function extractText(buffer, filename) {
    const ext = path.extname(filename || '').toLowerCase();
    let text = '';

    if (ext === '.txt') {
        text = buffer.toString('utf8');
    } else if (ext === '.pdf') {
        const parser = new PDFParse({ data: buffer });
        try {
            const result = await parser.getText();
            text = result.text || '';
        } finally {
            await parser.destroy().catch(() => {});
        }
    } else if (ext === '.docx') {
        const result = await mammoth.extractRawText({ buffer });
        text = result.value || '';
    } else {
        throw new Error('Only PDF, DOCX or TXT files are supported.');
    }

    const cleaned = clean(text);

    if (cleaned.length < MIN_TEXT_CHARS) {
        throw new Error(
            'We could not read enough text from that file. If it is a scanned PDF, upload a text-based PDF, DOCX or TXT instead.'
        );
    }

    // Keep prompts inside a predictable token budget.
    return cleaned.length > MAX_TEXT_CHARS ? cleaned.slice(0, MAX_TEXT_CHARS) : cleaned;
}

module.exports = { extractText, MAX_TEXT_CHARS };
