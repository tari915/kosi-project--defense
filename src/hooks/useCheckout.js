import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { createOrder, fetchOrder } from '../lib/api.js';
import { clearLastOrder, readLastOrder, saveLastOrder } from '../lib/storage.js';

const POLL_EVERY_MS = 3000;
const POLL_MAX_MS = 5 * 60 * 1000;

const BUSY_PHASES = ['uploading', 'processing'];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function useCheckout({ autoRestore = true } = {}) {
    const { user, loading: authLoading, openAuth } = useAuth();

    const [phase, setPhase] = useState('idle');
    const [message, setMessage] = useState('');
    const [result, setResult] = useState(null);
    const [orderId, setOrderId] = useState(null);
    const [restoredResult, setRestoredResult] = useState(false);
    const [recoverable, setRecoverable] = useState(null);

    const orderRef = useRef(null);
    const busyRef = useRef(false);
    const aliveRef = useRef(true);

    const userId = user ? user.id : null;

    useEffect(() => {
        aliveRef.current = true;
        return () => {
            aliveRef.current = false;
        };
    }, []);

    // Pick up an unfinished or finished pack from an earlier visit.
    useEffect(() => {
        if (!autoRestore || authLoading || !userId) return undefined;

        let cancelled = false;

        async function restore() {
            const params = new URLSearchParams(window.location.search);
            const deepLink = params.get('order');
            const saved = readLastOrder();
            const id = deepLink || (saved && saved.id);

            if (!id) return;

            try {
                const order = await fetchOrder(id);
                if (cancelled) return;

                setOrderId(order.id);

                if (order.status === 'ready') {
                    setResult(order.result);
                    setRestoredResult(true);
                    setPhase('ready');
                    setMessage('Your study pack is ready.');
                    return;
                }

                if (order.status === 'failed') {
                    clearLastOrder();
                    return;
                }

                if (order.status === 'processing' || order.status === 'paid') {
                    const currentRecord = {
                        ...(saved && saved.id === id ? saved : {}),
                        id,
                        reference: order.reference
                    };

                    orderRef.current = currentRecord;
                    setRecoverable(currentRecord);
                }
            } catch {
                // A stale or someone else's saved order should never block the page.
            }
        }

        restore();

        return () => {
            cancelled = true;
        };
    }, [authLoading, autoRestore, userId]);

    const pollOrder = useCallback(
        async (order) => {
            busyRef.current = true;
            setOrderId(order.id);
            setPhase('processing');
            setMessage('Building your study pack…');

            try {
                const startedAt = Date.now();

                while (aliveRef.current) {
                    const current = await fetchOrder(order.id);
                    if (!aliveRef.current) return;

                    if (current.status === 'ready') {
                        setResult(current.result);
                        setRestoredResult(false);
                        setPhase('ready');
                        setMessage('Your study pack is ready.');
                        return;
                    }

                    if (current.status === 'failed') {
                        throw new Error(
                            'We could not build your pack. Your upload allowance was used. ' +
                                'Contact support with reference ' +
                                order.reference +
                                '.'
                        );
                    }

                    if (Date.now() - startedAt > POLL_MAX_MS) {
                        setPhase('timeout');
                        setMessage(
                            'This is taking longer than usual. Keep this page open or come back later — your pack is saved in your account.'
                        );
                        return;
                    }

                    await sleep(POLL_EVERY_MS);
                }
            } catch (error) {
                if (!aliveRef.current) return;

                if (error.status === 401) {
                    setRecoverable(order);
                    openAuth('signin', 'Your session expired. Sign in again.');
                }

                if (error.status === 402) {
                    setPhase('limit');
                    setMessage(error.message);
                } else {
                    setPhase('failed');
                    setMessage(error.message);
                }
            } finally {
                busyRef.current = false;
            }
        },
        [openAuth]
    );

    const startCheckout = useCallback(
        async (file) => {
            if (busyRef.current) return;

            if (!user) {
                openAuth('signin', 'Sign in to create your study pack.');
                return;
            }

            busyRef.current = true;
            setRecoverable(null);
            setResult(null);
            setRestoredResult(false);
            setPhase('uploading');
            setMessage('Uploading your material…');

            try {
                const order = await createOrder(file);

                orderRef.current = order;
                setOrderId(order.id);
                setRecoverable(order);
                saveLastOrder({
                    id: order.id,
                    reference: order.reference,
                    createdAt: Date.now()
                });

                await pollOrder(order);
            } catch (error) {
                if (!aliveRef.current) return;
                busyRef.current = false;

                if (error.status === 401) {
                    openAuth('signin', 'Your session expired. Sign in again.');
                }

                if (error.status === 402) {
                    setPhase('limit');
                    setMessage(error.message);
                } else {
                    setPhase('failed');
                    setMessage(error.message);
                }
            }
        },
        [openAuth, pollOrder, user]
    );

    const resumeOrder = useCallback(async () => {
        if (busyRef.current) return;

        const target = orderRef.current || recoverable || readLastOrder();
        if (!target) return;

        if (!user) {
            openAuth('signin', 'Sign in to check your order.');
            return;
        }

        orderRef.current = target;
        setRecoverable(null);

        await pollOrder(target);
    }, [openAuth, pollOrder, recoverable, user]);

    const reset = useCallback(() => {
        clearLastOrder();
        orderRef.current = null;
        busyRef.current = false;
        setOrderId(null);
        setResult(null);
        setRestoredResult(false);
        setRecoverable(null);
        setPhase('idle');
        setMessage('');
    }, []);

    return {
        phase,
        message,
        result,
        orderId,
        restoredResult,
        recoverable,
        busy: BUSY_PHASES.includes(phase),
        startCheckout,
        resumeOrder,
        reset
    };
}
