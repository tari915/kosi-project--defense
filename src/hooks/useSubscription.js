import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { createSubscription, fetchSubscription, verifySubscription } from '../lib/api.js';
import { getConfig } from '../lib/config.js';
import { loadPaystack, openCheckout } from '../lib/paystack.js';

const BUSY_PHASES = ['starting', 'paying', 'verifying'];

export function useSubscription() {
    const { user, loading: authLoading, openAuth } = useAuth();

    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [phase, setPhase] = useState('idle');
    const [message, setMessage] = useState('');

    const paidRef = useRef(false);
    const busyRef = useRef(false);
    const aliveRef = useRef(true);

    const userId = user ? user.id : null;

    useEffect(() => {
        aliveRef.current = true;
        return () => {
            aliveRef.current = false;
        };
    }, []);

    const refresh = useCallback(async () => {
        if (!userId) {
            setSubscription(null);
            setLoading(false);
            return null;
        }

        setLoading(true);

        try {
            const data = await fetchSubscription();
            if (aliveRef.current) {
                setSubscription(data);
                setError('');
                setLoading(false);
            }
            return data;
        } catch (nextError) {
            if (aliveRef.current) {
                setError(nextError.message || 'Could not load your plan.');
                setLoading(false);
            }
            return null;
        }
    }, [userId]);

    useEffect(() => {
        if (authLoading) {
            setLoading(true);
            return;
        }

        if (!userId) {
            setSubscription(null);
            setLoading(false);
            return;
        }

        refresh();
    }, [authLoading, refresh, userId]);

    const upgrade = useCallback(async () => {
        if (busyRef.current) return;

        if (!user) {
            openAuth('signin', 'Sign in to upgrade to Premium.');
            return;
        }

        busyRef.current = true;
        paidRef.current = false;
        setError('');
        setMessage('');
        setPhase('starting');

        try {
            const config = await getConfig();

            if (!config.paystackPublicKey) {
                throw new Error('Payments are not configured yet. Try again later.');
            }

            const purchase = await createSubscription();

            await loadPaystack();
            if (!aliveRef.current) return;

            setPhase('paying');
            setMessage('Complete your payment in the secure Paystack window.');

            async function confirm() {
                if (paidRef.current) return;
                paidRef.current = true;
                setPhase('verifying');
                setMessage('Confirming your payment…');

                try {
                    await verifySubscription(purchase.id);
                    await refresh();
                    if (!aliveRef.current) return;
                    setPhase('active');
                    setMessage(
                        'Premium is active. You can now create up to 10 study packs in 30 days.'
                    );
                } catch (nextError) {
                    if (!aliveRef.current) return;
                    setPhase('failed');
                    setError(nextError.message);
                } finally {
                    busyRef.current = false;
                }
            }

            openCheckout({
                key: config.paystackPublicKey,
                email: user.email,
                amount: purchase.amount,
                reference: purchase.reference,
                onSuccess: () => {
                    confirm();
                },
                onClose: () => {
                    if (paidRef.current || !aliveRef.current) return;

                    // The window closed. Check whether the payment still went through.
                    verifySubscription(purchase.id)
                        .then(() => {
                            paidRef.current = true;
                            return refresh();
                        })
                        .then(() => {
                            if (!aliveRef.current) return;
                            setPhase('active');
                            setMessage('Premium is active.');
                        })
                        .catch(() => {
                            if (!aliveRef.current) return;
                            setPhase('cancelled');
                            setMessage('Upgrade cancelled. You have not been charged.');
                        })
                        .finally(() => {
                            busyRef.current = false;
                        });
                }
            });
        } catch (nextError) {
            if (!aliveRef.current) return;
            busyRef.current = false;

            if (nextError.status === 401) {
                openAuth('signin', 'Your session expired. Sign in again.');
            }

            if (nextError.status === 409) {
                await refresh();
                setPhase('active');
                setMessage(nextError.message);
                return;
            }

            setPhase('failed');
            setError(nextError.message);
        }
    }, [openAuth, refresh, user]);

    return {
        subscription,
        loading,
        error,
        phase,
        message,
        busy: BUSY_PHASES.includes(phase),
        upgrade,
        refresh
    };
}
