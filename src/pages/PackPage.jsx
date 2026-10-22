import { useCallback, useEffect, useState } from 'react';
import AppShell from '../components/app/AppShell.jsx';
import Icon from '../components/Icon.jsx';
import StudyWorkspace from '../components/StudyWorkspace.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchOrder } from '../lib/api.js';
import {
    STATUS_LABELS,
    fileTitle,
    formatDate,
    formatMoney
} from '../lib/format.js';
import { Link, navigate } from '../lib/router.jsx';

const POLL_EVERY_MS = 3000;
const POLL_LIMIT = 40;

function PackState({ icon, eyebrow, title, children, actions, tone = 'default' }) {
    return (
        <main id="main" className="app-page pack-state-page" tabIndex={-1}>
            <div className="container pack-state-wrap">
                <section className={'pack-state pack-state--' + tone}>
                    <span className="pack-state-icon">
                        <Icon name={icon} />
                    </span>
                    <p className="app-kicker">{eyebrow}</p>
                    <h1>{title}</h1>
                    <div className="pack-state-copy">{children}</div>
                    {actions && <div className="pack-state-actions">{actions}</div>}
                </section>
            </div>
        </main>
    );
}

function PackLoading() {
    return (
        <main id="main" className="app-page pack-state-page" tabIndex={-1}>
            <div className="container pack-state-wrap">
                <div className="pack-loading" role="status">
                    <span className="sr-only">Loading your study pack…</span>
                    <div aria-hidden="true" className="pack-loading-skeleton">
                        <div className="skeleton skeleton-pill" />
                        <div className="skeleton skeleton-title" />
                        <div className="skeleton skeleton-line" />
                        <div className="skeleton skeleton-line skeleton-line--short" />
                        <div className="skeleton skeleton-button" />
                    </div>
                </div>
            </div>
        </main>
    );
}

export default function PackPage({ id }) {
    const { user, loading: authLoading, openAuth } = useAuth();
    const userId = user?.id || null;
    const [order, setOrder] = useState(null);
    const [phase, setPhase] = useState('loading');
    const [error, setError] = useState('');
    const [slow, setSlow] = useState(false);

    const load = useCallback(
        async (quiet = false) => {
            if (!userId) return;

            if (!quiet) setPhase('loading');
            setError('');
            setSlow(false);

            try {
                const next = await fetchOrder(id);
                setOrder(next);
                setPhase('loaded');
            } catch (nextError) {
                setError(nextError.message || 'We could not load this pack.');
                if (nextError.status === 401) setPhase('expired');
                else if (nextError.status === 404) setPhase('missing');
                else setPhase('error');
            }
        },
        [id, userId]
    );

    useEffect(() => {
        if (authLoading) {
            setPhase('loading');
            return;
        }

        if (!userId) {
            setOrder(null);
            setPhase('signed-out');
            return;
        }

        load();
    }, [authLoading, load, userId]);

    const working =
        phase === 'loaded' &&
        order &&
        (order.status === 'paid' || order.status === 'processing');

    useEffect(() => {
        if (!working) return undefined;

        let active = true;
        let attempts = 0;

        const timer = window.setInterval(async () => {
            attempts += 1;

            try {
                const next = await fetchOrder(id);
                if (active) setOrder(next);
            } catch {
                // Keep the current state. A later poll or a manual refresh can recover.
            }

            if (attempts >= POLL_LIMIT) {
                window.clearInterval(timer);
                if (active) setSlow(true);
            }
        }, POLL_EVERY_MS);

        return () => {
            active = false;
            window.clearInterval(timer);
        };
    }, [id, working]);

    useEffect(() => {
        if (order) {
            document.title = fileTitle(order.original_name) + ' · StudyFlow';
        }
    }, [order]);

    if (phase === 'loading') {
        return (
            <AppShell>
                <PackLoading />
            </AppShell>
        );
    }

    if (phase === 'signed-out') {
        return (
            <AppShell>
                <PackState
                    icon="lock"
                    eyebrow="Private pack"
                    title={
                        <>
                            Sign in to open <em>this pack.</em>
                        </>
                    }
                    actions={
                        <>
                            <button
                                type="button"
                                className="button primary"
                                onClick={() =>
                                    openAuth('signin', 'Sign in to open this study pack.')
                                }
                            >
                                Sign in
                                <Icon name="arrow" />
                            </button>
                            <Link to="/" className="button secondary">
                                Back to workspace
                            </Link>
                        </>
                    }
                >
                    <p>
                        Study packs are private to the account that created them. Sign in with the
                        same email you used at checkout.
                    </p>
                </PackState>
            </AppShell>
        );
    }

    if (phase === 'expired') {
        return (
            <AppShell>
                <PackState
                    icon="lock"
                    eyebrow="Session expired"
                    title={
                        <>
                            Sign in <em>again.</em>
                        </>
                    }
                    actions={
                        <button
                            type="button"
                            className="button primary"
                            onClick={() => openAuth('signin', 'Sign in again to open this pack.')}
                        >
                            Sign in again
                            <Icon name="arrow" />
                        </button>
                    }
                >
                    <p>{error}</p>
                </PackState>
            </AppShell>
        );
    }

    if (phase === 'missing') {
        return (
            <AppShell>
                <PackState
                    icon="info"
                    eyebrow="Pack not found"
                    title={
                        <>
                            This pack isn't in <em>your library.</em>
                        </>
                    }
                    actions={
                        <>
                            <Link to="/dashboard" className="button primary">
                                Open my packs
                                <Icon name="arrow" />
                            </Link>
                            <Link to="/" className="button secondary">
                                Create a new pack
                            </Link>
                        </>
                    }
                >
                    <p>
                        The link may be old, or the pack may belong to a different account. Check
                        that you are signed in with the right email.
                    </p>
                </PackState>
            </AppShell>
        );
    }

    if (phase === 'error') {
        return (
            <AppShell>
                <PackState
                    icon="info"
                    eyebrow="Something went wrong"
                    title={
                        <>
                            We couldn't load <em>this pack.</em>
                        </>
                    }
                    actions={
                        <>
                            <button
                                type="button"
                                className="button primary"
                                onClick={() => load()}
                            >
                                Try again
                                <Icon name="refresh" />
                            </button>
                            <Link to="/dashboard" className="button secondary">
                                Back to my packs
                            </Link>
                        </>
                    }
                >
                    <p>{error}</p>
                </PackState>
            </AppShell>
        );
    }

    if (!order) {
        return (
            <AppShell>
                <PackState
                    icon="info"
                    eyebrow="Pack not found"
                    title={
                        <>
                            This pack isn't <em>available.</em>
                        </>
                    }
                    actions={
                        <Link to="/dashboard" className="button primary">
                            Back to my packs
                        </Link>
                    }
                >
                    <p>Try opening it again from your library.</p>
                </PackState>
            </AppShell>
        );
    }

    if (order.status === 'pending') {
        return (
            <AppShell>
                <PackState
                    icon="clock"
                    eyebrow="Awaiting payment"
                    title={
                        <>
                            This pack is waiting on <em>payment.</em>
                        </>
                    }
                    tone="pending"
                    actions={
                        <>
                            <Link to="/" className="button primary">
                                Start a new pack
                                <Icon name="arrow" />
                            </Link>
                            <Link to="/dashboard" className="button secondary">
                                Back to my packs
                            </Link>
                        </>
                    }
                >
                    <p>
                        Payment was not completed, so this pack was not generated. You were not
                        charged. Start a new pack whenever you are ready to try again.
                    </p>
                    <dl className="pack-state-meta">
                        <div>
                            <dt>Document</dt>
                            <dd>{order.original_name}</dd>
                        </div>
                        <div>
                            <dt>Reference</dt>
                            <dd>{order.reference}</dd>
                        </div>
                        <div>
                            <dt>Price</dt>
                            <dd>{formatMoney(order.amount)}</dd>
                        </div>
                    </dl>
                </PackState>
            </AppShell>
        );
    }

    if (order.status === 'failed') {
        return (
            <AppShell>
                <PackState
                    icon="info"
                    eyebrow="Needs attention"
                    title={
                        <>
                            We couldn't finish <em>this pack.</em>
                        </>
                    }
                    tone="failed"
                    actions={
                        <>
                            <Link to="/" className="button primary">
                                Start a new pack
                                <Icon name="arrow" />
                            </Link>
                            <Link to="/help" className="button secondary">
                                Get help
                            </Link>
                        </>
                    }
                >
                    <p>
                        Payment was confirmed, but generation did not complete. Keep the
                        reference below if you need to follow this up.
                    </p>
                    <dl className="pack-state-meta">
                        <div>
                            <dt>Document</dt>
                            <dd>{order.original_name}</dd>
                        </div>
                        <div>
                            <dt>Reference</dt>
                            <dd>{order.reference}</dd>
                        </div>
                        <div>
                            <dt>Price</dt>
                            <dd>{formatMoney(order.amount)}</dd>
                        </div>
                    </dl>
                </PackState>
            </AppShell>
        );
    }

    if (order.status === 'paid' || order.status === 'processing') {
        return (
            <AppShell>
                <PackState
                    icon="clock"
                    eyebrow={STATUS_LABELS[order.status] || 'Preparing your pack'}
                    title={
                        <>
                            Your pack is being <em>built.</em>
                        </>
                    }
                    tone="working"
                    actions={
                        <>
                            <button
                                type="button"
                                className="button primary"
                                onClick={() => load()}
                            >
                                Refresh
                                <Icon name="refresh" />
                            </button>
                            <Link to="/dashboard" className="button secondary">
                                Back to my packs
                            </Link>
                        </>
                    }
                >
                    <p>
                        {slow
                            ? 'This is taking a little longer than usual. You can leave this page open, or come back to your library later.'
                            : 'Payment is confirmed. We are reading your notes and putting your summary, flashcards and questions together.'}
                    </p>
                    {!slow && (
                        <div className="pack-building" role="status">
                            <span className="pulse-dot" />
                            This page updates automatically
                        </div>
                    )}
                    <dl className="pack-state-meta">
                        <div>
                            <dt>Document</dt>
                            <dd>{order.original_name}</dd>
                        </div>
                        <div>
                            <dt>Ordered</dt>
                            <dd>{formatDate(order.created_at)}</dd>
                        </div>
                    </dl>
                </PackState>
            </AppShell>
        );
    }

    if (order.status === 'ready' && order.result) {
        return (
            <AppShell>
                <StudyWorkspace
                    pack={order.result}
                    filename={order.original_name}
                    title={fileTitle(order.original_name)}
                    meta={`Generated ${formatDate(order.paid_at || order.created_at)}. Read it, recall it, then check what stuck.`}
                    backLabel="Back to my packs"
                    onBack={() => navigate('/dashboard')}
                    onNew={() => navigate('/')}
                />
            </AppShell>
        );
    }

    return (
        <AppShell>
            <PackState
                icon="info"
                eyebrow="Pack unavailable"
                title={
                    <>
                        This pack isn't <em>ready yet.</em>
                    </>
                }
                actions={
                    <Link to="/dashboard" className="button primary">
                        Back to my packs
                    </Link>
                }
            >
                <p>Try refreshing your library in a moment.</p>
            </PackState>
        </AppShell>
    );
}
