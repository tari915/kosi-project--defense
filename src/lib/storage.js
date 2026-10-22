const KEY = 'studyflow:lastOrder';

export function saveLastOrder(order) {
    try {
        localStorage.setItem(KEY, JSON.stringify(order));
    } catch {
        // Storage can be unavailable in private browsing. The flow still works.
    }
}

export function readLastOrder() {
    try {
        const value = localStorage.getItem(KEY);
        if (!value) return null;
        const parsed = JSON.parse(value);
        return parsed && parsed.id ? parsed : null;
    } catch {
        return null;
    }
}

export function clearLastOrder() {
    try {
        localStorage.removeItem(KEY);
    } catch {
        // Nothing to clean up.
    }
}
