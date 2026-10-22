import AppShell from '../components/app/AppShell.jsx';
import Icon from '../components/Icon.jsx';
import { Link } from '../lib/router.jsx';

export default function NotFoundPage() {
    return (
        <AppShell>
            <main id="main" className="app-page notfound-page" tabIndex={-1}>
                <div className="container">
                    <section className="notfound-panel">
                        <span className="notfound-code" aria-hidden="true">
                            404
                        </span>
                        <p className="app-kicker">Page not found</p>
                        <h1>
                            This page took a <em>wrong turn.</em>
                        </h1>
                        <p>
                            The link may be old, or the page may have moved. Your study packs are
                            still where you left them.
                        </p>
                        <div className="notfound-actions">
                            <Link to="/" className="button primary">
                                Go to workspace
                                <Icon name="arrow" />
                            </Link>
                            <Link to="/dashboard" className="button secondary">
                                My packs
                            </Link>
                            <Link to="/help" className="text-link">
                                Visit help
                                <Icon name="arrow" />
                            </Link>
                        </div>
                    </section>
                </div>
            </main>
        </AppShell>
    );
}
