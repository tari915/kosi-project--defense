import { useEffect } from 'react';
import AuthModal from './components/AuthModal.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import AccountPage from './pages/AccountPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import HelpPage from './pages/HelpPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import PackPage from './pages/PackPage.jsx';
import SamplePage from './pages/SamplePage.jsx';
import WelcomePage from './pages/WelcomePage.jsx';
import WorkspacePage from './pages/WorkspacePage.jsx';
import { takeScrollIntent, useRoute } from './lib/router.jsx';

const TITLES = {
    workspace: 'New study pack · StudyFlow',
    dashboard: 'Your packs · StudyFlow',
    sample: 'Cell biology sample · StudyFlow',
    account: 'Account · StudyFlow',
    welcome: 'StudyFlow · Your notes. A clearer way to revise.',
    help: 'Help & FAQ · StudyFlow',
    pack: 'Study pack · StudyFlow',
    'not-found': 'Page not found · StudyFlow'
};

function Page({ route }) {
    if (route.name === 'workspace') return <WorkspacePage />;
    if (route.name === 'dashboard') return <DashboardPage />;
    if (route.name === 'sample') return <SamplePage />;
    if (route.name === 'account') return <AccountPage />;
    if (route.name === 'welcome') return <WelcomePage />;
    if (route.name === 'help') return <HelpPage />;
    if (route.name === 'pack') return <PackPage id={route.id} />;
    return <NotFoundPage />;
}

export default function App() {
    const route = useRoute();

    useEffect(() => {
        document.title = TITLES[route.name] || TITLES['not-found'];
    }, [route.id, route.name]);

    useEffect(() => {
        const intent = takeScrollIntent();
        if (!intent) return undefined;

        if (intent === 'top') {
            window.scrollTo({ top: 0, behavior: 'auto' });
            return undefined;
        }

        const id = decodeURIComponent(intent.replace(/^#/, ''));
        if (!id) return undefined;

        const timer = window.setTimeout(() => {
            document.getElementById(id)?.scrollIntoView({ block: 'start' });
        }, 0);

        return () => window.clearTimeout(timer);
    }, [route.key, route.name]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            if (document.querySelector('dialog[open]')) return;
            document.getElementById('main')?.focus({ preventScroll: true });
        }, 40);

        return () => window.clearTimeout(timer);
    }, [route.id, route.name]);

    return (
        <ErrorBoundary>
            <Page route={route} />
            <div className="legacy-surface">
                <AuthModal />
            </div>
        </ErrorBoundary>
    );
}
