import AppShell from '../components/app/AppShell.jsx';
import Icon from '../components/Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { formatDate, displayName } from '../lib/format.js';
import { Link, navigate } from '../lib/router.jsx';

function AccountSkeleton() {
    return (
        <main id="main" className="app-page account-page" tabIndex={-1}>
            <div className="container">
                <div className="account-loading" role="status">
                    <span className="sr-only">Loading your account…</span>
                    <div aria-hidden="true">
                        <div className="skeleton skeleton-pill" />
                        <div className="skeleton skeleton-title" />
                        <div className="skeleton skeleton-line" />
                    </div>
                </div>
            </div>
        </main>
    );
}

export default function AccountPage() {
    const { user, loading, openAuth, signOut } = useAuth();

    if (loading) {
        return (
            <AppShell>
                <AccountSkeleton />
            </AppShell>
        );
    }

    if (!user) {
        return (
            <AppShell>
                <main id="main" className="app-page account-page" tabIndex={-1}>
                    <div className="container">
                        <header className="app-page-head">
                            <div>
                                <p className="app-kicker">Account</p>
                                <h1>
                                    Your packs, <em>in one place.</em>
                                </h1>
                                <p className="app-page-lede">
                                    An account keeps your study packs private and lets you reopen
                                    them whenever you need them.
                                </p>
                            </div>
                        </header>

                        <section className="account-guest">
                            <div className="account-guest-copy">
                                <span className="account-guest-icon">
                                    <Icon name="user" />
                                </span>
                                <p className="app-kicker">One account, every pack</p>
                                <h2>Sign in when you're ready.</h2>
                                <p>
                                    You can explore the sample without an account. When you create
                                    a pack, signing in keeps the order and the finished pack in
                                    your library.
                                </p>
                                <div className="account-actions">
                                    <button
                                        type="button"
                                        className="button primary"
                                        onClick={() =>
                                            openAuth('signin', 'Sign in to open your account.')
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
                                    Try the sample pack first
                                    <Icon name="arrow" />
                                </Link>
                            </div>

                            <div className="account-guest-aside">
                                <div>
                                    <Icon name="lock" />
                                    <strong>Private by default</strong>
                                    <p>Your documents and study packs stay tied to your account.</p>
                                </div>
                                <div>
                                    <Icon name="cards" />
                                    <strong>A library that lasts</strong>
                                    <p>Come back to a pack before a test or a tutorial.</p>
                                </div>
                                <div>
                                    <Icon name="clock" />
                                    <strong>One payment per pack</strong>
                                    <p>No subscription and no recurring charge.</p>
                                </div>
                            </div>
                        </section>
                    </div>
                </main>
            </AppShell>
        );
    }

    const name = displayName(user.email);

    return (
        <AppShell>
            <main id="main" className="app-page account-page" tabIndex={-1}>
                <div className="container">
                    <header className="app-page-head">
                        <div>
                            <p className="app-kicker">Account</p>
                            <h1>
                                Hello, <em>{name}.</em>
                            </h1>
                            <p className="app-page-lede">
                                Your account details, security and shortcuts to the rest of
                                StudyFlow.
                            </p>
                        </div>
                    </header>

                    <div className="account-grid">
                        <section className="account-card account-identity-card">
                            <div className="account-identity">
                                <span className="account-avatar-large" aria-hidden="true">
                                    {user.email.charAt(0).toUpperCase()}
                                </span>
                                <div>
                                    <h2>{user.email}</h2>
                                    <p className="small muted">Signed in with email and password</p>
                                </div>
                            </div>

                            <dl className="account-rows">
                                <div className="account-row">
                                    <dt>Email</dt>
                                    <dd>{user.email}</dd>
                                </div>
                                <div className="account-row">
                                    <dt>Member since</dt>
                                    <dd>{formatDate(user.created_at)}</dd>
                                </div>
                                <div className="account-row">
                                    <dt>Billing</dt>
                                    <dd>One payment per pack</dd>
                                </div>
                            </dl>

                            <div className="account-card-foot">
                                <Link to="/dashboard" className="button primary">
                                    Open my packs
                                    <Icon name="arrow" />
                                </Link>
                                <button
                                    type="button"
                                    className="button secondary"
                                    onClick={async () => {
                                        await signOut();
                                        navigate('/');
                                    }}
                                >
                                    Sign out
                                </button>
                            </div>
                        </section>

                        <div className="account-side">
                            <section className="account-card">
                                <span className="account-card-icon">
                                    <Icon name="lock" />
                                </span>
                                <h2>Password</h2>
                                <p>
                                    We can email you a secure link to choose a new password. The
                                    link is valid for a short time.
                                </p>
                                <button
                                    type="button"
                                    className="text-link"
                                    onClick={() =>
                                        openAuth(
                                            'reset',
                                            'Enter your email to receive a password reset link.'
                                        )
                                    }
                                >
                                    Send a password reset link
                                    <Icon name="arrow" />
                                </button>
                            </section>

                            <section className="account-card account-shortcuts">
                                <h2>Quick links</h2>
                                <Link to="/">
                                    <span>
                                        <Icon name="plus" />
                                        New study pack
                                    </span>
                                    <Icon name="chevron" />
                                </Link>
                                <Link to="/dashboard">
                                    <span>
                                        <Icon name="cards" />
                                        My packs
                                    </span>
                                    <Icon name="chevron" />
                                </Link>
                                <Link to="/sample">
                                    <span>
                                        <Icon name="book" />
                                        Sample pack
                                    </span>
                                    <Icon name="chevron" />
                                </Link>
                                <Link to="/help">
                                    <span>
                                        <Icon name="info" />
                                        Help & FAQ
                                    </span>
                                    <Icon name="chevron" />
                                </Link>
                            </section>
                        </div>
                    </div>
                </div>
            </main>
        </AppShell>
    );
}
