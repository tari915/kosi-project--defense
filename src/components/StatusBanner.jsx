export default function StatusBanner({ tone = 'progress', message, action }) {
    return (
        <div className={'status-banner status-banner--' + tone} role="status" aria-live="polite">
            <span className="status-dot" aria-hidden="true" />
            <p className="status-message" key={message}>
                {message}
            </p>
            {action && (
                <button type="button" className="status-action" onClick={action.onClick}>
                    {action.label}
                </button>
            )}
        </div>
    );
}
