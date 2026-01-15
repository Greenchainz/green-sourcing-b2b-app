// Lightweight stub for Intercom draft handling to unblock service startup.
// Replace with real implementation when available.

const DRAFT_TEMPLATES = {
    default: {
        id: 'default',
        name: 'Default Outreach',
        description: 'Generic outreach draft',
    },
};

function getAvailableTemplates(_userTier = 'standard') {
    return Object.values(DRAFT_TEMPLATES);
}

async function draftMessage({ templateId = 'default', variables = {} } = {}) {
    const tpl = DRAFT_TEMPLATES[templateId] || DRAFT_TEMPLATES.default;
    return {
        templateId: tpl.id,
        subject: tpl.name,
        body: `Draft message generated with variables: ${JSON.stringify(variables)}`,
    };
}

async function createDraft({ userId, templateId = 'default', variables = {} }) {
    return {
        id: `draft-${Date.now()}`,
        userId,
        templateId,
        variables,
        status: 'draft',
    };
}

async function submitForApproval(draftId, approverId) {
    return { id: draftId, approverId, status: 'pending_approval' };
}

async function getPendingApprovals(_userId) {
    return [];
}

async function approveDraft(draftId, approverId) {
    return { id: draftId, approverId, status: 'approved' };
}

async function rejectDraft(draftId, approverId, reason = 'Rejected') {
    return { id: draftId, approverId, status: 'rejected', reason };
}

async function sendDraft(draftId, senderId) {
    return { id: draftId, senderId, status: 'sent' };
}

async function getDraftHistory(_userId, _opts = {}) {
    return [];
}

async function registerOptOut(userId, reason = 'User opted out') {
    return { userId, reason, status: 'opted_out' };
}

async function processScheduledDrafts() {
    return [];
}

module.exports = {
    DRAFT_TEMPLATES,
    getAvailableTemplates,
    draftMessage,
    createDraft,
    submitForApproval,
    getPendingApprovals,
    approveDraft,
    rejectDraft,
    sendDraft,
    getDraftHistory,
    registerOptOut,
    processScheduledDrafts,
};
