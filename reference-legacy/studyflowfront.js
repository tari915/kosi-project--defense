(() => {
    'use strict';
     /* ---------- Settings ---------- */
    const MAX_FILE_MB = 10;
    const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'txt'];
    const POLL_EVERY_MS = 3000;
    const POLL_MAX_MS = 5 * 60 * 1000;

    /* ---------- Elements ---------- */
    const $ = (id) => document.getElementById(id);

    const menuToggle = $('menuToggle');
    const navLinks = $('navLinks');
    const uploadCard = $('upload');
    const fileInput = $('fileInput');
    const chooseFile = $('chooseFile');
    const fileName = $('fileName');
    const emailInput = $('emailInput');
    const formStatus = $('formStatus');
    const buyBtn = $('buyBtn');
    const resultSection = $('result');
    const resultBody = $('resultBody');

    let selectedFile = null;
    let busy = false;
    let config = null;

    /* ---------- Small helpers ---------- */
    function setStatus(message, type) {
        formStatus.textContent = message || '';
        formStatus.className = 'form-status' + (type ? ' ' + type : '');
    }

    function setBusy(state, label) {
        busy = state;
        buyBtn.disabled = state;
        buyBtn.textContent = state ? label : 'Get My Study Pack';
    }

    function isValidEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async function api(path, options) {
        const response = await fetch(path, options);
        let data = {};
        try {
            data = await response.json();
        } catch (e) {
            /* response had no JSON body */
        }
        if (!response.ok) {
            throw new Error(data.error || 'Something went wrong. Please try again.');
        }
        return data;
    }

    async function getConfig() {
        if (!config) {
            config = await api('/api/config');
        }
        return config;
    }

    /* ---------- Mobile menu ---------- */
    function closeMenu() {
        navLinks.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.setAttribute('aria-label', 'Open menu');
    }

    menuToggle.addEventListener('click', () => {
        const isOpen = navLinks.classList.toggle('open');
        menuToggle.setAttribute('aria-expanded', String(isOpen));
        menuToggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    });

    navLinks.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));

    /* ---------- File selection ---------- */
    function setFile(file) {
        selectedFile = null;
        fileName.textContent = '';

        if (!file) return;

        const extension = file.name.split('.').pop().toLowerCase();

        if (!ALLOWED_EXTENSIONS.includes(extension)) {
            setStatus('Only PDF, DOCX or TXT files are allowed.', 'error');
            fileInput.value = '';
            return;
        }

        if (file.size > MAX_FILE_MB * 1024 * 1024) {
            setStatus('That file is larger than ' + MAX_FILE_MB + 'MB.', 'error');
            fileInput.value = '';
            return;
        }

        selectedFile = file;
        fileName.textContent = '✓ ' + file.name;
        setStatus('');
    }

    chooseFile.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => setFile(fileInput.files[0]));

    ['dragenter', 'dragover'].forEach((eventName) =>
        uploadCard.addEventListener(eventName, (e) => {
            e.preventDefault();
            uploadCard.classList.add('dragover');
        })
    );

    ['dragleave', 'drop'].forEach((eventName) =>
        uploadCard.addEventListener(eventName, (e) => {
            e.preventDefault();
            uploadCard.classList.remove('dragover');
        })
    );

    uploadCard.addEventListener('drop', (e) => {
        const file = e.dataTransfer.files[0];
        if (file) {
            try {
                fileInput.files = e.dataTransfer.files;
            } catch (err) {
                /* some browsers block this; selectedFile is still set below */
            }
            setFile(file);
        }
    });

    /* ---------- Checkout flow ---------- */
    // 1. Create order (uploads file)  2. Pay with Paystack
    // 3. Server verifies payment      4. Poll until study pack is ready
    async function startCheckout() {
        if (busy) return;

        const email = emailInput.value.trim();

        if (!selectedFile) {
            uploadCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setStatus('Choose a file first.', 'error');
            return;
        }

        if (!isValidEmail(email)) {
            uploadCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setStatus('Enter a valid email address.', 'error');
            emailInput.focus();
            return;
        }

        if (typeof PaystackPop === 'undefined') {
            setStatus('Payment could not load. Check your connection and refresh.', 'error');
            return;
        }

        setBusy(true, 'Preparing…');
        setStatus('Uploading your material…');

        try {
            const settings = await getConfig();

            const form = new FormData();
            form.append('file', selectedFile);
            form.append('email', email);

            const order = await api('/api/orders', { method: 'POST', body: form });

            setStatus('');
            openPaystack(order, email, settings);
        } catch (error) {
            setBusy(false);
            setStatus(error.message, 'error');
        }
    }

    function openPaystack(order, email, settings) {
        const handler = PaystackPop.setup({
            key: settings.paystackPublicKey,
            email: email,
            amount: order.amount, // in kobo
            currency: 'NGN',
            ref: order.reference,
            callback: function () {
                // Paystack needs a plain function here, so hand off to an async helper
                confirmPayment(order);
            },
            onClose: function () {
                if (!busy) return;
                setBusy(false);
                setStatus('Payment cancelled. You have not been charged.', 'error');
            }
        });

        setBusy(true, 'Waiting for payment…');
        handler.openIframe();
    }

    async function confirmPayment(order) {
        setBusy(true, 'Confirming payment…');
        setStatus('Confirming your payment…');

        try {
            await api('/api/orders/' + order.id + '/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reference: order.reference })
            });

            setBusy(true, 'Building your pack…');
            setStatus('Payment received. Building your study pack…', 'success');

            const result = await waitForResult(order.id);
            showResult(result);

            setBusy(false);
            setStatus('Your study pack is ready.', 'success');
        } catch (error) {
            setBusy(false);
            setStatus(error.message, 'error');
        }
    }

    async function waitForResult(orderId) {
        const startedAt = Date.now();

        while (Date.now() - startedAt < POLL_MAX_MS) {
            const order = await api('/api/orders/' + orderId);

            if (order.status === 'ready') return order.result;
            if (order.status === 'failed') {
                throw new Error('We could not build your pack. Contact support with order ' + orderId + '.');
            }

            await sleep(POLL_EVERY_MS);
        }

        throw new Error('This is taking longer than usual. Your pack will be emailed to you.');
    }

    buyBtn.addEventListener('click', startCheckout);

    /* ---------- Rendering the study pack ---------- */
    // Uses textContent only, so generated text can never inject HTML.
    function el(tag, text, className) {
        const node = document.createElement(tag);
        if (text !== undefined) node.textContent = text;
        if (className) node.className = className;
        return node;
    }

    function showResult(result) {
        resultBody.replaceChildren();

        if (result.summary) {
            resultBody.append(el('h3', 'Summary'), el('p', result.summary));
        }

        if (Array.isArray(result.flashcards) && result.flashcards.length) {
            resultBody.append(el('h3', 'Flashcards'));
            result.flashcards.forEach((card) => {
                const details = el('details');
                details.append(el('summary', card.q), el('p', card.a));
                resultBody.append(details);
            });
        }

        if (Array.isArray(result.mcqs) && result.mcqs.length) {
            resultBody.append(el('h3', 'Multiple-choice questions'));
            result.mcqs.forEach((item, index) => {
                const details = el('details');
                const list = el('ul');
                item.options.forEach((option) => list.append(el('li', option)));
                details.append(
                    el('summary', (index + 1) + '. ' + item.question),
                    list,
                    el('p', 'Answer: ' + item.answer)
                );
                resultBody.append(details);
            });
        }

        resultSection.hidden = false;
        resultSection.scrollIntoView({ behavior: 'smooth' });
    }
})();
