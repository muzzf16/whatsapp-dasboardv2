const databaseService = require('./databaseService');
const deliveryPolicyService = require('./deliveryPolicyService');

class QuotaExceededError extends Error {
    constructor(message, details = {}) {
        super(message);
        this.name = 'QuotaExceededError';
        this.statusCode = 429;
        this.details = details;
    }
}

function buildDailyWindowStart(referenceDate = new Date()) {
    const start = new Date(referenceDate);
    start.setHours(0, 0, 0, 0);
    return start.toISOString();
}

async function getSendPolicyStatus({ connectionId, userId, role }) {
    const windowStartedAt = buildDailyWindowStart();
    const [userCount, sessionCount] = await Promise.all([
        userId ? databaseService.countOutgoingMessages({ initiatedByUserId: userId, since: windowStartedAt }) : Promise.resolve(0),
        connectionId ? databaseService.countOutgoingMessages({ connectionId, since: windowStartedAt }) : Promise.resolve(0),
    ]);

    const userLimit = deliveryPolicyService.getRoleDailyLimit(role);
    const sessionLimit = deliveryPolicyService.getSessionDailyLimit();

    return {
        windowStartedAt,
        campaignRecipientLimit: deliveryPolicyService.getCampaignRecipientLimit(),
        userDaily: {
            limit: userLimit,
            sent: userCount,
            remaining: Math.max(userLimit - userCount, 0),
        },
        sessionDaily: {
            limit: sessionLimit,
            sent: sessionCount,
            remaining: Math.max(sessionLimit - sessionCount, 0),
        },
    };
}

function assertCampaignLimit(recipientCount) {
    const limit = deliveryPolicyService.getCampaignRecipientLimit();
    if (recipientCount > limit) {
        throw new QuotaExceededError(`Campaign exceeds the maximum of ${limit} recipients per request.`, {
            recipientCount,
            campaignRecipientLimit: limit,
        });
    }
}

async function assertCanDispatch({ connectionId, userId, role, requestedCount }) {
    const requested = Number.parseInt(requestedCount, 10);
    if (!Number.isFinite(requested) || requested <= 0) {
        return null;
    }

    const status = await getSendPolicyStatus({ connectionId, userId, role });

    if (userId && requested > status.userDaily.remaining) {
        throw new QuotaExceededError(
            `Daily sending limit reached for your role. Remaining quota today: ${status.userDaily.remaining}.`,
            {
                scope: 'user',
                requestedCount: requested,
                ...status.userDaily,
            }
        );
    }

    if (requested > status.sessionDaily.remaining) {
        throw new QuotaExceededError(
            `Session daily sending limit reached. Remaining quota for this session today: ${status.sessionDaily.remaining}.`,
            {
                scope: 'session',
                requestedCount: requested,
                ...status.sessionDaily,
            }
        );
    }

    return status;
}

function isQuotaExceededError(error) {
    return error instanceof QuotaExceededError || error?.name === 'QuotaExceededError' || error?.statusCode === 429;
}

module.exports = {
    QuotaExceededError,
    buildDailyWindowStart,
    getSendPolicyStatus,
    assertCampaignLimit,
    assertCanDispatch,
    isQuotaExceededError,
};
