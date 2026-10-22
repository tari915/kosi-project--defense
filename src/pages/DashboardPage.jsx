import { useCallback, useEffect, useState } from 'react';
import AppShell from '../components/app/AppShell.jsx';
import Icon from '../components/Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchMyOrders } from '../lib/api.js';
import {
    STATUS_LABELS,
    STATUS_NOTES,
    fileTitle,
    formatDate,
    formatMoney,
    statusTone
} from '../lib/format.js';
import { Link } from '../lib/router.jsx';

function extension(name) {
    const match = String(name || '').match(/\.([a-z0-9]+)$/i);
    return match ? match[1].toUpperCase() : 'FILE';
}

function LibrarySkeleton() {
    return (
        <div role="status">
            <span className="sr-only">Loading your library…</span>
            <div className="library-grid" aria-hidden="true">
                {[0, 1, 2].map((item) => (
                    <div className="library-card library-card--skeleton" key={item}>
                        <div className="skeleton skeleton-pill" />
                        <div className="skeleton skeleton-title" />
                        <div className="skeleton skeleton-line" />
                        <div className="skeleton skeleton-line skeleton-line--short" />
                        <div className="skeleton skeleton-button" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function DashboardPage() {
    const { user, loading: authLoading, openAuth } = useAuth();
    const userId = user?.id || null;
    const [orders, setOrders] = useState([]);
    const [state, setState] = useState('loading');
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        if (!userId) return;

        setState('loading');
        setError('');

        try {
            const data = await fetchMyOrders();
            setOrders(data.orders || []);
            setState('ready');
        } catch (nextError) {
            setError(nextError.message || 'Could not load your packs.');
            setState(nextError.status === 401 ? 'expired' : 'error');
        }
    }, [userId]);

    useEffect(() => {
        if (authLoading) {
            setState('loading');
            return;
        }

        if (!userId) {
            setOrders([]);
            setState('signed-out');
            return;
        }

        load();
    }, [authLoading, load, userId]);

    const active = orders.some(
        (order) => order.status === 'paid' || order.status === 'processing'
    );

    useEffect(() => {
        if (state !== 'ready' || !active || !userId) return undefined;

        const timer = window.setInterval(async () => {
            try {
                const data = await fetchMyOrders();
                setOrders(data.orders || []);
            } catch {
                // Keep the last good library visible; the next poll can recover.
            }
        }, 5000);

        return () => window.clearInterval(timer);
    }, [active, state, userId]);

    const signedOut = !authLoading && !userId;
    const loading = authLoading || state === 'loading';
    const ready = state === 'ready';
    const readyCount = orders.filter((order) => order.status === 'ready').length;

    return (
        <AppShell>
            <main id="main" className="app-page library-page" tabIndex={-1}>
                <div className="container">
                    <header className="app-page-head library-head">
                        <div>
                            <p className="app-kicker">Your library</p>
                            <h1>
                                Every pack, <em>ready to reopen.</em>
                            </h1>
                            <p className="app-page-lede">
                                Your study packs stay here. Come back before a test, a tutorial
                                or a quiet revision session and pick up where you left off.
                            </p>
                        </div>

                        <div className="library-head-actions">
                            <Link to="/" className="button primary">
                                New pack
                                <Icon name="plus" />
                            </Link>
                            {!signedOut && (
                                <button
                                    type="button"
                                    className="button secondary"
                                    onClick={load}
                                    disabled={loading}
                                >
                                    <Icon name="refresh" />
                                    Refresh
                                </button>
                            )}
                        </div>
                    </header>

                    {signedOut && (
                        <section className="library-panel library-panel--signed-out">
                            <div className="library-panel-copy">
                                <span className="library-panel-icon">
                                    <Icon name="user" />
                                </span>
                                <p className="app-kicker">Private by default</p>
                                <h2>Sign in to see your packs.</h2>
                                <p>
                                    Your library is tied to your account, so your documents and
                                    study packs stay private to you.
                                </p>
                                <div className="library-panel-actions">
                                    <button
                                        type="button"
                                        className="button primary"
                                        onClick={() =>
                                            openAuth('signin', 'Sign in to open your library.')
                                        }
                                    >
                                        Sign in
                                        <Icon name="arrow" />
                                    </button>
                                    <button
                                        type="button"
                                        className="button secondary"
                                        onClick={() => openAuth('signup')}
                                    >
                                        Create an account
                                    </button>
                                </div>
                                <Link to="/sample" className="text-link">
                                    Explore the sample pack first
                                    <Icon name="arrow" />
                                </Link>
                            </div>

                            <div className="library-panel-aside">
                                <span className="library-aside-label">What stays here</span>
                                <ul>
                                    <li>
                                        <Icon name="file" />
                                        The notes you upload
                                    </li>
                                    <li>
                                        <Icon name="cards" />
                                        Every finished study pack
                                    </li>
                                    <li>
                                        <Icon name="clock" />
                                        Orders still being prepared
                                    </li>
                                </ul>
                            </div>
                        </section>
                    )}

                    {!signedOut && loading && <LibrarySkeleton />}

                    {!signedOut && !loading && state === 'expired' && (
                        <section className="library-panel library-panel--error" role="alert">
                            <span className="library-panel-icon">
                                <Icon name="lock" />
                            </span>
                            <h2>Your session has expired.</h2>
                            <p>{error}</p>
                            <button
                                type="button"
                                className="button primary"
                                onClick={() =>
                                    openAuth('signin', 'Sign in again to open your library.')
                                }
                            >
                                Sign in again
                                <Icon name="arrow" />
                            </button>
                        </section>
                    )}

                    {!signedOut && !loading && state === 'error' && (
                        <section className="library-panel library-panel--error" role="alert">
                            <span className="library-panel-icon">
                                <Icon name="info" />
                            </span>
                            <h2>We couldn't load your library.</h2>
                            <p>{error}</p>
                            <button type="button" className="button primary" onClick={load}>
                                Try again
                                <Icon name="refresh" />
                            </button>
                        </section>
                    )}

                    {!signedOut && ready && orders.length === 0 && (
                        <section className="library-panel library-panel--empty">
                            <div className="library-empty-art" aria-hidden="true">
                                <span className="empty-sheet empty-sheet--back" />
                                <span className="empty-sheet empty-sheet--mid" />
                                <span className="empty-sheet empty-sheet--front">
                                    <Icon name="book" />
                                </span>
                            </div>
                            <div>
                                <p className="app-kicker">A clean start</p>
                                <h2>Your library starts with one document.</h2>
                                <p>
                                    Upload your notes and your first study pack will appear here
                                    when it is ready.
                                </p>
                                <div className="library-panel-actions">
                                    <Link to="/" className="button primary">
                                        Create a study pack
                                        <Icon name="arrow" />
                                    </Link>
                                    <Link to="/sample" className="button secondary">
                                        See a sample
                                    </Link>
                                </div>
                            </div>
                        </section>
                    )}

                    {!signedOut && ready && orders.length > 0 && (
                        <>
                            <div className="library-meta">
                                <span>
                                    {orders.length} {orders.length === 1 ? 'pack' : 'packs'}
                                    {readyCount > 0 && ` · ${readyCount} ready to reopen`}
                                </span>
                                <span className="library-meta-account">
                                    <Icon name="user" />
                                    {user.email}
                                </span>
                            </div>

                            <div className="library-grid">
                                {orders.map((order) => {
                                    const tone = statusTone(order.status);
                                    const isReady = order.status === 'ready';
                                    const isPending = order.status === 'pending';
                                    const isFailed = order.status === 'failed';
                                    const isWorking =
                                        order.status === 'paid' ||
                                        order.status === 'processing';

                                    return (
                                        <article
                                            className={'library-card library-card--' + tone}
                                            key={order.id}
                                        >
                                            <div className="library-card-top">
                                                <span className={'status-pill status-pill--' + tone}>
                                                    <span className="status-dot" />
                                                    {STATUS_LABELS[order.status] || 'Saved order'}
                                                </span>
                                                <span className="library-date">
                                                    {formatDate(order.created_at)}
                                                </span>
                                            </div>

                                            <div className="library-file">
                                                <span className="library-file-icon">
                                                    <Icon name="file" />
                                                </span>
                                                <div>
                                                    <h2>{fileTitle(order.original_name)}</h2>
                                                    <span className="library-file-type">
                                                        {extension(order.original_name)}
                                                    </span>
                                                </div>
                                            </div>

                                            <p className="library-note">
                                                {STATUS_NOTES[order.status] ||
                                                    'This order is saved in your library.'}
                                            </p>

                                            <dl className="library-detail">
                                                <div>
                                                    <dt>Reference</dt>
                                                    <dd title={order.reference}>
                                                        {order.reference || '—'}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt>Price</dt>
                                                    <dd>{formatMoney(order.amount)}</dd>
                                                </div>
                                            </dl>

                                            <div className="library-card-foot">
                                                {isReady && (
                                                    <Link
                                                        to={'/pack/' + encodeURIComponent(order.id)}
                                                        className="button primary"
                                                    >
                                                        Open pack
                                                        <Icon name="arrow" />
                                                    </Link>
                                                )}

                                                {isWorking && (
                                                    <span className="library-working">
                                                        <span className="pulse-dot" />
                                                        Building now — this updates automatically
                                                    </span>
                                                )}

                                                {(isPending || isFailed) && (
                                                    <>
                                                        <Link
                                                            to="/"
                                                            className="button secondary"
                                                        >
                                                            Start a new pack
                                                        </Link>
                                                        {isFailed && (
                                                            <Link to="/help" className="text-link">
                                                                Get help
                                                                <Icon name="arrow" />
                                                            </Link>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </main>
        </AppShell>
    );
}
