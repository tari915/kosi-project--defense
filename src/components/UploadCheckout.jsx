import { useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { PlanBadge } from './PlanStatus.jsx';
import { formatDate } from '../lib/format.js';

const PHASE_LABELS = {
    uploading: 'Uploading your notes',
    processing: 'Building your study pack'
};

export default function UploadCheckout({
    variant = 'landing',
    file,
    onFile,
    user,
    authLoading,
    onSignIn,
    errors,
    subscription,
    subscriptionLoading,
    onUpgrade,
    upgradePhase,
    upgradeBusy,
    upgradeError,
    onRefreshSubscription,
    checkout,
    onBuy,
    onSample,
    onResult
}) {
    const input = useRef(null);
    const [dragging, setDragging] = useState(false);
    const { phase, message, busy, recoverable, resumeOrder } = checkout;
    const app = variant === 'app';

    const premium = subscription?.plan === 'premium';
    const used = Math.max(0, subscription?.uploadsUsed || 0);
    const limit = Math.max(1, subscription?.uploadLimit || 1);
    const remaining = Math.max(0, subscription?.remaining || 0);
    const percent = Math.min(100, Math.round((used / limit) * 100));
    const outOfUploads = Boolean(user && subscription && !subscription.canGenerate);
    const limitReached = outOfUploads || phase === 'limit';
    const planPending = Boolean(user && subscriptionLoading);
    const locked = limitReached;
    const price = subscription?.priceLabel || '₦5,000';
    const days = subscription?.premiumDays || 30;
    const premiumUntil = subscription?.premiumUntil
        ? formatDate(subscription.premiumUntil)
        : 'your renewal date';

    const step = phase === 'uploading' ? 0 : phase === 'processing' ? 1 : phase === 'ready' ? 2 : 0;

    function select(next) {
        if (!busy && !locked) onFile(next);
    }

    const card = (
        <div className={'checkout-card' + (app ? ' app-checkout' : '')} id="pricing">
            <ol className="checkout-steps" aria-label="Study pack progress">
                {['Your material', 'Generate', 'Study pack'].map((label, i) => (
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

                <p className="checkout-sub">
                    {premium
                        ? 'Premium pack: a detailed summary, revision notes, flashcards and 12 questions with explanations.'
                        : 'Free pack: a focused summary and 5 practice questions. Upgrade anytime for more.'}
                </p>

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
                    disabled={busy || locked}
                    onChange={(event) => select(event.target.files?.[0] || null)}
                />

                <div
                    className={`drop-area ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
                    onDragOver={(event) => {
                        event.preventDefault();
                        if (!busy && !locked) setDragging(true);
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
                                    disabled={busy || locked}
                                    onClick={() => input.current.click()}
                                >
                                    Change file
                                </button>
                                <button
                                    type="button"
                                    className="text-link danger"
                                    disabled={busy || locked}
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
                                disabled={busy || locked}
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
                            <span className="small muted">
                                Your pack will be saved to this account.
                            </span>
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

                {user && subscriptionLoading && (
                    <div className="checkout-plan is-loading" role="status">
                        <span className="small muted">Checking your plan…</span>
                    </div>
                )}

                {user && !subscriptionLoading && subscription && (
                    <div className="checkout-plan">
                        <div className="checkout-plan-row">
                            <PlanBadge subscription={subscription} />
                            <span className="small muted">
                                {premium
                                    ? `${used} of ${limit} uploads used`
                                    : used >= limit
                                      ? 'Free pack used'
                                      : '1 free pack available'}
                            </span>
                        </div>
                        <div
                            className={
                                'plan-meter' + (subscription.canGenerate ? '' : ' plan-meter--full')
                            }
                            role="progressbar"
                            aria-label="Uploads used"
                            aria-valuemin={0}
                            aria-valuemax={limit}
                            aria-valuenow={used}
                        >
                            <span style={{ width: percent + '%' }} />
                        </div>
                        <span className="small muted">
                            {subscription.canGenerate
                                ? `${remaining} ${remaining === 1 ? 'upload' : 'uploads'} left`
                                : 'No uploads left on this plan'}
                        </span>
                    </div>
                )}

                {limitReached ? (
                    <div className="upgrade-prompt">
                        <span className="upgrade-prompt-icon">
                            <Icon name={premium ? 'clock' : 'leaf'} />
                        </span>
                        <div>
                            <h3>{premium ? 'All Premium uploads used' : 'Your free pack is used'}</h3>
                            <p>
                                {premium
                                    ? `Premium ends ${premiumUntil}. Renew after that for another ${limit} uploads. Your existing packs stay in your library.`
                                    : 'Upgrade to Premium for 10 uploads over 30 days, detailed summaries, flashcards and more practice questions.'}
                            </p>
                            {!premium && onUpgrade && (
                                <button
                                    type="button"
                                    className="button primary"
                                    onClick={onUpgrade}
                                    disabled={upgradeBusy}
                                >
                                    {upgradeBusy
                                        ? 'Opening Paystack…'
                                        : `Upgrade — ${price} / ${days} days`}
                                    {!upgradeBusy && <Icon name="arrow" />}
                                </button>
                            )}
                            {upgradeError && (
                                <p className="field-error" role="alert">
                                    {upgradeError}
                                </p>
                            )}
                            <button
                                type="button"
                                className="text-link"
                                onClick={onRefreshSubscription}
                            >
                                Refresh my plan
                                <Icon name="refresh" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        type="submit"
                        className="button primary wide"
                        disabled={busy || authLoading || planPending}
                    >
                        <span>
                            {PHASE_LABELS[phase] ||
                                (!user
                                    ? 'Sign in to continue'
                                    : premium
                                      ? 'Create a Premium pack'
                                      : 'Create my free pack')}
                        </span>
                        {!busy && <Icon name="arrow" />}
                    </button>
                )}

                <p className="checkout-security small od-row">
                    <Icon name={user ? 'check' : 'lock'} />
                    {user ? 'Included in your plan — no per-pack payment' : 'Private to your account'}
                </p>

                {message && (
                    <div
                        className={`checkout-feedback ${
                            phase === 'failed' || phase === 'limit' ? 'is-error' : ''
                        }`}
                        role="status"
                    >
                        <div className="od-row">
                            <Icon
                                name={
                                    phase === 'ready'
                                        ? 'check'
                                        : phase === 'failed' || phase === 'limit'
                                          ? 'info'
                                          : 'clock'
                                }
                            />
                            <strong>
                                {PHASE_LABELS[phase] ||
                                    (phase === 'ready'
                                        ? 'Your pack is ready'
                                        : phase === 'limit'
                                          ? 'Upload limit reached'
                                          : 'Pack update')}
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
                        <p className="small muted">Already started? Check your saved pack.</p>
                        <button type="button" className="text-link" onClick={resumeOrder}>
                            Check saved pack
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
                <p>
                    One document. One focused study pack. Your first one is free, and Premium
                    unlocks more when you need it.
                </p>
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
