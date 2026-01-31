const { Resend } = require('resend');
const { getEmailTemplate } = require('../utils/emailTemplates');

/**
 * Centralized Email Service for Groona
 * Handles all email sending with a unified template system using Resend SDK
 */

let resendClient = null;

/**
 * Initialize Resend client
 */
function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    return null; // Email not configured
  }

  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }

  return resendClient;
}

/**
 * Get sender information from MAIL_FROM env variable
 */
function getSenderInfo() {
  // MAIL_FROM should be in format: "Groona <no-reply@quantumisecode.com>"
  return process.env.MAIL_FROM || 'Groona <no-reply@quantumisecode.com>';
}

/**
 * Send email using centralized template system
 * @param {Object} options - Email options
 * @param {string|Array} options.to - Recipient email(s)
 * @param {string} options.templateType - Type of email template (e.g., 'project_member_added', 'task_assigned', etc.)
 * @param {Object} options.data - Dynamic data for the template
 * @param {string} [options.subject] - Custom subject (optional, will use template default if not provided)
 * @returns {Promise<Object>} Email send result
 */
async function sendEmail({ to, templateType, data, subject }) {
  const resend = getResendClient();
  
  if (!resend) {
    console.log('[Email Service] Mock Email:', { to, templateType, subject });
    return { success: true, mock: true };
  }

  try {
    // Get template HTML and default subject
    const { html, defaultSubject } = getEmailTemplate(templateType, data);
    
    // Use custom subject if provided, otherwise use template default
    const emailSubject = subject || defaultSubject;

    // Ensure 'to' is an array
    const recipients = Array.isArray(to) ? to : [to];

    // Send email using Resend SDK
    const result = await resend.emails.send({
      from: getSenderInfo(),
      to: recipients,
      subject: emailSubject,
      html: html
    });

    console.log('[Email Service] Email sent successfully:', {
      to: recipients,
      templateType,
      messageId: result.data?.id
    });

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error('[Email Service] Error sending email:', error);
    throw error;
  }
}

/**
 * Send email to team members and admins
 * @param {Object} options - Email options
 * @param {Array} options.teamMembers - Array of team member emails
 * @param {Array} options.admins - Array of admin emails
 * @param {string} options.templateType - Type of email template
 * @param {Object} options.data - Dynamic data for the template
 * @param {string} [options.subject] - Custom subject
 */
async function sendEmailToTeamAndAdmins({ teamMembers = [], admins = [], templateType, data, subject }) {
  const allRecipients = [...new Set([...teamMembers, ...admins])]; // Remove duplicates
  
  if (allRecipients.length === 0) {
    console.log('[Email Service] No recipients to send email to');
    return { success: true, skipped: true };
  }

  return sendEmail({
    to: allRecipients,
    templateType,
    data,
    subject
  });
}

module.exports = {
  sendEmail,
  sendEmailToTeamAndAdmins,
  getResendClient,
  getSenderInfo
};
