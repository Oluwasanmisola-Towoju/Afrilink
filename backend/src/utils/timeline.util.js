/**
 * src/utils/timeline.util.js
 *
 * Single source of truth for the Transaction Workspace's horizontal
 * timeline: which status can move to which, and which side of the deal
 * (buyer / seller / admin / system) is allowed to trigger the move.
 *
 * Keeping this as a declarative map (rather than scattering `if` checks
 * across controllers) means the frontend timeline component and the
 * backend enforce exactly the same graph, and adding a step later is a
 * one-line change here.
 */

const TRANSITIONS = {
    CREATED: {
        ACCEPTED: ['seller'],
        REJECTED: ['seller'],
        CANCELLED: ['buyer'],
    },
    ACCEPTED: {
        PAYMENT_SECURED: ['buyer'], // buyer funds the escrow/payment partner
        DISPUTED: ['buyer', 'seller'],
        CANCELLED: ['buyer', 'seller'],
    },
    PAYMENT_SECURED: {
        SHIPPED: ['seller'],
        DISPUTED: ['buyer', 'seller'],
    },
    SHIPPED: {
        IN_TRANSIT: ['seller'],
        DISPUTED: ['buyer', 'seller'],
    },
    IN_TRANSIT: {
        DELIVERED: ['buyer'], // buyer confirms receipt
        DISPUTED: ['buyer', 'seller'],
    },
    DELIVERED: {
        PAYMENT_RELEASED: ['admin', 'system'], // escrow partner / admin releases funds
        DISPUTED: ['buyer', 'seller'],
    },
    PAYMENT_RELEASED: {
        COMPLETED: ['system'],
    },
    DISPUTED: {
        PAYMENT_RELEASED: ['admin'], // dispute resolved in seller's favour
        REJECTED: ['admin'], // reused as "resolved: refund path" terminal marker is CANCELLED below
        CANCELLED: ['admin'], // dispute resolved in buyer's favour (refund) -> transaction cancelled
    },
    REJECTED: {},
    CANCELLED: {},
    COMPLETED: {},
};

/**
 * @param {string} fromStatus current TransactionStatus
 * @param {string} toStatus   desired TransactionStatus
 * @param {string} actorRole  'buyer' | 'seller' | 'admin' | 'system'
 * @returns {{ allowed: boolean, reason?: string }}
 */
function canTransition(fromStatus, toStatus, actorRole) {
    const edges = TRANSITIONS[fromStatus];
    if (!edges) {
        return { allowed: false, reason: `Unknown current status "${fromStatus}".` };
    }
    const allowedRoles = edges[toStatus];
    if (!allowedRoles) {
        return {
            allowed: false,
            reason: `Cannot move a transaction from "${fromStatus}" to "${toStatus}".`,
        };
    }
    if (!allowedRoles.includes(actorRole)) {
        return {
            allowed: false,
            reason: `Only ${allowedRoles.join('/')} can move a transaction from "${fromStatus}" to "${toStatus}".`,
        };
    }
    return { allowed: true };
}

/** Ordered happy-path used to render the horizontal progress bar. */
const HAPPY_PATH = [
    'CREATED',
    'ACCEPTED',
    'PAYMENT_SECURED',
    'SHIPPED',
    'IN_TRANSIT',
    'DELIVERED',
    'PAYMENT_RELEASED',
    'COMPLETED',
];

module.exports = { canTransition, TRANSITIONS, HAPPY_PATH };
