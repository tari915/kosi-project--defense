import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/authClient.js';

const COPY = {
    signin: {
        title: 'Welcome back.',
        lede: 'Sign in to buy a pack and reopen your library.'
    },
    signup: {
        title: 'Create your account.',
        lede: 'One account keeps every pack in one place.'
    },
    reset: {
        title: 'Reset your password.',
        lede: "We'll email you a secure link to choose a new password."
    },
    'new-password': {
        title: 'Set a new password.',
        lede: "Pick something you'll remember — at least 8 characters."
    }
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function authErrorMessage(error) {
    const message = (error && error.message) || '';

    if (error && error.status === 429) {
        return 'Too many attempts. Wait a minute and try again.';
    }
    if (/invalid login credentials/i.test(message)) {
        return 'Email or password is incorrect.';
    }
    if (/email not confirmed/i.test(message)) {
        return 'Confirm your email first — check your inbox.';
    }
    if (/user already registered/i.test(message)) {
        return 'That email already has an account. Sign in instead.';
    }
    if (/password should be at least/i.test(message)) {
        return 'Use a password with at least 8 characters.';
    }
    if (/auth session missing|session missing/i.test(message)) {
        return 'Your reset link has expired. Request a new one.';
    }
    if (/token has expired|invalid token/i.test(message)) {
        return 'That link has expired. Request a new one.';
    }
    if (/signups not allowed|signup.*disabled/i.test(message)) {
        return 'New sign-ups are disabled right now. Try again later.';
    }
    if (/invalid email/i.test(message)) {
        return 'Enter a valid email address.';
    }

    return message || 'Something went wrong. Please try again.';
}

export default function AuthModal() {
    const { configured, authView, authNotice, openAuth, closeAuth } = useAuth();
    const dialogRef = useRef(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');

    const mode = authView || 'signin';
    const copy = COPY[mode];

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        if (authView && !dialog.open) {
            dialog.showModal();
        } else if (!authView && dialog.open) {
            dialog.close();
        }
    }, [authView]);

    useEffect(() => {
        document.body.classList.toggle('auth-open', Boolean(authView));

        return () => document.body.classList.remove('auth-open');
    }, [authView]);

    useEffect(() => {
        setPassword('');
        setConfirm('');
        setError('');
        setInfo('');

        if (!authView) return undefined;

        const timer = window.setTimeout(() => {
            const node = dialogRef.current && dialogRef.current.querySelector('[data-autofocus]');
            if (node) node.focus();
        }, 40);

        return () => window.clearTimeout(timer);
    }, [authView]);

    async function handleSignIn(event) {
        event.preventDefault();
        setError('');
        setInfo('');

        const address = email.trim();

        if (!EMAIL_PATTERN.test(address)) {
            setError('Enter a valid email address.');
            return;
        }
        if (!password) {
            setError('Enter your password.');
            return;
        }

        setBusy(true);
        const { error: authError } = await supabase.auth.signInWithPassword({
            email: address,
            password
        });
        setBusy(false);

        if (authError) {
            setError(authErrorMessage(authError));
            return;
        }

        closeAuth();
    }

    async function handleSignUp(event) {
        event.preventDefault();
        setError('');
        setInfo('');

        const address = email.trim();

        if (!EMAIL_PATTERN.test(address)) {
            setError('Enter a valid email address.');
            return;
        }
        if (password.length < 8) {
            setError('Use a password with at least 8 characters.');
            return;
        }
        if (password !== confirm) {
            setError('The passwords do not match.');
            return;
        }

        setBusy(true);
        const { data, error: authError } = await supabase.auth.signUp({
            email: address,
            password,
            options: { emailRedirectTo: window.location.origin + '/' }
        });
        setBusy(false);

        if (authError) {
            setError(authErrorMessage(authError));
            return;
        }

        if (data.session) {
            closeAuth();
            return;
        }

        setInfo('Check your email to confirm your account, then sign in.');
    }

    async function handleReset(event) {
        event.preventDefault();
        setError('');
        setInfo('');

        const address = email.trim();

        if (!EMAIL_PATTERN.test(address)) {
            setError('Enter a valid email address.');
            return;
        }

        setBusy(true);
        const { error: authError } = await supabase.auth.resetPasswordForEmail(address, {
            redirectTo: window.location.origin + '/?reset=1'
        });
        setBusy(false);

        if (authError) {
            setError(authErrorMessage(authError));
            return;
        }

        setInfo('If that email has an account, a reset link is on its way.');
    }

    async function handleNewPassword(event) {
        event.preventDefault();
        setError('');
        setInfo('');

        if (password.length < 8) {
            setError('Use a password with at least 8 characters.');
            return;
        }
        if (password !== confirm) {
            setError('The passwords do not match.');
            return;
        }

        setBusy(true);
        const { error: authError } = await supabase.auth.updateUser({ password });
        setBusy(false);

        if (authError) {
            setError(authErrorMessage(authError));
            return;
        }

        closeAuth();
    }

    function handleDialogClick(event) {
        if (event.target === dialogRef.current) closeAuth();
    }

    function renderForm() {
        if (mode === 'signin') {
            return (
                <form className="auth-form" onSubmit={handleSignIn} noValidate>
                    <label className="auth-field">
                        <span className="field-label">Email address</span>
                        <input
                            className="text-input"
                            type="email"
                            autoComplete="email"
                            inputMode="email"
                            placeholder="you@school.edu.ng"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            data-autofocus
                        />
                    </label>

                    <label className="auth-field">
                        <span className="field-label">Password</span>
                        <input
                            className="text-input"
                            type="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                        />
                    </label>

                    <button className="btn btn--accent btn--wide" type="submit" disabled={busy}>
                        {busy ? 'Signing in…' : 'Sign in'}
                    </button>
                </form>
            );
        }

        if (mode === 'signup') {
            return (
                <form className="auth-form" onSubmit={handleSignUp} noValidate>
                    <label className="auth-field">
                        <span className="field-label">Email address</span>
                        <input
                            className="text-input"
                            type="email"
                            autoComplete="email"
                            inputMode="email"
                            placeholder="you@school.edu.ng"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            data-autofocus
                        />
                    </label>

                    <label className="auth-field">
                        <span className="field-label">Password</span>
                        <input
                            className="text-input"
                            type="password"
                            autoComplete="new-password"
                            minLength={8}
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                        />
                    </label>

                    <label className="auth-field">
                        <span className="field-label">Confirm password</span>
                        <input
                            className="text-input"
                            type="password"
                            autoComplete="new-password"
                            minLength={8}
                            value={confirm}
                            onChange={(event) => setConfirm(event.target.value)}
                        />
                    </label>

                    <button className="btn btn--accent btn--wide" type="submit" disabled={busy}>
                        {busy ? 'Creating account…' : 'Create account'}
                    </button>
                </form>
            );
        }

        if (mode === 'reset') {
            return (
                <form className="auth-form" onSubmit={handleReset} noValidate>
                    <label className="auth-field">
                        <span className="field-label">Email address</span>
                        <input
                            className="text-input"
                            type="email"
                            autoComplete="email"
                            inputMode="email"
                            placeholder="you@school.edu.ng"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            data-autofocus
                        />
                    </label>

                    <button className="btn btn--accent btn--wide" type="submit" disabled={busy}>
                        {busy ? 'Sending link…' : 'Send reset link'}
                    </button>
                </form>
            );
        }

        return (
            <form className="auth-form" onSubmit={handleNewPassword} noValidate>
                <label className="auth-field">
                    <span className="field-label">New password</span>
                    <input
                        className="text-input"
                        type="password"
                        autoComplete="new-password"
                        minLength={8}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        data-autofocus
                    />
                </label>

                <label className="auth-field">
                    <span className="field-label">Confirm new password</span>
                    <input
                        className="text-input"
                        type="password"
                        autoComplete="new-password"
                        minLength={8}
                        value={confirm}
                        onChange={(event) => setConfirm(event.target.value)}
                    />
                </label>

                <button className="btn btn--accent btn--wide" type="submit" disabled={busy}>
                    {busy ? 'Updating…' : 'Update password'}
                </button>
            </form>
        );
    }

    function renderSwitch() {
        if (mode === 'signin') {
            return (
                <div className="auth-switch">
                    <p>
                        New to StudyFlow?{' '}
                        <button
                            type="button"
                            className="link-btn"
                            onClick={() => openAuth('signup')}
                        >
                            Create an account
                        </button>
                    </p>
                    <button
                        type="button"
                        className="link-btn auth-forgot"
                        onClick={() => openAuth('reset')}
                    >
                        Forgot password?
                    </button>
                </div>
            );
        }

        if (mode === 'signup') {
            return (
                <div className="auth-switch">
                    <p>
                        Already have an account?{' '}
                        <button type="button" className="link-btn" onClick={() => openAuth('signin')}>
                            Sign in
                        </button>
                    </p>
                </div>
            );
        }

        if (mode === 'reset') {
            return (
                <div className="auth-switch">
                    <p>
                        Remembered it?{' '}
                        <button type="button" className="link-btn" onClick={() => openAuth('signin')}>
                            Back to sign in
                        </button>
                    </p>
                </div>
            );
        }

        return (
            <div className="auth-switch">
                <button type="button" className="link-btn" onClick={closeAuth}>
                    Cancel
                </button>
            </div>
        );
    }

    return (
        <dialog
            className="auth-dialog"
            ref={dialogRef}
            aria-labelledby="authTitle"
            aria-describedby="authLede"
            onClose={closeAuth}
            onClick={handleDialogClick}
        >
            <div className="auth-sheet">
                <button
                    className="auth-close"
                    type="button"
                    aria-label="Close account dialog"
                    onClick={closeAuth}
                >
                    <span aria-hidden="true">×</span>
                </button>

                <p className="kicker">Account</p>
                <h2 id="authTitle">{configured ? copy.title : 'Sign-in is not set up yet.'}</h2>
                <p className="auth-lede" id="authLede">
                    {configured
                        ? copy.lede
                        : 'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env, then restart the dev server.'}
                </p>

                {configured && authNotice && (
                    <p className="auth-info" role="status">
                        {authNotice}
                    </p>
                )}
                {configured && info && (
                    <p className="auth-info" role="status">
                        {info}
                    </p>
                )}
                {configured && error && (
                    <p className="auth-error" role="alert">
                        {error}
                    </p>
                )}

                {configured ? (
                    <>
                        {renderForm()}
                        {renderSwitch()}
                    </>
                ) : (
                    <button className="btn btn--primary btn--wide auth-config-close" type="button" onClick={closeAuth}>
                        Close
                    </button>
                )}
            </div>
        </dialog>
    );
}
