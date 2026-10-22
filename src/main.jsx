import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/layout.css';
import '@fontsource/instrument-serif/latin-400.css';
import '@fontsource/instrument-serif/latin-400-italic.css';
import '@fontsource-variable/instrument-sans/wght.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import './styles/legacy-tokens.css';
import './styles/legacy.css';
import './styles/font.css';
import './styles/tokens.css';
import './styles/global.css';
import './styles/account.css';
import './styles/app.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';

const url = new URL(window.location.href);
const legacyOrder = url.searchParams.get('order');

if (legacyOrder) {
    window.history.replaceState(null, '', '/pack/' + encodeURIComponent(legacyOrder));
} else if (url.hash === '#upload') {
    window.history.replaceState(null, '', '/new');
} else if (url.hash === '#study/sample') {
    window.history.replaceState(null, '', '/sample');
} else if (url.hash === '#study/result') {
    window.history.replaceState(null, '', '/dashboard');
}

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <AuthProvider>
            <App />
        </AuthProvider>
    </StrictMode>
);
