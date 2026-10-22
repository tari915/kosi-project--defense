/* ============================================================
   AUTH MIDDLEWARE
   Verifies the Supabase access token sent by the browser and
   attaches the verified user to req.user. Server-only.
   ============================================================ */
const supabase = require('./supabase.js');

async function requireUser(req, res, next) {
    if (!supabase.isConfigured()) {
        return res.status(503).json({ error: 'Accounts are not configured yet.' });
    }

    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';

    if (!token) {
        return res.status(401).json({ error: 'Sign in to continue.' });
    }

    try {
        const user = await supabase.getUserByToken(token);

        if (!user || !user.id) {
            return res.status(401).json({ error: 'Your session expired. Sign in again.' });
        }

        req.user = { id: user.id, email: user.email };
        return next();
    } catch (error) {
        console.error('Could not verify session:', error);
        return res.status(503).json({ error: 'Could not verify your session. Try again.' });
    }
}

module.exports = { requireUser };
