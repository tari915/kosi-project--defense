import { useSyncExternalStore } from 'react';

const NAV_EVENT = 'studyflow:navigate';
let scrollIntent = null;

function subscribe(listener) {
    window.addEventListener('popstate', listener);
    window.addEventListener(NAV_EVENT, listener);

    return () => {
        window.removeEventListener('popstate', listener);
        window.removeEventListener(NAV_EVENT, listener);
    };
}

function getSnapshot() {
    return window.location.pathname + window.location.search;
}

function normalizePath(value) {
    if (!value || value === '/') return '/';
    return value.replace(/\/+$/, '') || '/';
}

function scrollToHash(hash) {
    const id = decodeURIComponent(hash.replace(/^#/, ''));
    if (!id) return;

    window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
            document.getElementById(id)?.scrollIntoView({ block: 'start' });
        });
    });
}

export function navigate(to, options = {}) {
    const url = new URL(to, window.location.origin);

    if (url.origin !== window.location.origin) {
        window.location.assign(url.href);
        return;
    }

    const next = url.pathname + url.search + url.hash;
    const current = window.location.pathname + window.location.search + window.location.hash;
    const samePage =
        window.location.pathname === url.pathname && window.location.search === url.search;

    if (next === current) {
        if (url.hash) scrollToHash(url.hash);
        else window.scrollTo({ top: 0, behavior: 'auto' });
        return;
    }

    if (options.replace) window.history.replaceState(null, '', next);
    else window.history.pushState(null, '', next);

    if (options.preserveScroll) scrollIntent = null;
    else if (samePage) {
        scrollIntent = null;
        if (url.hash) scrollToHash(url.hash);
        else window.scrollTo({ top: 0, behavior: 'auto' });
    } else {
        scrollIntent = url.hash || 'top';
    }

    window.dispatchEvent(new Event(NAV_EVENT));
}

export function takeScrollIntent() {
    const intent = scrollIntent;
    scrollIntent = null;
    return intent;
}

export function useRoute() {
    const location = useSyncExternalStore(subscribe, getSnapshot, () => '/');
    const [rawPath, search = ''] = location.split('?');
    const path = normalizePath(rawPath);
    const base = { path, search, key: location };

    if (path === '/') return { ...base, name: 'workspace' };
    if (path === '/dashboard') return { ...base, name: 'dashboard' };
    if (path === '/sample') return { ...base, name: 'sample' };
    if (path === '/account') return { ...base, name: 'account' };
    if (path === '/welcome') return { ...base, name: 'welcome' };
    if (path === '/help') return { ...base, name: 'help' };

    if (path.startsWith('/pack/')) {
        const id = path.slice('/pack/'.length);
        if (id) return { ...base, name: 'pack', id: decodeURIComponent(id) };
    }

    return { ...base, name: 'not-found' };
}

export function Link({ to, replace = false, preserveScroll = false, onClick, children, ...rest }) {
    function handleClick(event) {
        if (onClick) onClick(event);
        if (event.defaultPrevented) return;
        if (event.button !== 0) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (rest.target && rest.target !== '_self') return;

        event.preventDefault();
        navigate(to, { replace, preserveScroll });
    }

    return (
        <a href={to} onClick={handleClick} {...rest}>
            {children}
        </a>
    );
}
