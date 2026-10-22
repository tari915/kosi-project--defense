let pending = null;

export function getConfig() {
    if (!pending) {
        pending = fetch('/api/config')
            .then((response) => {
                if (!response.ok) throw new Error('Could not load settings.');
                return response.json();
            })
            .catch((error) => {
                pending = null;
                throw error;
            });
    }

    return pending;
}
