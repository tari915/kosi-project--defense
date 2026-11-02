/* ============================================================
   STUDY PACK GENERATION (Google Gemini)
   Text in; a plan-shaped { summary, sections, flashcards, mcqs } out.
   ============================================================ */
const GEMINI_MODEL = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();
const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || '').trim();

const FREE_MCQ_LIMIT = 5;
const PREMIUM_MCQ_LIMIT = 12;

function buildSchema(plan) {
    const mcqSchema = {
        type: 'object',
        properties: {
            question: { type: 'string' },
            options: { type: 'array', items: { type: 'string' } },
            answer: { type: 'string' },
            ...(plan === 'premium' ? { explanation: { type: 'string' } } : {})
        },
        required:
            plan === 'premium'
                ? ['question', 'options', 'answer', 'explanation']
                : ['question', 'options', 'answer']
    };

    if (plan !== 'premium') {
        return {
            type: 'object',
            properties: {
                summary: { type: 'string' },
                mcqs: { type: 'array', items: mcqSchema }
            },
            required: ['summary', 'mcqs']
        };
    }

    return {
        type: 'object',
        properties: {
            summary: { type: 'string' },
            sections: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        title: { type: 'string' },
                        text: { type: 'string' }
                    },
                    required: ['title', 'text']
                }
            },
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
            mcqs: { type: 'array', items: mcqSchema }
        },
        required: ['summary', 'sections', 'flashcards', 'mcqs']
    };
}

function buildSystemPrompt(plan) {
    const common = `You are StudyFlow, an exam-prep tutor for university students in Nigeria.
Return only JSON that matches the provided schema.

Rules:
- Use only the supplied lecture material. Do not invent facts or examples.
- Write for a student revising for an exam: specific, clear, no filler.
- options are plain text with no "A." prefixes. "answer" must be the exact text of the correct option.
- Do not add fields outside the schema.`;

    if (plan !== 'premium') {
        return `${common}

The student is on the Free plan. Create one basic study pack.
- summary: 90-140 words of exam-relevant prose. Plain text, no markdown.
- mcqs: exactly ${FREE_MCQ_LIMIT} questions, each with exactly 4 options and one correct answer.`;
    }

    return `${common}

The student is on the Premium plan. Create a complete study pack.
- summary: 180-260 words of exam-relevant prose. Plain text, no markdown.
- sections: 3-5 revision notes. Each has a short title and 60-120 words of explanation. These are the revision notes.
- flashcards: 8-12 cards. "q" is one focused question; "a" is a complete, concise answer.
- mcqs: ${PREMIUM_MCQ_LIMIT} questions, each with exactly 4 options, one correct answer, and a 1-2 sentence explanation of why it is correct.`;
}

function buildPrompt(text, originalName, plan) {
    const label = originalName ? ' (' + originalName + ')' : '';
    return (
        'Create a ' +
        (plan === 'premium' ? 'Premium' : 'Free') +
        ' study pack from this lecture material' +
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

async function callGemini(text, originalName, plan) {
    if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not configured. Add it to .env.');
    }

    const url =
        'https://generativelanguage.googleapis.com/v1beta/models/' +
        encodeURIComponent(GEMINI_MODEL) +
        ':generateContent?key=' +
        encodeURIComponent(GEMINI_API_KEY);

    const generationConfig = {
        temperature: plan === 'premium' ? 0.4 : 0.3,
        maxOutputTokens: plan === 'premium' ? 6144 : 2048,
        responseMimeType: 'application/json',
        responseSchema: buildSchema(plan)
    };

    // Flash models think by default; the budget belongs to the JSON output here.
    if (/flash/i.test(GEMINI_MODEL)) {
        generationConfig.thinkingConfig = { thinkingBudget: 0 };
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: buildSystemPrompt(plan) }] },
            contents: [
                { role: 'user', parts: [{ text: buildPrompt(text, originalName, plan) }] }
            ],
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

function normalizeResult(raw, plan) {
    const summary = String((raw && raw.summary) || '').trim();

    const sections =
        plan === 'premium'
            ? (Array.isArray(raw && raw.sections) ? raw.sections : [])
                  .map((section) => ({
                      title: String((section && section.title) || '').trim(),
                      text: String((section && section.text) || '').trim()
                  }))
                  .filter((section) => section.title && section.text)
                  .slice(0, 6)
            : [];

    const flashcards =
        plan === 'premium'
            ? (Array.isArray(raw && raw.flashcards) ? raw.flashcards : [])
                  .map((card) => ({
                      q: String((card && (card.q || card.question)) || '').trim(),
                      a: String((card && (card.a || card.answer)) || '').trim()
                  }))
                  .filter((card) => card.q && card.a)
                  .slice(0, 16)
            : [];

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
                answer,
                ...(plan === 'premium'
                    ? { explanation: String((item && item.explanation) || '').trim() }
                    : {})
            };
        })
        .filter((item) => item.question && item.options.length >= 2 && item.answer)
        .slice(0, plan === 'premium' ? PREMIUM_MCQ_LIMIT : FREE_MCQ_LIMIT);

    if (!summary || mcqs.length < 1) {
        throw new Error('The AI response did not contain a complete study pack.');
    }

    if (plan === 'premium' && flashcards.length < 3) {
        throw new Error('The AI response did not contain enough flashcards.');
    }

    return { summary, sections, flashcards, mcqs };
}

async function generateStudyPack(text, originalName, plan = 'free') {
    const normalizedPlan = plan === 'premium' ? 'premium' : 'free';
    const output = await withRetry(() => callGemini(text, originalName, normalizedPlan));

    let parsed;
    try {
        parsed = JSON.parse(output);
    } catch (error) {
        throw new Error('Gemini returned invalid JSON for the study pack.');
    }

    return normalizeResult(parsed, normalizedPlan);
}

module.exports = {
    generateStudyPack,
    GEMINI_MODEL,
    FREE_MCQ_LIMIT,
    PREMIUM_MCQ_LIMIT
};
