import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { createOrder, fetchOrder, verifyOrder } from '../lib/api.js';
import { getConfig } from '../lib/config.js';
import { loadPaystack, openCheckout } from '../lib/paystack.js';
import { clearLastOrder, readLastOrder, saveLastOrder } from '../lib/storage.js';

const POLL_EVERY_MS = 3000;
const POLL_MAX_MS = 5 * 60 * 1000;

const BUSY_PHASES = ['uploading', 'paying', 'verifying', 'processing'];

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

    // Pick up an unfinished or finished order from an earlier visit.
    // Orders are private now, so this waits for a signed-in session.
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

                const currentRecord = {
                    ...(saved && saved.id === id ? saved : {}),
                    id,
                    reference: order.reference
                };

                orderRef.current = currentRecord;
                setRecoverable(currentRecord);
            } catch {
                // A stale or someone else's saved order should never block the page.
            }
        }

        restore();

        return () => {
            cancelled = true;
        };
    }, [authLoading, autoRestore, userId]);

    const confirmOrder = useCallback(async (order) => {
        busyRef.current = true;
        paidRef.current = true;
        setOrderId(order.id);
        setPhase('verifying');
        setMessage('Confirming your payment…');

        try {
            await verifyOrder(order.id);
            if (!aliveRef.current) return;

            setPhase('processing');
            setMessage('Payment received. Building your study pack…');

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
                        'We could not build your pack. Contact support with your reference, ' +
                            order.reference +
                            '.'
                    );
                }

                if (Date.now() - startedAt > POLL_MAX_MS) {
                    setPhase('timeout');
                    setMessage(
                        'This is taking longer than usual. Keep this page open or come back later — your order is saved in your account.'
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
            setPhase('failed');
            setMessage(error.message);
        } finally {
            busyRef.current = false;
        }
    }, [openAuth]);

    const startCheckout = useCallback(
        async (file) => {
            if (busyRef.current) return;

            if (!user) {
                openAuth('signin', 'Sign in to continue to checkout.');
                return;
            }

            busyRef.current = true;
            paidRef.current = false;
            setRecoverable(null);
            setResult(null);
            setRestoredResult(false);
            setPhase('uploading');
            setMessage('Uploading your material…');

            try {
                const config = await getConfig();
                const order = await createOrder(file);

                orderRef.current = order;
                setOrderId(order.id);
                setRecoverable(order);
                saveLastOrder({
                    id: order.id,
                    reference: order.reference,
                    createdAt: Date.now()
                });

                await loadPaystack();
                if (!aliveRef.current) return;

                setPhase('paying');
                setMessage('Complete your payment in the secure Paystack window.');

                // Paystack's validator rejects async functions, so onClose is a plain
                // wrapper around this async check.
                async function checkClosedPayment() {
                    try {
                        await verifyOrder(order.id);
                        await confirmOrder(order);
                    } catch (error) {
                        if (!aliveRef.current) return;
                        busyRef.current = false;
                        if (error.status === 401) {
                            openAuth('signin', 'Your session expired. Sign in again.');
                        }
                        setPhase('cancelled');
                        setMessage(
                            error.status === 402
                                ? 'Payment cancelled. You have not been charged.'
                                : error.status === 401
                                  ? 'Your session expired. Sign in again to check your order.'
                                  : 'We could not confirm your payment. Check your order again, or reload this page.'
                        );
                    }
                }

                openCheckout({
                    key: config.paystackPublicKey,
                    email: user.email,
                    amount: order.amount,
                    reference: order.reference,
                    onSuccess: () => confirmOrder(order),
                    onClose: () => {
                        if (paidRef.current || !aliveRef.current) return;
                        checkClosedPayment();
                    }
                });
            } catch (error) {
                if (!aliveRef.current) return;
                busyRef.current = false;
                if (error.status === 401) {
                    openAuth('signin', 'Your session expired. Sign in again.');
                }
                setPhase('failed');
                setMessage(error.message);
            }
        },
        [confirmOrder, openAuth, user]
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

        await confirmOrder(target);
    }, [confirmOrder, openAuth, recoverable, user]);

    const reset = useCallback(() => {
        clearLastOrder();
        orderRef.current = null;
        paidRef.current = false;
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
