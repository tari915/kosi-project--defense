/* ============================================================
   ENTITLEMENTS
   Free: one pack per account, ever.
   Premium: ten packs inside the active 30-day period.
   Expiry is derived from expires_at, so no cron job is needed.
   ============================================================ */
const supabase = require('./supabase.js');

const FREE_UPLOAD_LIMIT = 1;
const PREMIUM_UPLOAD_LIMIT = 10;
const PREMIUM_DAYS = 30;

// Any pack generated under the new model consumes the free trial. Legacy
// pay-per-pack orders are excluded so existing customers still get one.
const FREE_PLAN_ORDERS = ['free', 'premium'];

function shape(plan, used, limit, subscription) {
    const uploadsUsed = Math.max(0, used);
    const remaining = Math.max(0, limit - uploadsUsed);

    return {
        plan,
        uploadsUsed,
        uploadLimit: limit,
        remaining,
        canGenerate: remaining > 0,
        premiumUntil: subscription ? subscription.expires_at : null,
        activeSubscription: subscription
            ? {
                  id: subscription.id,
                  started_at: subscription.started_at,
                  expires_at: subscription.expires_at
              }
            : null
    };
}

async function getEntitlement(userId) {
    const subscription = await supabase.getActiveSubscription(userId);

    if (subscription) {
        const used = await supabase.countOrdersForUser(userId, {
            since: subscription.started_at,
            plans: ['premium']
        });

        return shape('premium', used, PREMIUM_UPLOAD_LIMIT, subscription);
    }

    const used = await supabase.countOrdersForUser(userId, { plans: FREE_PLAN_ORDERS });

    return shape('free', used, FREE_UPLOAD_LIMIT, null);
}

function limitMessage(entitlement) {
    if (entitlement.plan === 'premium') {
        return (
            'You have used all ' +
            PREMIUM_UPLOAD_LIMIT +
            ' uploads included in this Premium period.'
        );
    }

    return 'Your free study pack has been used. Upgrade to Premium for 10 more uploads.';
}

module.exports = {
    getEntitlement,
    limitMessage,
    FREE_UPLOAD_LIMIT,
    PREMIUM_UPLOAD_LIMIT,
    PREMIUM_DAYS
};
