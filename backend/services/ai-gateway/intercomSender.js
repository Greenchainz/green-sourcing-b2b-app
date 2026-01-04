/**
 * AI Gateway - Intercom Sender Module
 * 
 * Handles AI-generated draft messages with gated sending:
 * - Premium only (Enterprise tier required)
 * - Legal Guardian approval required
 * - Opt-out checking before any send
 * 
 * The AI generates drafts; this module manages the approval and sending workflow.
 */

const { pool } = require('../../db');
const monitoring = require('../azure/monitoring');
const { client } = require('../intercom/index');
const { 
    getUserTier, 
    isLegalGuardian, 
    canSendIntercomMessages,
    TIER_FEATURES,
    TIER_LEVELS
} = require('./entitlements');

// ============================================
// MESSAGE TEMPLATES FOR AI DRAFTING
// ============================================

const DRAFT_TEMPLATES = {
    // RFQ-related templates
    rfq_new_opportunity: {
        name: 'New RFQ Opportunity',
        description: 'Notify supplier of a new RFQ matching their profile',
        requiredTier: 'enterprise',
        placeholders: ['supplierName', 'rfqTitle', 'projectLocation', 'deadline', 'estimatedValue']
    },
    rfq_follow_up: {
        name: 'RFQ Follow-up',
        description: 'Follow up on an RFQ that hasn\'t received a response',
        requiredTier: 'pro',
        placeholders: ['supplierName', 'rfqTitle', 'daysWaiting', 'deadline']
    },
    rfq_awarded: {
        name: 'RFQ Award Notification',
        description: 'Notify supplier they\'ve been awarded an RFQ',
        requiredTier: 'pro',
        placeholders: ['supplierName', 'rfqTitle', 'buyerName', 'nextSteps']
    },
    rfq_not_selected: {
        name: 'RFQ Not Selected',
        description: 'Professional notification that supplier was not selected',
        requiredTier: 'enterprise',
        placeholders: ['supplierName', 'rfqTitle', 'reason', 'encouragement']
    },
    
    // Claim and onboarding templates
    claim_profile: {
        name: 'Claim Your Profile',
        description: 'Invite shadow supplier to claim their profile',
        requiredTier: 'enterprise',
        placeholders: ['supplierName', 'companyName', 'claimUrl', 'benefits']
    },
    certification_expiring: {
        name: 'Certification Expiring',
        description: 'Remind supplier of expiring certification',
        requiredTier: 'pro',
        placeholders: ['supplierName', 'certificationName', 'expirationDate', 'renewalUrl']
    },
    welcome_new_supplier: {
        name: 'Welcome New Supplier',
        description: 'Welcome message for newly registered suppliers',
        requiredTier: 'enterprise',
        placeholders: ['supplierName', 'companyName', 'dashboardUrl', 'supportContact']
    },
    
    // Engagement templates
    reactivation: {
        name: 'Reactivation Outreach',
        description: 'Re-engage inactive suppliers',
        requiredTier: 'enterprise',
        placeholders: ['supplierName', 'lastActivity', 'newFeatures', 'incentive']
    },
    upsell_premium: {
        name: 'Upgrade to Premium',
        description: 'Suggest premium tier upgrade based on activity',
        requiredTier: 'enterprise',
        placeholders: ['supplierName', 'currentTier', 'benefits', 'upgradeUrl']
    }
};

/**
 * Get available templates for a user's tier
 */
function getAvailableTemplates(userTier) {
    const userLevel = TIER_LEVELS[userTier] || 1;
    const available = [];
    
    for (const [key, template] of Object.entries(DRAFT_TEMPLATES)) {
        const requiredLevel = TIER_LEVELS[template.requiredTier] || 1;
        if (userLevel >= requiredLevel) {
            available.push({
                id: key,
                ...template
            });
        }
    }
    
    return available;
}

// Message type configurations
const MESSAGE_CONFIGS = {
    single: {
        requiresApproval: true,
        maxLength: 2000,
        allowedTiers: ['enterprise', 'admin']
    },
    sequence: {
        requiresApproval: true,
        maxLength: 5000,
        allowedTiers: ['enterprise', 'admin']
    },
    campaign: {
        requiresApproval: true,
        maxLength: 10000,
        allowedTiers: ['admin']
    },
    onboarding: {
        requiresApproval: true,
        maxLength: 3000,
        allowedTiers: ['enterprise', 'admin']
    },
    rfq_follow_up: {
        requiresApproval: false, // Transactional
        maxLength: 2000,
        allowedTiers: ['pro', 'enterprise', 'admin']
    },
    certification_reminder: {
        requiresApproval: false, // Transactional
        maxLength: 1500,
        allowedTiers: ['pro', 'enterprise', 'admin']
    },
    upsell: {
        requiresApproval: true,
        maxLength: 2000,
        allowedTiers: ['enterprise', 'admin']
    },
    reactivation: {
        requiresApproval: true,
        maxLength: 2000,
        allowedTiers: ['enterprise', 'admin']
    }
};

// ============================================
// DRAFT MESSAGE GENERATION
// ============================================

/**
 * Draft a message for a supplier related to an RFQ
 * 
 * Premium tier-gated (Enterprise only for most templates)
 * Drafts are queued for review before sending
 * 
 * @param {number} supplierId - Target supplier user ID
 * @param {number} rfqId - Related RFQ ID (can be null for non-RFQ messages)
 * @param {string} template - Template ID from DRAFT_TEMPLATES
 * @param {Object} options - Additional options
 * @returns {Object} Draft object with status and content
 */
async function draftMessage(supplierId, rfqId, template, options = {}) {
    const {
        createdByUserId,
        customData = {},
        scheduledAt = null,
        priority = 'normal'
    } = options;

    if (!createdByUserId) {
        throw new Error('createdByUserId is required');
    }

    try {
        // 1. Check template exists
        const templateConfig = DRAFT_TEMPLATES[template];
        if (!templateConfig) {
            throw new Error(`Unknown template: ${template}. Available: ${Object.keys(DRAFT_TEMPLATES).join(', ')}`);
        }

        // 2. Check user tier (Premium gate)
        const userTier = await getUserTier(createdByUserId);
        const userLevel = TIER_LEVELS[userTier] || 1;
        const requiredLevel = TIER_LEVELS[templateConfig.requiredTier] || 1;

        if (userLevel < requiredLevel) {
            return {
                success: false,
                error: 'TIER_INSUFFICIENT',
                message: `Template '${template}' requires ${templateConfig.requiredTier} tier or higher`,
                requiredTier: templateConfig.requiredTier,
                currentTier: userTier
            };
        }

        // 3. Check if Premium tier can send (enterprise = Premium)
        if (!TIER_FEATURES[userTier]?.canSendIntercomDrafts && userTier !== 'admin') {
            return {
                success: false,
                error: 'SEND_NOT_ALLOWED',
                message: 'Your tier does not allow sending Intercom messages. Upgrade to Premium for this feature.',
                currentTier: userTier
            };
        }

        // 4. Get supplier and RFQ details for personalization
        const [supplierResult, rfqResult] = await Promise.all([
            pool.query(`
                SELECT u.UserID, u.Email, u.FirstName, u.LastName, 
                       s.CompanyName, s.Tier as SupplierTier
                FROM Users u
                LEFT JOIN Suppliers s ON u.UserID = s.UserID
                WHERE u.UserID = $1
            `, [supplierId]),
            rfqId ? pool.query(`
                SELECT r.RFQID, r.Title, r.Description, r.ProjectLocation,
                       r.Deadline, r.EstimatedValue, r.Status,
                       u.FirstName as BuyerFirstName, u.LastName as BuyerLastName
                FROM RFQs r
                LEFT JOIN Users u ON r.BuyerUserID = u.UserID
                WHERE r.RFQID = $1
            `, [rfqId]) : Promise.resolve({ rows: [] })
        ]);

        if (supplierResult.rows.length === 0) {
            throw new Error(`Supplier not found: ${supplierId}`);
        }

        const supplier = supplierResult.rows[0];
        const rfq = rfqResult.rows[0] || null;

        // 5. Check opt-out status
        const optOutStatus = await checkOptOut(supplierId, supplier.email);
        if (optOutStatus.optedOut || optOutStatus.optOutAIMessages) {
            return {
                success: false,
                error: 'OPTED_OUT',
                message: 'Supplier has opted out of AI-generated messages',
                supplierId
            };
        }

        // 6. Build personalization data
        const personalizationData = {
            supplierName: `${supplier.firstname || ''} ${supplier.lastname || ''}`.trim() || supplier.companyname || 'there',
            companyName: supplier.companyname || 'Your Company',
            supplierTier: supplier.suppliertier || 'free',
            ...(rfq && {
                rfqTitle: rfq.title,
                rfqDescription: rfq.description,
                projectLocation: rfq.projectlocation,
                deadline: rfq.deadline ? new Date(rfq.deadline).toLocaleDateString() : 'Not specified',
                estimatedValue: rfq.estimatedvalue ? `$${rfq.estimatedvalue.toLocaleString()}` : 'Not disclosed',
                buyerName: `${rfq.buyerfirstname || ''} ${rfq.buyerlastname || ''}`.trim() || 'the buyer'
            }),
            ...customData
        };

        // 7. Generate AI draft content using the outreach-draft workflow
        let draftContent;
        try {
            // Import agentGateway dynamically to avoid circular dependency
            const agentGateway = require('./agentGateway');
            
            const aiResult = await agentGateway.execute({
                workflowName: 'outreach-draft',
                input: {
                    template,
                    recipientContext: {
                        name: personalizationData.supplierName,
                        company: personalizationData.companyName,
                        tier: personalizationData.supplierTier
                    },
                    rfqContext: rfq ? {
                        title: rfq.title,
                        location: rfq.projectlocation,
                        deadline: personalizationData.deadline,
                        value: personalizationData.estimatedValue
                    } : null,
                    templateConfig: {
                        name: templateConfig.name,
                        description: templateConfig.description
                    },
                    customData
                },
                userId: createdByUserId,
                context: { source: 'draftMessage' }
            });

            draftContent = aiResult.data;
        } catch (aiError) {
            console.warn('AI draft generation failed, using template fallback:', aiError.message);
            
            // Fallback: Generate basic template content
            draftContent = generateFallbackDraft(template, personalizationData);
        }

        // 8. Create the draft in database (queued for review)
        const messageType = getMessageTypeFromTemplate(template);
        const requiresApproval = MESSAGE_CONFIGS[messageType]?.requiresApproval ?? true;

        const draft = await createDraft({
            workflowId: null, // Will be set when AI generates
            createdByUserId,
            targetUserId: supplierId,
            messageType,
            subject: draftContent.subject || templateConfig.name,
            body: draftContent.body || draftContent.message || JSON.stringify(draftContent),
            sequenceOrder: 1,
            sequenceTotal: 1,
            personalizationData: {
                ...personalizationData,
                template,
                rfqId,
                priority
            },
            scheduledAt
        });

        monitoring.trackEvent('IntercomDraft_Generated', {
            template,
            supplierId: String(supplierId),
            rfqId: rfqId ? String(rfqId) : 'none',
            userTier,
            requiresApproval: String(requiresApproval)
        });

        return {
            success: true,
            draft: {
                id: draft.draftid,
                status: draft.status,
                subject: draft.subject,
                body: draft.body,
                targetUserId: supplierId,
                rfqId,
                template,
                requiresApproval,
                scheduledAt: draft.scheduledat,
                createdAt: draft.createdat
            },
            message: requiresApproval 
                ? 'Draft created and queued for Legal Guardian approval'
                : 'Draft created and ready to send'
        };

    } catch (error) {
        console.error('Error drafting message:', error.message);
        monitoring.trackException(error, { 
            context: 'draftMessage', 
            template, 
            supplierId: String(supplierId) 
        });
        throw error;
    }
}

/**
 * Generate fallback draft when AI is unavailable
 */
function generateFallbackDraft(template, data) {
    const templates = {
        rfq_new_opportunity: {
            subject: `New RFQ Opportunity: ${data.rfqTitle || 'Project'}`,
            body: `Hi ${data.supplierName},\n\nWe have a new RFQ that matches your profile: "${data.rfqTitle || 'New Project'}".\n\nLocation: ${data.projectLocation || 'See details'}\nDeadline: ${data.deadline || 'See details'}\n\nLog in to your GreenChainz dashboard to view details and submit your quote.\n\nBest regards,\nThe GreenChainz Team`
        },
        rfq_follow_up: {
            subject: `Following up on: ${data.rfqTitle || 'RFQ'}`,
            body: `Hi ${data.supplierName},\n\nWe noticed you haven't responded to the RFQ "${data.rfqTitle || 'recent opportunity'}" yet.\n\nThe deadline is approaching${data.deadline ? ` on ${data.deadline}` : ''}. Don't miss this opportunity!\n\nBest regards,\nThe GreenChainz Team`
        },
        claim_profile: {
            subject: 'Claim Your GreenChainz Supplier Profile',
            body: `Hi ${data.supplierName},\n\nYour company "${data.companyName}" has been listed on GreenChainz! Claim your profile to:\n\n• Respond to RFQs directly\n• Showcase your sustainability certifications\n• Connect with architects and buyers\n\nVisit GreenChainz to get started.\n\nBest regards,\nThe GreenChainz Team`
        },
        default: {
            subject: 'Message from GreenChainz',
            body: `Hi ${data.supplierName},\n\nWe have an update for you on GreenChainz. Please log in to your dashboard for details.\n\nBest regards,\nThe GreenChainz Team`
        }
    };

    return templates[template] || templates.default;
}

/**
 * Map template to message type
 */
function getMessageTypeFromTemplate(template) {
    const mapping = {
        rfq_new_opportunity: 'rfq_follow_up',
        rfq_follow_up: 'rfq_follow_up',
        rfq_awarded: 'rfq_follow_up',
        rfq_not_selected: 'single',
        claim_profile: 'onboarding',
        certification_expiring: 'certification_reminder',
        welcome_new_supplier: 'onboarding',
        reactivation: 'reactivation',
        upsell_premium: 'upsell'
    };
    return mapping[template] || 'single';
}

/**
 * Get a draft by ID with full details
 */
async function getDraftById(draftId, userId) {
    try {
        const result = await pool.query(`
            SELECT d.*, 
                   u_target.Email as target_email,
                   u_target.FirstName as target_first_name,
                   u_target.LastName as target_last_name,
                   u_approver.Email as approver_email,
                   w.Name as workflow_name
            FROM Intercom_Drafts d
            LEFT JOIN Users u_target ON d.TargetUserID = u_target.UserID
            LEFT JOIN Users u_approver ON d.LegalApprovedByUserID = u_approver.UserID
            LEFT JOIN AI_Workflows w ON d.WorkflowID = w.WorkflowID
            WHERE d.DraftID = $1
        `, [draftId]);

        if (result.rows.length === 0) {
            return null;
        }

        const draft = result.rows[0];
        
        // Check access permission
        const userTier = await getUserTier(userId);
        const isCreator = draft.createdbyuserid === userId;
        const isGuardian = await isLegalGuardian(userId);
        const isAdmin = userTier === 'admin';

        if (!isCreator && !isGuardian && !isAdmin) {
            throw new Error('Access denied to this draft');
        }

        return draft;
    } catch (error) {
        console.error('Error getting draft:', error.message);
        throw error;
    }
}

/**
 * Check if target user has opted out of AI messages
 */
async function checkOptOut(userId, email = null) {
    try {
        let query = 'SELECT * FROM Intercom_Opt_Outs WHERE ';
        let params;

        if (userId) {
            query += 'UserID = $1';
            params = [userId];
        } else if (email) {
            query += 'Email = $1';
            params = [email];
        } else {
            return { optedOut: false };
        }

        const result = await pool.query(query, params);
        
        if (result.rows.length === 0) {
            return { optedOut: false };
        }

        const optOut = result.rows[0];
        return {
            optedOut: true,
            optOutMarketing: optOut.optoutmarketing,
            optOutTransactional: optOut.optouttransactional,
            optOutAIMessages: optOut.optoutaimessages,
            optOutAt: optOut.optoutat
        };
    } catch (error) {
        console.error('Error checking opt-out:', error.message);
        // Fail safe - assume not opted out but log the error
        monitoring.trackException(error, { context: 'checkOptOut' });
        return { optedOut: false, error: true };
    }
}

/**
 * Create a draft message (AI-generated content pending approval)
 */
async function createDraft({
    workflowId,
    createdByUserId,
    targetUserId,
    messageType,
    subject,
    body,
    sequenceOrder = 1,
    sequenceTotal = 1,
    personalizationData = null,
    scheduledAt = null
}) {
    try {
        // Validate message type
        const config = MESSAGE_CONFIGS[messageType];
        if (!config) {
            throw new Error(`Invalid message type: ${messageType}`);
        }

        // Check body length
        if (body && body.length > config.maxLength) {
            throw new Error(`Message body exceeds maximum length of ${config.maxLength} characters`);
        }

        // Check creator's tier
        const creatorTier = await getUserTier(createdByUserId);
        if (!config.allowedTiers.includes(creatorTier)) {
            throw new Error(`Tier ${creatorTier} is not allowed to create ${messageType} messages`);
        }

        // Check target opt-out status
        const optOutStatus = await checkOptOut(targetUserId);

        const result = await pool.query(`
            INSERT INTO Intercom_Drafts (
                WorkflowID, CreatedByUserID, TargetUserID,
                MessageType, Subject, Body,
                SequenceOrder, SequenceTotal, PersonalizationData,
                RequiresLegalApproval, OptOutChecked, TargetOptedOut,
                ScheduledAt, Status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *
        `, [
            workflowId, createdByUserId, targetUserId,
            messageType, subject, body,
            sequenceOrder, sequenceTotal, 
            personalizationData ? JSON.stringify(personalizationData) : null,
            config.requiresApproval,
            true, // We checked opt-out
            optOutStatus.optedOut || optOutStatus.optOutAIMessages,
            scheduledAt,
            optOutStatus.optedOut ? 'cancelled' : (config.requiresApproval ? 'draft' : 'pending_approval')
        ]);

        const draft = result.rows[0];

        monitoring.trackEvent('IntercomDraft_Created', {
            draftId: String(draft.draftid),
            messageType,
            creatorTier
        });

        // If transactional (no approval needed) and not opted out, auto-approve
        if (!config.requiresApproval && !optOutStatus.optedOut) {
            return await autoApproveDraft(draft.draftid, createdByUserId);
        }

        return draft;
    } catch (error) {
        console.error('Error creating draft:', error.message);
        monitoring.trackException(error, { context: 'createDraft' });
        throw error;
    }
}

/**
 * Auto-approve transactional messages
 */
async function autoApproveDraft(draftId, systemUserId) {
    try {
        const result = await pool.query(`
            UPDATE Intercom_Drafts 
            SET Status = 'approved',
                LegalApprovedByUserID = $2,
                LegalApprovedAt = NOW(),
                LegalApprovalNotes = 'Auto-approved: Transactional message',
                UpdatedAt = NOW()
            WHERE DraftID = $1
            RETURNING *
        `, [draftId, systemUserId]);

        return result.rows[0];
    } catch (error) {
        console.error('Error auto-approving draft:', error.message);
        throw error;
    }
}

/**
 * Submit draft for Legal Guardian approval
 */
async function submitForApproval(draftId, submittedByUserId) {
    try {
        // Verify the submitter has permission
        const tier = await getUserTier(submittedByUserId);
        const features = TIER_FEATURES[tier];

        if (!features.canSendIntercomDrafts) {
            throw new Error('Your tier does not allow submitting drafts for approval');
        }

        const result = await pool.query(`
            UPDATE Intercom_Drafts 
            SET Status = 'pending_approval', UpdatedAt = NOW()
            WHERE DraftID = $1 AND Status = 'draft'
            RETURNING *
        `, [draftId]);

        if (result.rows.length === 0) {
            throw new Error('Draft not found or already submitted');
        }

        monitoring.trackEvent('IntercomDraft_SubmittedForApproval', {
            draftId: String(draftId),
            submittedBy: String(submittedByUserId)
        });

        return result.rows[0];
    } catch (error) {
        console.error('Error submitting for approval:', error.message);
        throw error;
    }
}

/**
 * Approve a draft (Legal Guardian only)
 */
async function approveDraft(draftId, guardianUserId, notes = null) {
    try {
        // Verify guardian status
        const guardian = await isLegalGuardian(guardianUserId);
        if (!guardian) {
            throw new Error('User is not a Legal Guardian');
        }

        // Check daily approval limit
        const today = new Date().toISOString().split('T')[0];
        if (guardian.lastapprovalreset !== today) {
            await pool.query(`
                UPDATE AI_Legal_Guardians 
                SET ApprovalsToday = 0, LastApprovalReset = $1
                WHERE UserID = $2
            `, [today, guardianUserId]);
            guardian.approvalstoday = 0;
        }

        if (guardian.approvalstoday >= guardian.maxdailyapprovals) {
            throw new Error('Daily approval limit reached');
        }

        // Get the draft
        const draftResult = await pool.query(
            'SELECT * FROM Intercom_Drafts WHERE DraftID = $1',
            [draftId]
        );

        if (draftResult.rows.length === 0) {
            throw new Error('Draft not found');
        }

        const draft = draftResult.rows[0];

        if (draft.status !== 'pending_approval') {
            throw new Error(`Cannot approve draft with status: ${draft.status}`);
        }

        if (draft.targetoptedout) {
            throw new Error('Cannot approve: Target user has opted out');
        }

        // Update draft status
        const result = await pool.query(`
            UPDATE Intercom_Drafts 
            SET Status = 'approved',
                LegalApprovedByUserID = $2,
                LegalApprovedAt = NOW(),
                LegalApprovalNotes = $3,
                UpdatedAt = NOW()
            WHERE DraftID = $1
            RETURNING *
        `, [draftId, guardianUserId, notes]);

        // Update guardian's approval count
        await pool.query(`
            UPDATE AI_Legal_Guardians 
            SET ApprovalsToday = ApprovalsToday + 1, UpdatedAt = NOW()
            WHERE UserID = $1
        `, [guardianUserId]);

        monitoring.trackEvent('IntercomDraft_Approved', {
            draftId: String(draftId),
            guardianId: String(guardianUserId)
        });

        return result.rows[0];
    } catch (error) {
        console.error('Error approving draft:', error.message);
        throw error;
    }
}

/**
 * Reject a draft (Legal Guardian only)
 */
async function rejectDraft(draftId, guardianUserId, reason) {
    try {
        const guardian = await isLegalGuardian(guardianUserId);
        if (!guardian) {
            throw new Error('User is not a Legal Guardian');
        }

        const result = await pool.query(`
            UPDATE Intercom_Drafts 
            SET Status = 'rejected',
                LegalApprovedByUserID = $2,
                LegalApprovedAt = NOW(),
                LegalApprovalNotes = $3,
                UpdatedAt = NOW()
            WHERE DraftID = $1 AND Status = 'pending_approval'
            RETURNING *
        `, [draftId, guardianUserId, reason]);

        if (result.rows.length === 0) {
            throw new Error('Draft not found or not pending approval');
        }

        monitoring.trackEvent('IntercomDraft_Rejected', {
            draftId: String(draftId),
            guardianId: String(guardianUserId)
        });

        return result.rows[0];
    } catch (error) {
        console.error('Error rejecting draft:', error.message);
        throw error;
    }
}

/**
 * Send an approved draft via Intercom
 * This is the actual send operation - called after approval
 */
async function sendDraft(draftId) {
    try {
        // Get the draft
        const draftResult = await pool.query(
            'SELECT d.*, u.Email as target_email FROM Intercom_Drafts d LEFT JOIN Users u ON d.TargetUserID = u.UserID WHERE d.DraftID = $1',
            [draftId]
        );

        if (draftResult.rows.length === 0) {
            throw new Error('Draft not found');
        }

        const draft = draftResult.rows[0];

        // Validate status
        if (draft.status !== 'approved' && draft.status !== 'scheduled') {
            throw new Error(`Cannot send draft with status: ${draft.status}`);
        }

        // Check scheduled time
        if (draft.scheduledat && new Date(draft.scheduledat) > new Date()) {
            throw new Error('Draft is scheduled for future sending');
        }

        // Re-check opt-out before sending
        const optOutStatus = await checkOptOut(draft.targetuserid);
        if (optOutStatus.optedOut || optOutStatus.optOutAIMessages) {
            await pool.query(`
                UPDATE Intercom_Drafts 
                SET Status = 'cancelled', 
                    TargetOptedOut = TRUE,
                    LastError = 'Target opted out before send',
                    UpdatedAt = NOW()
                WHERE DraftID = $1
            `, [draftId]);
            throw new Error('Cannot send: Target has opted out');
        }

        // Increment send attempts
        await pool.query(`
            UPDATE Intercom_Drafts 
            SET SendAttempts = SendAttempts + 1, UpdatedAt = NOW()
            WHERE DraftID = $1
        `, [draftId]);

        // Send via Intercom API
        try {
            // Get admin ID for sending
            const adminResponse = await client.admins.list();
            const adminId = adminResponse.admins?.[0]?.id;

            if (!adminId) {
                throw new Error('No Intercom admin available');
            }

            const messageData = {
                message_type: 'inapp',
                body: draft.body,
                from: { type: 'admin', id: adminId },
                to: { type: 'user', user_id: String(draft.targetuserid) }
            };

            const intercomResult = await client.messages.create(messageData);

            // Update draft as sent
            await pool.query(`
                UPDATE Intercom_Drafts 
                SET Status = 'sent',
                    SentAt = NOW(),
                    IntercomMessageID = $2,
                    UpdatedAt = NOW()
                WHERE DraftID = $1
            `, [draftId, intercomResult.id]);

            monitoring.trackEvent('IntercomDraft_Sent', {
                draftId: String(draftId),
                messageType: draft.messagetype,
                intercomMessageId: intercomResult.id
            });

            return { success: true, intercomMessageId: intercomResult.id };
        } catch (sendError) {
            // Update with error
            await pool.query(`
                UPDATE Intercom_Drafts 
                SET Status = CASE WHEN SendAttempts >= 3 THEN 'failed' ELSE Status END,
                    LastError = $2,
                    UpdatedAt = NOW()
                WHERE DraftID = $1
            `, [draftId, sendError.message]);

            throw sendError;
        }
    } catch (error) {
        console.error('Error sending draft:', error.message);
        monitoring.trackException(error, { context: 'sendDraft', draftId: String(draftId) });
        throw error;
    }
}

/**
 * Get drafts pending approval (for Legal Guardians)
 */
async function getPendingApprovals(guardianUserId) {
    try {
        const guardian = await isLegalGuardian(guardianUserId);
        if (!guardian) {
            throw new Error('User is not a Legal Guardian');
        }

        const result = await pool.query(`
            SELECT d.*, 
                   u_creator.Email as creator_email,
                   u_target.Email as target_email,
                   w.Name as workflow_name
            FROM Intercom_Drafts d
            LEFT JOIN Users u_creator ON d.CreatedByUserID = u_creator.UserID
            LEFT JOIN Users u_target ON d.TargetUserID = u_target.UserID
            LEFT JOIN AI_Workflows w ON d.WorkflowID = w.WorkflowID
            WHERE d.Status = 'pending_approval'
            ORDER BY d.CreatedAt ASC
        `);

        return result.rows;
    } catch (error) {
        console.error('Error getting pending approvals:', error.message);
        throw error;
    }
}

/**
 * Get draft history for a user
 */
async function getDraftHistory(userId, { limit = 50, offset = 0, status } = {}) {
    try {
        let query = `
            SELECT d.*, 
                   u_target.Email as target_email,
                   u_approver.Email as approver_email,
                   w.Name as workflow_name
            FROM Intercom_Drafts d
            LEFT JOIN Users u_target ON d.TargetUserID = u_target.UserID
            LEFT JOIN Users u_approver ON d.LegalApprovedByUserID = u_approver.UserID
            LEFT JOIN AI_Workflows w ON d.WorkflowID = w.WorkflowID
            WHERE d.CreatedByUserID = $1
        `;
        const params = [userId];
        let paramIndex = 2;

        if (status) {
            query += ` AND d.Status = $${paramIndex++}`;
            params.push(status);
        }

        query += ` ORDER BY d.CreatedAt DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        return result.rows;
    } catch (error) {
        console.error('Error getting draft history:', error.message);
        return [];
    }
}

/**
 * Register opt-out for a user
 */
async function registerOptOut(userId, email, reason, source = 'user_request') {
    try {
        await pool.query(`
            INSERT INTO Intercom_Opt_Outs (UserID, Email, OptOutReason, OptOutSource)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (UserID) DO UPDATE 
            SET OptOutReason = $3, OptOutSource = $4, OptOutAt = NOW()
        `, [userId, email, reason, source]);

        // Cancel any pending drafts for this user
        await pool.query(`
            UPDATE Intercom_Drafts 
            SET Status = 'cancelled', 
                TargetOptedOut = TRUE,
                LastError = 'User opted out',
                UpdatedAt = NOW()
            WHERE TargetUserID = $1 AND Status IN ('draft', 'pending_approval', 'approved', 'scheduled')
        `, [userId]);

        monitoring.trackEvent('IntercomOptOut_Registered', {
            userId: String(userId),
            source
        });

        return true;
    } catch (error) {
        console.error('Error registering opt-out:', error.message);
        throw error;
    }
}

/**
 * Process scheduled drafts (called by scheduler)
 */
async function processScheduledDrafts() {
    try {
        const result = await pool.query(`
            SELECT DraftID FROM Intercom_Drafts 
            WHERE Status IN ('approved', 'scheduled') 
            AND (ScheduledAt IS NULL OR ScheduledAt <= NOW())
            LIMIT 10
        `);

        const results = [];
        for (const row of result.rows) {
            try {
                const sendResult = await sendDraft(row.draftid);
                results.push({ draftId: row.draftid, success: true, ...sendResult });
            } catch (error) {
                results.push({ draftId: row.draftid, success: false, error: error.message });
            }
        }

        return results;
    } catch (error) {
        console.error('Error processing scheduled drafts:', error.message);
        return [];
    }
}

module.exports = {
    // Configuration
    MESSAGE_CONFIGS,
    DRAFT_TEMPLATES,
    
    // Template helpers
    getAvailableTemplates,
    
    // Draft message generation (Premium tier-gated)
    draftMessage,
    getDraftById,
    
    // Opt-out management
    checkOptOut,
    registerOptOut,
    
    // Draft lifecycle
    createDraft,
    submitForApproval,
    approveDraft,
    rejectDraft,
    sendDraft,
    
    // Queries
    getPendingApprovals,
    getDraftHistory,
    
    // Scheduler
    processScheduledDrafts
};
