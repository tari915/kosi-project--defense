import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from './Logo.jsx';

export default function Navbar() {
    const [open, setOpen] = useState(false);
    const { user, loading: authLoading, openAuth, signOut } = useAuth();

    const isDashboard = window.location.pathname.replace(/\/+$/, '') === '/dashboard';
    const home = isDashboard ? '/#' : '#';

    const links = [
        { href: home + 'features', label: 'Features' },
        { href: home + 'how-it-works', label: 'How it works' },
        { href: home + 'pricing', label: 'Pricing' }
    ];

    useEffect(() => {
        if (!open) return;

        const onKeyDown = (event) => {
            if (event.key === 'Escape') setOpen(false);
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [open]);

    const closeMenu = () => setOpen(false);

    async function handleSignOut() {
        closeMenu();
        await signOut();
    }

    return (
        <nav className="navbar">
            <a
                className="brand-link"
                href={isDashboard ? '/' : '#top'}
                onClick={closeMenu}
                aria-label="StudyFlow home"
            >
                <Logo />
            </a>

            <button
                className="menu-toggle"
                type="button"
                aria-label={open ? 'Close menu' : 'Open menu'}
                aria-expanded={open}
                aria-controls="navLinks"
                onClick={() => setOpen((value) => !value)}
            >
                <span />
                <span />
                <span />
            </button>

            <div className={'nav-links' + (open ? ' open' : '')} id="navLinks">
                {links.map((link, index) => (
                    <a key={link.href} href={link.href} onClick={closeMenu}>
                        <span className="nav-index" aria-hidden="true">
                            {String(index + 1).padStart(2, '0')}
                        </span>
                        {link.label}
                    </a>
                ))}

                {!authLoading &&
                    (user ? (
                        <>
                            {!isDashboard && (
                                <a href="/dashboard" className="nav-account-link" onClick={closeMenu}>
                                    <span className="nav-index" aria-hidden="true">
                                        04
                                    </span>
                                    My packs
                                </a>
                            )}
                            <button
                                className="nav-signout"
                                type="button"
                                onClick={handleSignOut}
                                aria-label={'Sign out of ' + user.email}
                                title={'Sign out of ' + user.email}
                            >
                                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <path
                                        d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4"
                                        stroke="currentColor"
                                        strokeWidth="1.7"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                                <span>Sign out</span>
                            </button>
                        </>
                    ) : (
                        <button
                            className="nav-signin"
                            type="button"
                            onClick={() => {
                                closeMenu();
                                openAuth('signin');
                            }}
                        >
                            Sign in
                        </button>
                    ))}

                <a href={home + 'upload'} className="nav-btn" onClick={closeMenu}>
                    {isDashboard ? 'New pack' : 'Get started'}
                    <span className="nav-dot" aria-hidden="true" />
                </a>
            </div>
        </nav>
    );
}
