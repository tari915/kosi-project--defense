/* ============================================================
   STUDY PACK GENERATION (Google Gemini)
   Text in; { summary, flashcards, mcqs } out.
   ============================================================ */
const GEMINI_MODEL = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();
const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || '').trim();

const RESULT_SCHEMA = {
    type: 'object',
    properties: {
        summary: { type: 'string' },
        flashcards: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    q: { type: 'string' },
                    a: { type: 'string' }
                },
                required: ['q', 'a']
            }
        },
        mcqs: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    question: { type: 'string' },
                    options: { type: 'array', items: { type: 'string' } },
                    answer: { type: 'string' }
                },
                required: ['question', 'options', 'answer']
            }
        }
    },
    required: ['summary', 'flashcards', 'mcqs']
};

const SYSTEM_PROMPT = `You are StudyFlow, an exam-prep tutor for university students in Nigeria.
Return only JSON that matches the provided schema.

Rules:
- Use only the supplied lecture material. Do not invent facts or examples.
- Write for a student revising for an exam: specific, clear, no filler.
- summary: 120-180 words of exam-relevant prose. Plain text, no markdown.
- flashcards: 8-12 cards. "q" is one focused question; "a" is a complete, concise answer.
- mcqs: 6-8 questions, each with exactly 4 options and one correct answer.
- options are plain text with no "A." prefixes. "answer" must be the exact text of the correct option.
- Do not add fields outside the schema.`;

function buildPrompt(text, originalName) {
    const label = originalName ? ' (' + originalName + ')' : '';
    return (
        'Create a study pack from this lecture material' +
        label +
        '.\n\n--- MATERIAL START ---\n' +
        text +
        '\n--- MATERIAL END ---'
    );
}

function isRetryable(error) {
    return error && (error.status === 429 || error.status >= 500);
}

async function withRetry(run, attempts = 2) {
    let lastError;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
        try {
            return await run();
        } catch (error) {
            lastError = error;
            if (!isRetryable(error) || attempt === attempts - 1) throw error;
            await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
        }
    }

    throw lastError;
}

async function callGemini(text, originalName) {
    if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not configured. Add it to .env.');
    }

    const url =
        'https://generativelanguage.googleapis.com/v1beta/models/' +
        encodeURIComponent(GEMINI_MODEL) +
        ':generateContent?key=' +
        encodeURIComponent(GEMINI_API_KEY);

    const generationConfig = {
        temperature: 0.4,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
        responseSchema: RESULT_SCHEMA
    };

    // Flash models think by default; the budget belongs to the JSON output here.
    if (/flash/i.test(GEMINI_MODEL)) {
        generationConfig.thinkingConfig = { thinkingBudget: 0 };
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ role: 'user', parts: [{ text: buildPrompt(text, originalName) }] }],
            generationConfig
        })
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
        const error = new Error(
            (body && body.error && body.error.message) ||
                'Gemini request failed (' + response.status + ')'
        );
        error.status = response.status;
        throw error;
    }

    const candidate = body.candidates && body.candidates[0];
    const parts = (candidate && candidate.content && candidate.content.parts) || [];
    const output = parts
        .map((part) => part.text || '')
        .join('')
        .trim();

    if (!output) throw new Error('Gemini returned an empty response.');

    return output;
}

function cleanOption(option) {
    return String(option || '')
        .replace(/^[A-Da-d][.)]\s*/, '')
        .trim();
}

function normalizeResult(raw) {
    const summary = String((raw && raw.summary) || '').trim();

    const flashcards = (Array.isArray(raw && raw.flashcards) ? raw.flashcards : [])
        .map((card) => ({
            q: String((card && (card.q || card.question)) || '').trim(),
            a: String((card && (card.a || card.answer)) || '').trim()
        }))
        .filter((card) => card.q && card.a)
        .slice(0, 16);

    const mcqs = (Array.isArray(raw && raw.mcqs) ? raw.mcqs : [])
        .map((item) => {
            const options = (Array.isArray(item && item.options) ? item.options : [])
                .map(cleanOption)
                .filter(Boolean);

            let answer = String((item && item.answer) || '').trim();

            // Models sometimes return "B" instead of the option text.
            if (/^[A-D][.)]?$/i.test(answer)) {
                answer = options[answer[0].toUpperCase().charCodeAt(0) - 65] || '';
            }

            if (answer && !options.includes(answer)) {
                answer =
                    options.find((option) => option.toLowerCase() === answer.toLowerCase()) ||
                    options[0] ||
                    '';
            }

            return {
                question: String((item && item.question) || '').trim(),
                options,
                answer
            };
        })
        .filter((item) => item.question && item.options.length >= 2 && item.answer)
        .slice(0, 12);

    if (!summary || flashcards.length < 3 || mcqs.length < 1) {
        throw new Error('The AI response did not contain a complete study pack.');
    }

    return { summary, flashcards, mcqs };
}

async function generateStudyPack(text, originalName) {
    const output = await withRetry(() => callGemini(text, originalName));

    let parsed;
    try {
        parsed = JSON.parse(output);
    } catch (error) {
        throw new Error('Gemini returned invalid JSON for the study pack.');
    }

    return normalizeResult(parsed);
}

module.exports = { generateStudyPack, GEMINI_MODEL };
