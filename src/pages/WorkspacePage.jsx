import { useEffect, useRef, useState } from 'react';
import AppShell from '../components/app/AppShell.jsx';
import Icon from '../components/Icon.jsx';
import PlanStatus from '../components/PlanStatus.jsx';
import UploadCheckout from '../components/UploadCheckout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCheckout } from '../hooks/useCheckout.js';
import { useSubscription } from '../hooks/useSubscription.js';
import { fetchMyOrders } from '../lib/api.js';
import {
    STATUS_LABELS,
    displayName,
    fileTitle,
    formatDate,
    statusTone
} from '../lib/format.js';
import { Link, navigate } from '../lib/router.jsx';
import { validateFile } from '../lib/validate.js';

const genericContents = [
    {
        icon: 'file',
        title: 'A focused summary',
        text: 'The main ideas pulled together, so you know where to begin.'
    },
    {
        icon: 'cards',
        title: 'Flashcards for recall',
        text: 'Question on one side, answer on the other. Included with Premium.'
    },
    {
        icon: 'quiz',
        title: 'Practice questions',
        text: 'Five questions on Free, twelve with explanations on Premium.'
    }
];

const freeContents = [
    {
        icon: 'file',
        title: 'A focused summary',
        text: 'The main ideas pulled together, so you know where to begin.'
    },
    {
        icon: 'quiz',
        title: '5 practice questions',
        text: 'Check what you know before you move on to the next topic.'
    },
    {
        icon: 'book',
        title: 'Saved in your library',
        text: 'Come back to this pack whenever you need to revise.'
    }
];

const premiumContents = [
    {
        icon: 'file',
        title: 'A detailed summary',
        text: 'A fuller pass over the material, with the exam-relevant points brought forward.'
    },
    {
        icon: 'book',
        title: 'Revision notes',
        text: 'Short sections that break the topic into ideas you can work through.'
    },
    {
        icon: 'cards',
        title: 'Flashcards',
        text: 'Eight to twelve cards for active recall, built from your document.'
    },
    {
        icon: 'quiz',
        title: '12 practice questions',
        text: 'More questions, with an explanation for each answer.'
    }
];

export default function WorkspacePage() {
    const checkout = useCheckout({ autoRestore: false });
    const { user, loading: authLoading, openAuth } = useAuth();
    const plan = useSubscription();

    const [file, setFile] = useState(null);
    const [errors, setErrors] = useState({ file: '' });
    const [recent, setRecent] = useState([]);
    const [recentLoaded, setRecentLoaded] = useState(false);

    const previousUserId = useRef(user?.id || null);
    const userId = user?.id || null;
    const { reset, phase, orderId, busy } = checkout;

    const {
        subscription,
        loading: planLoading,
        error: planError,
        phase: planPhase,
        message: planMessage,
        busy: planBusy,
        upgrade: upgradePlan,
        refresh: refreshPlan
    } = plan;

    const premium = subscription?.plan === 'premium';

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

    // A finished, failed or blocked upload changes the usage count on the server.
    useEffect(() => {
        if (['ready', 'failed', 'timeout', 'limit'].includes(phase)) {
            refreshPlan();
        }
    }, [phase, refreshPlan]);

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

        if (planLoading || (subscription && !subscription.canGenerate)) return;

        const error = validateFile(file);
        setErrors({ file: error });

        if (error) {
            document.getElementById('file-picker')?.focus();
            return;
        }

        checkout.startCheckout(file);
    }

    function openResult() {
        if (orderId) navigate('/pack/' + encodeURIComponent(orderId));
    }

    const contents = premium
        ? premiumContents
        : subscription
          ? freeContents
          : genericContents;

    const planFact = planLoading
        ? 'Checking your plan…'
        : premium
          ? `Premium · ${subscription.remaining} uploads left`
          : 'Free plan to start';

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
                                Bring one document. StudyFlow turns it into a summary, revision
                                notes, flashcards and practice questions — with one full pack free
                                to start.
                            </p>
                        </div>

                        <div className="workspace-head-facts">
                            <span>
                                <Icon name="lock" />
                                Private to your account
                            </span>
                            <span>
                                <Icon name={premium ? 'leaf' : 'check'} />
                                {planFact}
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
                                subscription={subscription}
                                subscriptionLoading={planLoading}
                                onUpgrade={upgradePlan}
                                upgradePhase={planPhase}
                                upgradeBusy={planBusy}
                                upgradeError={planError}
                                onRefreshSubscription={refreshPlan}
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
                            {user ? (
                                <PlanStatus
                                    subscription={subscription}
                                    loading={planLoading}
                                    error={planError}
                                    phase={planPhase}
                                    message={planMessage}
                                    busy={planBusy}
                                    onUpgrade={upgradePlan}
                                    onRefresh={refreshPlan}
                                />
                            ) : (
                                <section className="plan-card plan-card--guest">
                                    <div className="plan-card-head">
                                        <span className="plan-badge">
                                            <Icon name="user" />
                                            Free plan
                                        </span>
                                    </div>
                                    <h2>Your first pack is free.</h2>
                                    <p>
                                        Sign in to create one full study pack. Premium adds 10
                                        uploads over 30 days, flashcards and more questions.
                                    </p>
                                    <div className="plan-actions">
                                        <button
                                            type="button"
                                            className="button secondary"
                                            onClick={() => openAuth('signup')}
                                        >
                                            Create an account
                                            <Icon name="arrow" />
                                        </button>
                                    </div>
                                </section>
                            )}

                            <section className="side-card">
                                <div className="side-card-head">
                                    <h2>What's inside</h2>
                                    <span className="side-label">
                                        {premium
                                            ? 'Premium pack'
                                            : subscription
                                              ? 'Free pack'
                                              : 'Inside StudyFlow'}
                                    </span>
                                </div>
                                <ul className="side-list">
                                    {contents.map((item) => (
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
                                                        {STATUS_LABELS[order.status] || 'Saved pack'}
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
                                    together. No upload needed.
                                </p>
                                <Link to="/sample" className="text-link">
                                    Open the sample
                                    <Icon name="arrow" />
                                </Link>
                            </section>

                            <p className="workspace-help">
                                Questions about your plan or uploads? <Link to="/help">Visit help</Link>.
                            </p>
                        </aside>
                    </div>
                </div>
            </main>
        </AppShell>
    );
}
