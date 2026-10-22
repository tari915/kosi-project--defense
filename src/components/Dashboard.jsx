import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchMyOrders } from '../lib/api.js';
import AuthModal from './AuthModal.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';
import Footer from './Footer.jsx';
import Navbar from './Navbar.jsx';

const STATUS_LABELS = {
    pending: 'Awaiting payment',
    paid: 'Paid',
    processing: 'Generating',
    ready: 'Ready',
    failed: 'Failed'
};

const STATUS_NOTES = {
    pending: 'Payment was not completed.',
    paid: 'Payment confirmed. Your pack is queued.',
    processing: 'Building your pack now.',
    failed: 'Generation failed. Contact support with your reference.'
};

const DATE_FORMAT = new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
});

const MONEY_FORMAT = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
});

function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : DATE_FORMAT.format(date);
}

function formatMoney(kobo) {
    return MONEY_FORMAT.format((Number(kobo) || 0) / 100);
}

export default function Dashboard() {
    const { user, loading: authLoading, configured, openAuth } = useAuth();
    const [orders, setOrders] = useState([]);
    const [state, setState] = useState('loading');
    const [error, setError] = useState(null);
    const [reloadToken, setReloadToken] = useState(0);

    const userId = user ? user.id : null;

    useEffect(() => {
        document.title = 'Your packs — StudyFlow';
    }, []);

    useEffect(() => {
        if (authLoading) return undefined;

        if (!userId) {
            setOrders([]);
            setState('signed-out');
            return undefined;
        }

        let cancelled = false;
        setState('loading');
        setError(null);

        fetchMyOrders()
            .then((data) => {
                if (cancelled) return;
                setOrders(Array.isArray(data.orders) ? data.orders : []);
                setState('ready');
            })
            .catch((problem) => {
                if (cancelled) return;
                setError({ message: problem.message, status: problem.status });
                setState('error');
            });

        return () => {
            cancelled = true;
        };
    }, [authLoading, userId, reloadToken]);

    const refresh = () => setReloadToken((value) => value + 1);

    function renderSignedOut() {
        return (
            <section className="dashboard-panel">
                <p className="kicker">Library</p>
                <h2>Sign in to see your packs.</h2>
                <p className="dashboard-panel-text">
                    Your library is tied to your account, so your packs follow you to any device.
                </p>

                {!configured && (
                    <p className="dashboard-config-note">
                        Auth is not configured yet. Add VITE_SUPABASE_URL and
                        VITE_SUPABASE_ANON_KEY to .env, then restart the dev server.
                    </p>
                )}

                <div className="dashboard-panel-actions">
                    <button
                        className="btn btn--accent"
                        type="button"
                        onClick={() => openAuth('signin')}
                    >
                        Sign in
                        <span className="btn-arrow" aria-hidden="true">
                            ↘
                        </span>
                    </button>
                    <button
                        className="btn btn--ghost"
                        type="button"
                        onClick={() => openAuth('signup')}
                    >
                        Create an account
                    </button>
                </div>

                <a className="dashboard-back" href="/">
                    Back to StudyFlow
                </a>
            </section>
        );
    }

    function renderLoading() {
        return (
            <section className="dashboard-panel" aria-busy="true">
                <p className="dashboard-loading">
                    <span className="dashboard-spinner" aria-hidden="true" />
                    {authLoading ? 'Checking your session…' : 'Loading your packs…'}
                </p>
            </section>
        );
    }

    function renderError() {
        return (
            <section className="dashboard-panel">
                <p className="kicker">Library</p>
                <h2>We couldn’t load your packs.</h2>
                <p className="dashboard-panel-text">{error && error.message}</p>

                <div className="dashboard-panel-actions">
                    <button className="btn btn--accent" type="button" onClick={refresh}>
                        Try again
                    </button>
                    {error && error.status === 401 && (
                        <button
                            className="btn btn--ghost"
                            type="button"
                            onClick={() => openAuth('signin')}
                        >
                            Sign in again
                        </button>
                    )}
                </div>
            </section>
        );
    }

    function renderEmpty() {
        return (
            <section className="dashboard-panel dashboard-panel--empty">
                <p className="kicker">Library</p>
                <h2>No packs yet.</h2>
                <p className="dashboard-panel-text">
                    Upload your lecture notes and your first study pack will land here.
                </p>
                <div className="dashboard-panel-actions">
                    <a className="btn btn--accent" href="/#upload">
                        Create a study pack
                        <span className="btn-arrow" aria-hidden="true">
                            ↘
                        </span>
                    </a>
                </div>
            </section>
        );
    }

    function renderOrders() {
        return (
            <>
                <div className="dashboard-bar">
                    <p className="dashboard-count">
                        {orders.length} pack{orders.length === 1 ? '' : 's'}
                        <span aria-hidden="true"> · </span>
                        Signed in as <strong>{user.email}</strong>
                    </p>
                    <button className="dashboard-refresh" type="button" onClick={refresh}>
                        Refresh
                    </button>
                </div>

                <div className="pack-grid">
                    {orders.map((order) => (
                        <article className="pack-card" key={order.id}>
                            <div className="pack-top">
                                <span className={'pack-status pack-status--' + order.status}>
                                    {STATUS_LABELS[order.status] || order.status}
                                </span>
                                <span className="pack-date">{formatDate(order.created_at)}</span>
                            </div>

                            <h2 className="pack-name" title={order.original_name}>
                                {order.original_name}
                            </h2>

                            <dl className="pack-meta">
                                <div>
                                    <dt>Reference</dt>
                                    <dd>{order.reference}</dd>
                                </div>
                                <div>
                                    <dt>Paid</dt>
                                    <dd>{formatMoney(order.amount)}</dd>
                                </div>
                            </dl>

                            <div className="pack-foot">
                                {order.status === 'ready' ? (
                                    <a
                                        className="btn btn--accent pack-open"
                                        href={'/?order=' + encodeURIComponent(order.id)}
                                    >
                                        Open pack
                                        <span className="btn-arrow" aria-hidden="true">
                                            ↘
                                        </span>
                                    </a>
                                ) : (
                                    <p className="pack-note">
                                        {STATUS_NOTES[order.status] || 'Working on it.'}
                                    </p>
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            </>
        );
    }

    function renderBody() {
        if (authLoading) return renderLoading();
        if (!user) return renderSignedOut();
        if (state === 'loading') return renderLoading();
        if (state === 'error') return renderError();
        if (!orders.length) return renderEmpty();
        return renderOrders();
    }

    return (
        <ErrorBoundary>
            <a className="skip-link" href="#main">
                Skip to content
            </a>

            <Navbar />

            <main className="dashboard" id="main" tabIndex={-1}>
                <div className="dashboard-inner">
                    <header className="dashboard-head">
                        <p className="kicker">Your library</p>
                        <h1>
                            Every pack, <em>ready to reopen.</em>
                        </h1>
                        <p className="dashboard-lede">
                            Reopen any pack you’ve bought. New packs land here automatically once
                            they’re ready.
                        </p>
                    </header>

                    {renderBody()}
                </div>
            </main>

            <Footer />
            <AuthModal />
        </ErrorBoundary>
    );
}
