
const missedRfqTemplate = (data) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  <h2 style="color: #d9534f;">You missed ${data.rfqCount} RFQs worth $${data.totalValue.toLocaleString()} this week</h2>
  <p>Hi,</p>
  <p>We noticed that you have missed out on several Request for Quotes (RFQs) that matched your profile in the last 7 days.</p>

  <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
    <h3 style="margin-top: 0;">Missed Opportunities Summary:</h3>
    <ul style="list-style-type: none; padding: 0;">
      <li><strong>Total RFQs:</strong> ${data.rfqCount}</li>
      <li><strong>Estimated Value:</strong> $${data.totalValue.toLocaleString()}</li>
      <li><strong>Categories:</strong> ${data.categories.join(', ')}</li>
    </ul>
  </div>

  <p>These projects are looking for suppliers like you right now. Don't let your competitors take all the business.</p>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${data.claimUrl}" style="background-color: #2d6a4f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Claim Your Profile to View RFQs</a>
  </div>

  <p>Claiming your profile allows you to:</p>
  <ul>
    <li>Receive real-time RFQ alerts</li>
    <li>Respond directly to buyers</li>
    <li>Showcase your verified certifications</li>
  </ul>

  <p>Best regards,<br>The GreenChainz Team</p>
</div>
`;

const claimProfileTemplate = (data) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  <h2 style="color: #2d6a4f;">Welcome to GreenChainz!</h2>
  <p>Hi ${data.companyName || 'Supplier'},</p>
  <p>Your profile has been matched with active buyers looking for sustainable materials.</p>

  <p>To access your dashboard and start responding to leads, please confirm your account by clicking the button below:</p>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${data.claimUrl}" style="background-color: #2d6a4f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Claim My Profile</a>
  </div>

  <p>This link will expire in 48 hours.</p>

  <p>Best regards,<br>The GreenChainz Team</p>
</div>
`;

const upgradePromptTemplate = (data) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  <h2 style="color: #f0ad4e;">Unlock Full Access to GreenChainz</h2>
  <p>Hi ${data.companyName},</p>
  <p>You've seen the opportunities available on GreenChainz. Now it's time to take full advantage.</p>

  <p>Upgrade to a Premium plan to:</p>
  <ul>
    <li>See full buyer contact details</li>
    <li>Get priority listing in search results</li>
    <li>Access advanced analytics</li>
  </ul>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${data.upgradeUrl}" style="background-color: #0275d8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Upgrade Now</a>
  </div>

  <p>Best regards,<br>The GreenChainz Team</p>
</div>
`;

const weeklyDigestTemplate = (data) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  <h2 style="color: #2d6a4f;">Your Weekly GreenChainz Digest</h2>
  <p>Hi ${data.companyName},</p>
  <p>Here's a summary of activity in your category this week:</p>

  <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
    <ul style="list-style-type: none; padding: 0;">
      <li><strong>New RFQs:</strong> ${data.newRfqs}</li>
      <li><strong>Profile Views:</strong> ${data.profileViews}</li>
      <li><strong>Missed Opportunities:</strong> ${data.missedOpportunities}</li>
    </ul>
  </div>

  <p>Log in to your dashboard to stay ahead.</p>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${data.dashboardUrl}" style="background-color: #2d6a4f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Go to Dashboard</a>
  </div>

  <p>Best regards,<br>The GreenChainz Team</p>
</div>
`;

module.exports = {
  missedRfqTemplate,
  claimProfileTemplate,
  upgradePromptTemplate,
  weeklyDigestTemplate
};
