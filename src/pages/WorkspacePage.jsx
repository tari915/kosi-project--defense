import { useCallback, useEffect, useRef, useState } from 'react';
import AppShell from '../components/app/AppShell.jsx';
import Icon from '../components/Icon.jsx';
import UploadCheckout from '../components/UploadCheckout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCheckout } from '../hooks/useCheckout.js';
import { fetchMyOrders } from '../lib/api.js';
import { getConfig } from '../lib/config.js';
import {
    STATUS_LABELS,
    displayName,
    fileTitle,
    formatDate,
    statusTone
} from '../lib/format.js';
import { Link, navigate } from '../lib/router.jsx';
import { validateFile } from '../lib/validate.js';

const inside = [
    {
        icon: 'file',
        title: 'A focused summary',
        text: 'The main ideas pulled together, so you know where to begin.'
    },
    {
        icon: 'cards',
        title: 'Flashcards for recall',
        text: 'Question on one side, answer on the other. Practise remembering.'
    },
    {
        icon: 'quiz',
        title: 'Practice questions',
        text: 'Check what you know, with answers and explanations.'
    }
];

export default function WorkspacePage() {
    const checkout = useCheckout({ autoRestore: false });
    const { user, loading: authLoading, openAuth } = useAuth();

    const [file, setFile] = useState(null);
    const [errors, setErrors] = useState({ file: '' });
    const [config, setConfig] = useState(null);
    const [configState, setConfigState] = useState('loading');
    const [recent, setRecent] = useState([]);
    const [recentLoaded, setRecentLoaded] = useState(false);

    const mounted = useRef(true);
    const previousUserId = useRef(user?.id || null);
    const userId = user?.id || null;
    const { reset, phase, orderId, busy } = checkout;

    const loadConfig = useCallback(async () => {
        setConfigState('loading');
        try {
            const next = await getConfig();
            if (mounted.current) {
                setConfig(next);
                setConfigState('ready');
            }
        } catch {
            if (mounted.current) setConfigState('error');
        }
    }, []);

    useEffect(() => {
        mounted.current = true;
        loadConfig();
        return () => {
            mounted.current = false;
        };
    }, [loadConfig]);

    useEffect(() => {
        if (previousUserId.current && previousUserId.current !== userId) {
            reset();
            setFile(null);
            setErrors({ file: '' });
        }
        previousUserId.current = userId;
    }, [reset, userId]);

    useEffect(() => {
        if (!userId) {
            setRecent([]);
            setRecentLoaded(false);
            return undefined;
        }

        let active = true;
        setRecentLoaded(false);

        fetchMyOrders()
            .then((data) => {
                if (!active) return;
                setRecent((data.orders || []).slice(0, 3));
                setRecentLoaded(true);
            })
            .catch(() => {
                if (active) setRecentLoaded(true);
            });

        return () => {
            active = false;
        };
    }, [userId]);

    useEffect(() => {
        if (phase === 'ready' && orderId) {
            navigate('/pack/' + encodeURIComponent(orderId), { replace: true });
        }
    }, [orderId, phase]);

    function handleFile(next) {
        const error = next ? validateFile(next) : '';
        setErrors({ file: error });
        setFile(error ? null : next);
    }

    function buy() {
        if (busy || authLoading) return;

        if (!user) {
            openAuth('signin', 'Sign in to create your study pack.');
            return;
        }

        const error = validateFile(file);
        setErrors({ file: error });

        if (error) {
            document.getElementById('file-picker')?.focus();
            return;
        }

        if (configState !== 'ready' || !config?.paystackPublicKey) return;

        checkout.startCheckout(file);
    }

    function openResult() {
        if (orderId) navigate('/pack/' + encodeURIComponent(orderId));
    }

    return (
        <AppShell>
            <main id="main" className="app-page workspace-page" tabIndex={-1}>
                <div className="container">
                    <header className="app-page-head workspace-head">
                        <div>
                            <p className="app-kicker">Workspace</p>
                            <h1>
                                Start with your <em>notes.</em>
                            </h1>
                            <p className="app-page-lede">
                                One document becomes a focused summary, a deck of flashcards and a
                                set of practice questions — ready whenever you are.
                            </p>
                        </div>

                        <div className="workspace-head-facts">
                            <span>
                                <Icon name="lock" />
                                Private to your account
                            </span>
                            <span>
                                <Icon name="check" />
                                One payment per pack
                            </span>
                        </div>
                    </header>

                    <div className="workspace-grid">
                        <div className="workspace-main">
                            {user && (
                                <p className="workspace-greeting">
                                    Welcome back, {displayName(user.email)}. Pick up where you
                                    left off, or start something new.
                                </p>
                            )}

                            <UploadCheckout
                                variant="app"
                                file={file}
                                onFile={handleFile}
                                user={user}
                                authLoading={authLoading}
                                onSignIn={() => openAuth('signin')}
                                errors={errors}
                                config={config}
                                configState={configState}
                                onReloadConfig={loadConfig}
                                checkout={checkout}
                                onBuy={buy}
                                onSample={() => navigate('/sample')}
                                onResult={openResult}
                            />

                            <p className="workspace-footnote">
                                <Icon name="info" />
                                Your document is used only to generate your pack. Files and packs
                                are private to your account.
                            </p>
                        </div>

                        <aside className="workspace-side" aria-label="Study pack details">
                            <section className="side-card">
                                <div className="side-card-head">
                                    <h2>What's inside</h2>
                                    <span className="side-label">Every pack</span>
                                </div>
                                <ul className="side-list">
                                    {inside.map((item) => (
                                        <li key={item.title}>
                                            <span className="side-icon">
                                                <Icon name={item.icon} />
                                            </span>
                                            <div>
                                                <strong>{item.title}</strong>
                                                <p>{item.text}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </section>

                            {user && recentLoaded && recent.length > 0 && (
                                <section className="side-card">
                                    <div className="side-card-head">
                                        <h2>Recent packs</h2>
                                        <Link to="/dashboard" className="side-label side-link">
                                            All packs
                                        </Link>
                                    </div>
                                    <div className="recent-list">
                                        {recent.map((order) => (
                                            <Link
                                                key={order.id}
                                                to={
                                                    order.status === 'ready'
                                                        ? '/pack/' + encodeURIComponent(order.id)
                                                        : '/dashboard'
                                                }
                                                className="recent-item"
                                            >
                                                <span
                                                    className={
                                                        'recent-dot recent-dot--' +
                                                        statusTone(order.status)
                                                    }
                                                />
                                                <span className="recent-body">
                                                    <strong>{fileTitle(order.original_name)}</strong>
                                                    <small>
                                                        {STATUS_LABELS[order.status] || 'Saved order'}
                                                        {' · '}
                                                        {formatDate(order.created_at, true)}
                                                    </small>
                                                </span>
                                                <Icon name="chevron" />
                                            </Link>
                                        ))}
                                    </div>
                                </section>
                            )}

                            <section className="side-card side-card--sample">
                                <span className="side-sample-icon">
                                    <Icon name="book" />
                                </span>
                                <p className="side-eyebrow">Sample pack</p>
                                <h2>Cell biology, ready to explore.</h2>
                                <p>
                                    See how a summary, flashcards and practice questions fit
                                    together. No upload or payment needed.
                                </p>
                                <Link to="/sample" className="text-link">
                                    Open the sample
                                    <Icon name="arrow" />
                                </Link>
                            </section>

                            <p className="workspace-help">
                                Questions about uploads or payment? <Link to="/help">Visit help</Link>.
                            </p>
                        </aside>
                    </div>
                </div>
            </main>
        </AppShell>
    );
}
