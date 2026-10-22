import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getSupabase } from '../lib/authClient.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [configured, setConfigured] = useState(false);
    const [authView, setAuthView] = useState(null);
    const [authNotice, setAuthNotice] = useState('');

    useEffect(() => {
        let active = true;
        let subscription = null;

        getSupabase()
            .then((client) => {
                if (!active) return;

                if (!client) {
                    setConfigured(false);
                    setLoading(false);
                    return;
                }

                setConfigured(true);

                client.auth
                    .getSession()
                    .then(({ data }) => {
                        if (!active) return;
                        setUser((data.session && data.session.user) || null);
                        setLoading(false);
                    })
                    .catch(() => {
                        if (active) setLoading(false);
                    });

                const { data: listener } = client.auth.onAuthStateChange((event, session) => {
                    if (!active) return;

                    setUser((session && session.user) || null);

                    if (event === 'PASSWORD_RECOVERY') {
                        setAuthNotice('Choose a new password for your account.');
                        setAuthView('new-password');
                    }

                    if (event === 'SIGNED_OUT') {
                        setAuthView(null);
                        setAuthNotice('');
                    }
                });

                subscription = listener.subscription;
            })
            .catch(() => {
                if (!active) return;
                setConfigured(false);
                setLoading(false);
            });

        return () => {
            active = false;
            if (subscription) subscription.unsubscribe();
        };
    }, []);

    const openAuth = useCallback((view = 'signin', notice = '') => {
        setAuthNotice(notice);
        setAuthView(view);
    }, []);

    const closeAuth = useCallback(() => {
        setAuthView(null);
        setAuthNotice('');
    }, []);

    const signOut = useCallback(async () => {
        const client = await getSupabase();
        if (client) {
            await client.auth.signOut().catch(() => {});
        }
        setUser(null);
        setAuthView(null);
        setAuthNotice('');
    }, []);

    const value = useMemo(
        () => ({
            user,
            loading,
            configured,
            authView,
            authNotice,
            openAuth,
            closeAuth,
            signOut
        }),
        [user, loading, configured, authView, authNotice, openAuth, closeAuth, signOut]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used inside AuthProvider.');
    }

    return context;
}
