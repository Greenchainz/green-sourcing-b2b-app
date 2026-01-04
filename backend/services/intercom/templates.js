/**
 * Intercom Message Templates
 * 
 * Templates for transactional messages sent via Intercom:
 * - new_rfq: Notify supplier of new RFQ opportunity
 * - claim_prompt: Prompt shadow supplier to claim their profile
 * - quote_received: Notify architect when a quote is submitted
 * - deposit_verified: Confirm deposit verification to buyer
 * 
 * Each template returns { subject, body, cta_url }
 * 
 * @module services/intercom/templates
 */

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://app.sustainablesupply.co';

/**
 * Template for new RFQ notification to verified suppliers
 * Sent when an RFQ is distributed to a supplier's wave
 * 
 * @param {object} data - Template data
 * @param {string} data.rfqId - RFQ UUID
 * @param {string} data.projectName - Name of the project
 * @param {string} data.category - Material category
 * @param {string} data.quantity - Requested quantity
 * @param {string} data.location - Project location
 * @param {number} data.waveNumber - Wave number (1-3)
 * @param {string} data.expiresAt - Expiration timestamp
 * @returns {{ subject: string, body: string, cta_url: string }}
 */
function newRfqTemplate(data) {
    const { 
        rfqId, 
        projectName, 
        category, 
        quantity, 
        location,
        waveNumber,
        expiresAt
    } = data;

    const waveLabel = {
        1: 'Premium Priority',
        2: 'Standard Access',
        3: 'Open Access'
    }[waveNumber] || 'Open Access';

    const expiryText = expiresAt 
        ? `Respond by ${new Date(expiresAt).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          })}`
        : 'Respond soon for best consideration';

    const subject = `🌿 New RFQ: ${projectName || 'Sustainable Materials Request'}`;

    const body = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <p style="color: #065f46; font-size: 14px; margin-bottom: 8px;">
        <strong>${waveLabel}</strong> • ${expiryText}
    </p>
    
    <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 18px;">
        You've received a new RFQ!
    </h2>
    
    <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <p style="margin: 0 0 8px 0;"><strong>Project:</strong> ${projectName || 'Untitled Project'}</p>
        ${category ? `<p style="margin: 0 0 8px 0;"><strong>Category:</strong> ${category}</p>` : ''}
        ${quantity ? `<p style="margin: 0 0 8px 0;"><strong>Quantity:</strong> ${quantity}</p>` : ''}
        ${location ? `<p style="margin: 0;"><strong>Location:</strong> ${location}</p>` : ''}
    </div>
    
    <p style="color: #6b7280; font-size: 13px;">
        Submit your quote to be considered for this sustainable building project.
    </p>
</div>
    `.trim();

    const cta_url = `${FRONTEND_URL}/supplier/rfqs/${rfqId}`;

    return { subject, body, cta_url };
}

/**
 * Template for claim prompt to shadow suppliers
 * Sent when a shadow supplier matches an RFQ but hasn't claimed their profile
 * 
 * @param {object} data - Template data
 * @param {string} data.shadowSupplierId - Shadow supplier UUID
 * @param {string} data.rfqId - RFQ UUID (for tracking, not revealed)
 * @param {string} data.companyName - Company name from scraped data
 * @param {string} data.category - Material category they're matched for
 * @param {string} data.claimToken - Claim token for verification
 * @param {number} data.matchedRfqCount - Number of RFQs they're missing
 * @returns {{ subject: string, body: string, cta_url: string }}
 */
function claimPromptTemplate(data) {
    const {
        shadowSupplierId,
        companyName,
        category,
        claimToken,
        matchedRfqCount = 1
    } = data;

    const rfqText = matchedRfqCount === 1 
        ? 'an RFQ opportunity' 
        : `${matchedRfqCount} RFQ opportunities`;

    const subject = `🔓 ${companyName || 'Your company'} is missing ${rfqText}`;

    const body = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 18px;">
        Architects are looking for sustainable ${category || 'materials'} suppliers
    </h2>
    
    <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 16px; border-left: 4px solid #f59e0b;">
        <p style="margin: 0; color: #92400e;">
            <strong>${companyName || 'Your company'}</strong> has been matched to ${rfqText}, 
            but you need to claim your profile to receive the details.
        </p>
    </div>
    
    <p style="margin-bottom: 16px;">
        Your products appear in our sustainable materials database. Claim your profile to:
    </p>
    
    <ul style="color: #374151; margin-bottom: 16px; padding-left: 20px;">
        <li>Receive RFQ details and respond to opportunities</li>
        <li>Showcase your sustainability certifications (EPDs, FSC, etc.)</li>
        <li>Connect with architects seeking sustainable suppliers</li>
        <li>Manage your company's sustainability data</li>
    </ul>
    
    <p style="color: #6b7280; font-size: 13px;">
        Takes less than 5 minutes. Free to claim.
    </p>
</div>
    `.trim();

    const cta_url = claimToken 
        ? `${FRONTEND_URL}/claim/${shadowSupplierId}?token=${claimToken}`
        : `${FRONTEND_URL}/claim/${shadowSupplierId}`;

    return { subject, body, cta_url };
}

/**
 * Template for quote received notification to architects
 * Sent when a supplier submits a quote for an architect's RFQ
 * 
 * @param {object} data - Template data
 * @param {string} data.rfqId - RFQ UUID
 * @param {string} data.projectName - Name of the project
 * @param {string} data.supplierName - Name of the supplier
 * @param {string} data.supplierTier - Supplier tier (for badge display)
 * @param {string} data.priceRange - Price range or indication
 * @param {number} data.leadTime - Lead time in days
 * @param {number} data.sustainabilityScore - Supplier's sustainability score
 * @param {number} data.totalQuotes - Total quotes received for this RFQ
 * @returns {{ subject: string, body: string, cta_url: string }}
 */
function quoteReceivedTemplate(data) {
    const {
        rfqId,
        projectName,
        supplierName,
        supplierTier,
        priceRange,
        leadTime,
        sustainabilityScore,
        totalQuotes = 1
    } = data;

    const tierBadge = {
        premium: '⭐ Premium Supplier',
        enterprise: '⭐ Premium Supplier',
        standard: '✓ Verified Supplier',
        pro: '✓ Verified Supplier',
        claimed: 'Supplier',
        free: 'Supplier'
    }[supplierTier?.toLowerCase()] || 'Supplier';

    const scoreDisplay = sustainabilityScore 
        ? `Sustainability Score: ${sustainabilityScore}/100`
        : '';

    const subject = `📋 New quote received for ${projectName || 'your RFQ'}`;

    const body = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <p style="color: #065f46; font-size: 14px; margin-bottom: 8px;">
        ${totalQuotes > 1 ? `Quote ${totalQuotes} received` : 'First quote received!'} • ${tierBadge}
    </p>
    
    <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 18px;">
        ${supplierName || 'A supplier'} has submitted a quote
    </h2>
    
    <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <p style="margin: 0 0 8px 0;"><strong>Project:</strong> ${projectName || 'Your RFQ'}</p>
        ${priceRange ? `<p style="margin: 0 0 8px 0;"><strong>Price:</strong> ${priceRange}</p>` : ''}
        ${leadTime ? `<p style="margin: 0 0 8px 0;"><strong>Lead Time:</strong> ${leadTime} days</p>` : ''}
        ${scoreDisplay ? `<p style="margin: 0;"><strong>${scoreDisplay}</strong></p>` : ''}
    </div>
    
    <p style="color: #6b7280; font-size: 13px;">
        Review the full quote details and compare with other submissions.
    </p>
</div>
    `.trim();

    const cta_url = `${FRONTEND_URL}/buyer/rfqs/${rfqId}/quotes`;

    return { subject, body, cta_url };
}

/**
 * Template for deposit verification confirmation
 * Sent to buyer when their deposit is verified
 * 
 * @param {object} data - Template data
 * @param {string} data.buyerId - Buyer UUID
 * @param {string} data.buyerName - Buyer's name
 * @param {string} data.amount - Deposit amount
 * @param {string} data.currency - Currency code
 * @param {boolean} data.linkedInVerified - Whether LinkedIn is also verified
 * @param {number} data.pendingRfqs - Number of RFQs waiting for verification
 * @returns {{ subject: string, body: string, cta_url: string }}
 */
function depositVerifiedTemplate(data) {
    const {
        buyerName,
        amount,
        currency = 'USD',
        linkedInVerified = false,
        pendingRfqs = 0
    } = data;

    const amountDisplay = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(parseFloat(amount) || 0);

    const statusMessage = linkedInVerified
        ? '✅ You\'re fully verified and can now submit RFQs to suppliers!'
        : '⚠️ Complete LinkedIn verification to start sending RFQs to suppliers.';

    const rfqMessage = pendingRfqs > 0
        ? `${pendingRfqs} RFQ${pendingRfqs > 1 ? 's are' : ' is'} ready to be distributed once you complete verification.`
        : '';

    const subject = `✅ Deposit verified: ${amountDisplay}`;

    const body = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 18px;">
        Hi ${buyerName || 'there'}, your deposit has been verified!
    </h2>
    
    <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; margin-bottom: 16px; border-left: 4px solid #10b981;">
        <p style="margin: 0 0 8px 0; font-size: 24px; color: #065f46;">
            <strong>${amountDisplay}</strong>
        </p>
        <p style="margin: 0; color: #047857;">
            Deposit confirmed and credited to your account
        </p>
    </div>
    
    <p style="margin-bottom: 16px;">
        ${statusMessage}
    </p>
    
    ${rfqMessage ? `
    <div style="background: #fef3c7; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
        <p style="margin: 0; color: #92400e; font-size: 13px;">
            ${rfqMessage}
        </p>
    </div>
    ` : ''}
    
    <p style="color: #6b7280; font-size: 13px;">
        Questions about your deposit? Reply to this message or contact support.
    </p>
</div>
    `.trim();

    const cta_url = linkedInVerified 
        ? `${FRONTEND_URL}/buyer/rfqs/new`
        : `${FRONTEND_URL}/buyer/verify`;

    return { subject, body, cta_url };
}

/**
 * Get template by name
 * @param {string} templateName - Template identifier
 * @param {object} data - Template data
 * @returns {{ subject: string, body: string, cta_url: string } | null}
 */
function getTemplate(templateName, data) {
    const templates = {
        new_rfq: newRfqTemplate,
        claim_prompt: claimPromptTemplate,
        quote_received: quoteReceivedTemplate,
        deposit_verified: depositVerifiedTemplate
    };

    const templateFn = templates[templateName];
    if (!templateFn) {
        console.warn(`Unknown template: ${templateName}`);
        return null;
    }

    return templateFn(data);
}

/**
 * Available template names
 */
const TEMPLATE_NAMES = {
    NEW_RFQ: 'new_rfq',
    CLAIM_PROMPT: 'claim_prompt',
    QUOTE_RECEIVED: 'quote_received',
    DEPOSIT_VERIFIED: 'deposit_verified'
};

module.exports = {
    getTemplate,
    newRfqTemplate,
    claimPromptTemplate,
    quoteReceivedTemplate,
    depositVerifiedTemplate,
    TEMPLATE_NAMES,
    FRONTEND_URL
};
