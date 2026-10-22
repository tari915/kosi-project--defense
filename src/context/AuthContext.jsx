import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authConfigured, supabase } from '../lib/authClient.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(authConfigured);
    const [authView, setAuthView] = useState(null);
    const [authNotice, setAuthNotice] = useState('');

    useEffect(() => {
        if (!supabase) {
            setLoading(false);
            return undefined;
        }

        let active = true;

        supabase.auth
            .getSession()
            .then(({ data }) => {
                if (!active) return;
                setUser((data.session && data.session.user) || null);
                setLoading(false);
            })
            .catch(() => {
                if (active) setLoading(false);
            });

        const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
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

        return () => {
            active = false;
            listener.subscription.unsubscribe();
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
        if (supabase) {
            await supabase.auth.signOut().catch(() => {});
        }
        setUser(null);
        setAuthView(null);
        setAuthNotice('');
    }, []);

    const value = useMemo(
        () => ({
            user,
            loading,
            configured: authConfigured,
            authView,
            authNotice,
            openAuth,
            closeAuth,
            signOut
        }),
        [user, loading, authView, authNotice, openAuth, closeAuth, signOut]
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
