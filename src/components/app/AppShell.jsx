import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { Link, useRoute } from '../../lib/router.jsx';
import Icon from '../Icon.jsx';
import Logo from '../Logo.jsx';

const primaryLinks = [
    { to: '/', label: 'New pack', match: ['workspace'] },
    { to: '/dashboard', label: 'My packs', match: ['dashboard', 'pack'] },
    { to: '/sample', label: 'Sample', match: ['sample'] },
    { to: '/welcome', label: 'About', match: ['welcome'] }
];

const mobileLinks = [
    { to: '/', label: 'New pack', icon: 'plus', match: ['workspace'] },
    { to: '/dashboard', label: 'My packs', icon: 'cards', match: ['dashboard', 'pack'] },
    { to: '/sample', label: 'Sample', icon: 'book', match: ['sample'] },
    { to: '/account', label: 'Account', icon: 'user', match: ['account'] }
];

function isActive(route, match) {
    return match.includes(route.name);
}

export default function AppShell({ children }) {
    const route = useRoute();
    const { user, loading, openAuth, signOut } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        setMenuOpen(false);
    }, [route.path]);

    useEffect(() => {
        if (!menuOpen) return undefined;

        function onKeyDown(event) {
            if (event.key === 'Escape') setMenuOpen(false);
        }

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [menuOpen]);

    const initial = user?.email ? user.email.charAt(0).toUpperCase() : '?';

    async function handleSignOut() {
        setMenuOpen(false);
        await signOut();
    }

    return (
        <div className="app-shell">
            <a className="skip-link" href="#main">
                Skip to content
            </a>

            <header className="app-header">
                <div className="app-header-inner container">
                    <Link to="/" className="app-brand" aria-label="StudyFlow workspace">
                        <Logo />
                    </Link>

                    <nav className="app-nav" aria-label="Main navigation">
                        {primaryLinks.map((link) => (
                            <Link
                                key={link.to}
                                to={link.to}
                                aria-current={isActive(route, link.match) ? 'page' : undefined}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="app-header-actions">
                        {!loading &&
                            (user ? (
                                <Link to="/account" className="app-user" aria-label={'Account for ' + user.email}>
                                    <span className="app-avatar" aria-hidden="true">
                                        {initial}
                                    </span>
                                    <span className="app-user-email">{user.email}</span>
                                </Link>
                            ) : (
                                <button
                                    type="button"
                                    className="button secondary app-signin"
                                    onClick={() => openAuth('signin')}
                                >
                                    Sign in
                                </button>
                            ))}

                        <button
                            type="button"
                            className="icon-button app-menu-toggle"
                            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
                            aria-expanded={menuOpen}
                            aria-controls="app-mobile-menu"
                            onClick={() => setMenuOpen((value) => !value)}
                        >
                            <Icon name={menuOpen ? 'close' : 'menu'} />
                        </button>
                    </div>
                </div>

                {menuOpen && (
                    <div className="app-mobile-menu container" id="app-mobile-menu">
                        {primaryLinks.map((link) => (
                            <Link
                                key={link.to}
                                to={link.to}
                                aria-current={isActive(route, link.match) ? 'page' : undefined}
                                onClick={() => setMenuOpen(false)}
                            >
                                {link.label}
                            </Link>
                        ))}
                        <Link
                            to="/account"
                            aria-current={route.name === 'account' ? 'page' : undefined}
                            onClick={() => setMenuOpen(false)}
                        >
                            Account
                        </Link>
                        <Link
                            to="/help"
                            aria-current={route.name === 'help' ? 'page' : undefined}
                            onClick={() => setMenuOpen(false)}
                        >
                            Help
                        </Link>
                        {user && (
                            <button type="button" onClick={handleSignOut}>
                                Sign out
                            </button>
                        )}
                    </div>
                )}
            </header>

            {children}

            <footer className="app-footer">
                <div className="app-footer-inner container">
                    <div className="app-footer-main">
                        <div>
                            <Link to="/" className="app-brand" aria-label="StudyFlow workspace">
                                <Logo />
                            </Link>
                            <p>Your notes in. A clearer way to revise.</p>
                        </div>

                        <nav className="app-footer-links" aria-label="Footer navigation">
                            <Link to="/">New pack</Link>
                            <Link to="/dashboard">My packs</Link>
                            <Link to="/sample">Sample</Link>
                            <Link to="/account">Account</Link>
                            <Link to="/help">Help</Link>
                            <Link to="/welcome">About</Link>
                        </nav>
                    </div>

                    <div className="app-footer-bottom">
                        <span>© {new Date().getFullYear()} StudyFlow</span>
                        <span>Made for students in Nigeria</span>
                    </div>
                </div>
            </footer>

            <nav className="app-bottom-nav" aria-label="App navigation">
                {mobileLinks.map((link) => (
                    <Link
                        key={link.to}
                        to={link.to}
                        aria-current={isActive(route, link.match) ? 'page' : undefined}
                    >
                        <Icon name={link.icon} />
                        <span>{link.label}</span>
                    </Link>
                ))}
            </nav>
        </div>
    );
}
