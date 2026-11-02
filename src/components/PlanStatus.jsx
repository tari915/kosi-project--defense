import Icon from './Icon.jsx';
import { formatDate } from '../lib/format.js';

const UPGRADE_LABELS = {
    starting: 'Starting your upgrade…',
    paying: 'Complete payment in Paystack',
    verifying: 'Confirming payment…'
};

export function PlanBadge({ subscription, loading = false }) {
    if (loading || !subscription) return null;

    const premium = subscription.plan === 'premium';

    return (
        <span className={'plan-badge' + (premium ? ' plan-badge--premium' : '')}>
            <Icon name={premium ? 'leaf' : 'user'} />
            {premium ? 'Premium' : 'Free'}
        </span>
    );
}

export default function PlanStatus({
    subscription,
    loading = false,
    error = '',
    phase = 'idle',
    message = '',
    busy = false,
    onUpgrade,
    onRefresh,
    variant = 'card'
}) {
    if (loading) {
        return (
            <section className={'plan-card plan-card--' + variant} role="status">
                <span className="sr-only">Loading your plan…</span>
                <div className="plan-loading" aria-hidden="true">
                    <span className="skeleton skeleton-pill" />
                    <span className="skeleton skeleton-line" />
                    <span className="skeleton skeleton-line skeleton-line--short" />
                </div>
            </section>
        );
    }

    if (!subscription) {
        return (
            <section className={'plan-card plan-card--' + variant}>
                <div className="plan-card-head">
                    <span className="plan-badge">
                        <Icon name="user" />
                        Plan
                    </span>
                </div>
                <h2>Your plan is unavailable.</h2>
                <p>{error || 'We could not load your plan right now.'}</p>
                {onRefresh && (
                    <div className="plan-actions">
                        <button type="button" className="button secondary" onClick={onRefresh}>
                            Try again
                            <Icon name="refresh" />
                        </button>
                    </div>
                )}
            </section>
        );
    }

    const premium = subscription.plan === 'premium';
    const used = Math.max(0, subscription.uploadsUsed || 0);
    const limit = Math.max(1, subscription.uploadLimit || 1);
    const remaining = Math.max(0, subscription.remaining || 0);
    const percent = Math.min(100, Math.round((used / limit) * 100));
    const exhausted = !subscription.canGenerate;
    const until = subscription.premiumUntil ? formatDate(subscription.premiumUntil) : '';
    const price = subscription.priceLabel || '₦5,000';
    const days = subscription.premiumDays || 30;

    const heading = premium
        ? exhausted
            ? 'All Premium uploads used.'
            : 'Premium is active.'
        : exhausted
          ? 'Your free pack is used.'
          : 'Your first pack is free.';

    const description = premium
        ? exhausted
            ? `You have used all ${limit} uploads in this period. Premium ends ${until}; renew after that for another ${limit}.`
            : `Up to ${limit} uploads in this 30-day period, with no per-pack charges.`
        : exhausted
          ? 'Upgrade for 10 uploads over 30 days, detailed summaries, flashcards and more questions.'
          : 'One document, one full study pack. Upgrade whenever you need more.';

    const feedback = phase === 'failed' ? error : message;

    return (
        <section
            className={
                'plan-card plan-card--' + variant + (premium ? ' plan-card--premium' : '')
            }
        >
            <div className="plan-card-head">
                <PlanBadge subscription={subscription} />
                {premium && until && <span className="plan-until">Until {until}</span>}
            </div>

            <h2>{heading}</h2>
            <p>{description}</p>

            <div
                className={'plan-meter' + (exhausted ? ' plan-meter--full' : '')}
                role="progressbar"
                aria-label="Uploads used"
                aria-valuemin={0}
                aria-valuemax={limit}
                aria-valuenow={used}
            >
                <span style={{ width: percent + '%' }} />
            </div>

            <div className="plan-usage">
                <strong>
                    {used} of {limit} uploads used
                </strong>
                <span>{remaining} left</span>
            </div>

            {phase !== 'idle' && feedback && (
                <p
                    className={'plan-feedback' + (phase === 'failed' ? ' is-error' : '')}
                    role={phase === 'failed' ? 'alert' : 'status'}
                >
                    {feedback}
                </p>
            )}

            {!premium && onUpgrade && (
                <div className="plan-actions">
                    <button
                        type="button"
                        className="button primary"
                        onClick={onUpgrade}
                        disabled={busy}
                    >
                        {busy
                            ? UPGRADE_LABELS[phase] || 'Opening Paystack…'
                            : `Upgrade — ${price} / ${days} days`}
                        {!busy && <Icon name="arrow" />}
                    </button>
                </div>
            )}

            {!premium && !exhausted && (
                <p className="plan-note">
                    Free includes 1 upload and 5 practice questions. No card needed.
                </p>
            )}

            {premium && exhausted && (
                <p className="plan-note">
                    Your existing packs stay in your library. Contact support if you need help.
                </p>
            )}
        </section>
    );
}
