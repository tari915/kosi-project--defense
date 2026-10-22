import { useRef, useState } from 'react';
import Icon from './Icon.jsx';

const phaseLabels = {
    uploading: 'Uploading your notes',
    paying: 'Waiting for Paystack',
    verifying: 'Confirming payment',
    processing: 'Preparing your pack'
};

export default function UploadCheckout({
    variant = 'landing',
    file,
    onFile,
    user,
    authLoading,
    onSignIn,
    errors,
    config,
    configState,
    onReloadConfig,
    checkout,
    onBuy,
    onSample,
    onResult
}) {
    const input = useRef(null);
    const [dragging, setDragging] = useState(false);
    const { phase, message, busy, recoverable, resumeOrder } = checkout;
    const app = variant === 'app';
    const step = ['uploading'].includes(phase)
        ? 0
        : ['paying', 'verifying'].includes(phase)
          ? 1
          : ['processing', 'ready'].includes(phase)
            ? 2
            : 0;

    function select(next) {
        if (!busy) onFile(next);
    }

    const card = (
        <div className={'checkout-card' + (app ? ' app-checkout' : '')} id="pricing">
            <ol className="checkout-steps" aria-label="Study pack progress">
                {['Your material', 'Payment', 'Study pack'].map((label, i) => (
                    <li
                        key={label}
                        className={i <= step ? 'active' : ''}
                        aria-current={i === step ? 'step' : undefined}
                    >
                        <span className="step-dot">{i < step ? <Icon name="check" /> : i + 1}</span>
                        <span>{label}</span>
                    </li>
                ))}
            </ol>

            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    onBuy();
                }}
                noValidate
                aria-busy={busy}
            >
                <div className="checkout-heading od-row">
                    <h2>Create your study pack</h2>
                    <Icon name="leaf" />
                </div>

                {errors.file && (
                    <div className="error-summary" role="alert">
                        <strong>A quick check before you continue</strong>
                        <a href="#file-picker">{errors.file}</a>
                    </div>
                )}

                <input
                    ref={input}
                    type="file"
                    accept=".pdf,.docx,.txt"
                    id="fileInput"
                    hidden
                    disabled={busy}
                    onChange={(event) => select(event.target.files?.[0] || null)}
                />

                <div
                    className={`drop-area ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
                    onDragOver={(event) => {
                        event.preventDefault();
                        if (!busy) setDragging(true);
                    }}
                    onDragLeave={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false);
                    }}
                    onDrop={(event) => {
                        event.preventDefault();
                        setDragging(false);
                        select(event.dataTransfer.files?.[0] || null);
                    }}
                >
                    {file ? (
                        <>
                            <span className="upload-symbol success">
                                <Icon name="file" />
                            </span>
                            <strong className="file-full">{file.name}</strong>
                            <span className="small muted">
                                {file.size < 1024 * 1024
                                    ? `${Math.max(1, Math.round(file.size / 1024))} KB`
                                    : `${(file.size / 1024 / 1024).toFixed(1)} MB`}{' '}
                                — Ready to upload
                            </span>
                            <div className="od-cluster">
                                <button
                                    type="button"
                                    className="text-link"
                                    disabled={busy}
                                    onClick={() => input.current.click()}
                                >
                                    Change file
                                </button>
                                <button
                                    type="button"
                                    className="text-link danger"
                                    disabled={busy}
                                    onClick={() => {
                                        select(null);
                                        input.current.value = '';
                                    }}
                                >
                                    Remove
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <span className="upload-symbol">
                                <Icon name="up" />
                            </span>
                            <strong>Drop your lecture notes here</strong>
                            <span className="small muted">PDF, DOCX or TXT — Up to 10 MB</span>
                            <button
                                type="button"
                                className="button secondary"
                                id="file-picker"
                                disabled={busy}
                                aria-describedby={errors.file ? 'file-error' : undefined}
                                onClick={() => input.current.click()}
                            >
                                Choose a file
                                <Icon name="plus" />
                            </button>
                        </>
                    )}
                </div>

                {errors.file && (
                    <p className="field-error" id="file-error">
                        {errors.file}
                    </p>
                )}

                <div className="account-field form-field">
                    <span className="small muted">Account</span>
                    {user ? (
                        <div className="od-field">
                            <strong className="file-full">{user.email}</strong>
                            <span className="small muted">Your pack will be saved to this account.</span>
                        </div>
                    ) : (
                        <button
                            type="button"
                            className="button secondary wide"
                            onClick={onSignIn}
                            disabled={authLoading}
                        >
                            {authLoading ? 'Checking your session…' : 'Sign in or create an account'}
                            <Icon name="arrow" />
                        </button>
                    )}
                </div>

                <div className="checkout-total od-row">
                    <div className="od-field od-fill">
                        <strong>One study pack</strong>
                        <span className="small muted">A single payment. No subscription.</span>
                    </div>
                    {configState === 'loading' ? (
                        <span className="price-skeleton" aria-label="Loading price" />
                    ) : (
                        <strong className="checkout-price od-nowrap">
                            {config?.priceLabel || '—'}
                        </strong>
                    )}
                </div>

                {configState === 'error' && (
                    <div className="inline-message" role="status">
                        <p>Pricing is unavailable right now. You can still explore the sample pack.</p>
                        <button type="button" className="text-link" onClick={onReloadConfig}>
                            Retry pricing
                            <Icon name="refresh" />
                        </button>
                    </div>
                )}

                <div className="preview-disclosure od-row-top">
                    <Icon name="info" />
                    <p>
                        Review the price before continuing. Your study pack will be generated from
                        the document you upload.
                    </p>
                </div>

                {config && !config.paystackPublicKey && (
                    <p className="field-error">
                        Checkout is unavailable right now. You can explore the sample pack.
                    </p>
                )}

                <button
                    type="submit"
                    className="button primary wide"
                    disabled={
                        busy ||
                        authLoading ||
                        configState !== 'ready' ||
                        (Boolean(user) && !config?.paystackPublicKey)
                    }
                >
                    <span>
                        {phaseLabels[phase] ||
                            (!user ? 'Sign in to continue' : 'Continue to Paystack')}
                    </span>
                    {!busy && <Icon name="arrow" />}
                </button>

                <p className="checkout-security small od-row">
                    <Icon name="lock" />
                    Payment verified by Paystack
                </p>

                {message && (
                    <div
                        className={`checkout-feedback ${phase === 'failed' ? 'is-error' : ''}`}
                        role="status"
                    >
                        <div className="od-row">
                            <Icon
                                name={
                                    phase === 'ready'
                                        ? 'check'
                                        : phase === 'failed'
                                          ? 'info'
                                          : 'clock'
                                }
                            />
                            <strong>
                                {phaseLabels[phase] ||
                                    (phase === 'ready' ? 'Your pack is ready' : 'Order update')}
                            </strong>
                        </div>
                        <p>{message}</p>
                        {busy && (
                            <div className="status-track">
                                <span />
                            </div>
                        )}
                        {phase === 'ready' && (
                            <button type="button" className="text-link" onClick={onResult}>
                                Open study pack
                                <Icon name="arrow" />
                            </button>
                        )}
                    </div>
                )}

                {recoverable && !busy && phase !== 'ready' && (
                    <div className="recover-order">
                        <p className="small muted">Already started? Check your saved order.</p>
                        <button type="button" className="text-link" onClick={resumeOrder}>
                            Check saved order
                            <Icon name="refresh" />
                        </button>
                    </div>
                )}
            </form>

            <div className="checkout-bottom">
                <span>Want to see what's inside?</span>
                <button type="button" className="text-link" onClick={onSample}>
                    Explore a sample
                    <Icon name="arrow" />
                </button>
            </div>
        </div>
    );

    if (app) {
        return (
            <div className="app-intake" id="upload">
                {card}
            </div>
        );
    }

    return (
        <section id="upload" className="upload-section container" aria-labelledby="upload-heading">
            <div className="upload-intro">
                <h2 id="upload-heading">
                    Start with your notes.
                    <br />
                    <span className="muted">We'll take it from here.</span>
                </h2>
                <p>One document. One focused study pack. Your next revision session starts here.</p>
                <div className="intake-benefits">
                    <div className="od-row">
                        <Icon name="file" />
                        <span>PDF, DOCX or TXT</span>
                    </div>
                    <div className="od-row">
                        <Icon name="cards" />
                        <span>Summary, flashcards & questions</span>
                    </div>
                    <div className="od-row">
                        <Icon name="book" />
                        <span>Saved to your account</span>
                    </div>
                </div>
                <button className="text-link" type="button" onClick={onSample}>
                    Take a look at a sample
                    <Icon name="arrow" />
                </button>
            </div>
            {card}
        </section>
    );
}
