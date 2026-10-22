import StatusBanner from './StatusBanner.jsx';

const BUSY_LABELS = {
    uploading: 'Uploading…',
    paying: 'Waiting for payment…',
    verifying: 'Confirming payment…',
    processing: 'Building your pack…'
};

const TONES = {
    uploading: 'progress',
    paying: 'progress',
    verifying: 'progress',
    processing: 'progress',
    ready: 'success',
    failed: 'danger',
    cancelled: 'neutral',
    timeout: 'warning'
};

export default function Pricing({ priceLabel, phase, message, busy, signedIn, onBuy, onResume }) {
    const showBanner = phase !== 'idle' && Boolean(TONES[phase]);
    const action =
        phase === 'timeout' || phase === 'cancelled'
            ? { label: 'Check again', onClick: onResume }
            : null;

    return (
        <section id="pricing" className="pricing">
            <div className="price-card">
                <div className="price-main">
                    <p className="kicker kicker--light">04 — Pricing</p>
                    <h2>
                        One exam pack.
                        {priceLabel ? (
                            <span className="price-value" key={priceLabel}>
                                {priceLabel}
                            </span>
                        ) : (
                            <span className="price-value is-loading">₦ —</span>
                        )}
                    </h2>
                    <p className="price-note">
                        Pay once. No subscription, no surprises. Your packs stay in your account.
                    </p>
                </div>

                <div className="price-side">
                    <p className="includes-label">Included in every pack</p>
                    <ul className="includes">
                        <li>Exam-focused summary</li>
                        <li>Flashcards for active recall</li>
                        <li>MCQs with answers</li>
                        <li>Practice questions</li>
                    </ul>

                    <button
                        className="btn btn--accent btn--wide buy-btn"
                        type="button"
                        id="buyBtn"
                        aria-disabled={busy || undefined}
                        onClick={busy ? undefined : onBuy}
                    >
                        <span
                            className="spinner"
                            data-visible={busy || undefined}
                            aria-hidden="true"
                        />
                        <span className="swap-label">
                            <span
                                className="swap-item"
                                data-hidden={busy || undefined}
                                aria-hidden={busy}
                            >
                                {signedIn ? 'Get my study pack' : 'Sign in to buy'}
                                <span className="btn-arrow" aria-hidden="true">
                                    ↘
                                </span>
                            </span>
                            <span
                                className="swap-item"
                                data-hidden={!busy || undefined}
                                aria-hidden={!busy}
                            >
                                {BUSY_LABELS[phase] || 'Working…'}
                            </span>
                        </span>
                    </button>

                    <p className="fineprint">Secure checkout via Paystack · One-time payment</p>

                    {showBanner && (
                        <StatusBanner tone={TONES[phase]} message={message} action={action} />
                    )}
                </div>
            </div>
        </section>
    );
}
