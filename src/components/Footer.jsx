import Logo from './Logo.jsx';

export default function Footer() {
    const year = new Date().getFullYear();
    const isDashboard = window.location.pathname.replace(/\/+$/, '') === '/dashboard';
    const home = isDashboard ? '/#' : '#';

    return (
        <footer className="footer">
            <div className="footer-inner">
                <div className="footer-top">
                    <div className="footer-brand">
                        <Logo />
                        <p>Your notes in. A study pack out.</p>
                    </div>

                    <div className="footer-links">
                        <a href={home + 'features'}>Features</a>
                        <a href={home + 'how-it-works'}>How it works</a>
                        <a href={home + 'pricing'}>Pricing</a>
                        <a href={home + 'upload'}>{isDashboard ? 'New pack' : 'Get started'}</a>
                    </div>
                </div>

                <div className="footer-word" aria-hidden="true">
                    Study<em>Flow</em>
                    <span>.</span>
                </div>

                <div className="footer-bottom">
                    <span>© {year} StudyFlow</span>
                    <span>Made for students in Nigeria</span>
                </div>
            </div>
        </footer>
    );
}
