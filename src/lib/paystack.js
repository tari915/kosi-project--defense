const SCRIPT_URL = 'https://js.paystack.co/v1/inline.js';

let scriptPromise = null;

export function loadPaystack() {
    if (window.PaystackPop) return Promise.resolve();

    if (!scriptPromise) {
        scriptPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = SCRIPT_URL;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => {
                scriptPromise = null;
                script.remove();
                reject(new Error('Payment could not load. Check your connection and try again.'));
            };
            document.head.appendChild(script);
        });
    }

    return scriptPromise;
}

export function openCheckout({ key, email, amount, reference, onSuccess, onClose }) {
    if (!window.PaystackPop) {
        throw new Error('Payment could not load. Check your connection and try again.');
    }

    const handler = window.PaystackPop.setup({
        key,
        email,
        amount,
        currency: 'NGN',
        ref: reference,
        callback: onSuccess,
        onClose
    });

    handler.openIframe();
}
