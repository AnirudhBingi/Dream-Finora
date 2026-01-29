import { Injectable, Logger } from '@nestjs/common';
import sgMail from '@sendgrid/mail';
import twilio from 'twilio';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private sendGridEnabled = false;
  private twilioEnabled = false;
  private twilioClient: twilio.Twilio | null = null;

  constructor() {
    // Initialize SendGrid if API key is provided
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      this.sendGridEnabled = true;
      this.logger.log('SendGrid email service enabled');
    } else {
      this.logger.warn(
        'SendGrid API key not found. Email sending will be logged to console only.',
      );
    }

    // Initialize Twilio if credentials are provided
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN,
      );
      this.twilioEnabled = true;
      this.logger.log('Twilio SMS service enabled');
    } else {
      this.logger.warn(
        'Twilio credentials not found. SMS sending will be logged to console only.',
      );
    }
  }
  /**
   * Send email invitation to join the app
   */
  async sendAppInvitation(
    email: string,
    inviterName: string,
    invitationToken: string,
  ): Promise<void> {
    // TODO: Implement email sending
    // This would integrate with services like:
    // - SendGrid
    // - AWS SES
    // - Mailgun
    // - Nodemailer with SMTP

    const inviteLink = `${process.env.FRONTEND_URL || 'https://dreamfinora.com'}/register?invite=${invitationToken}`;

    const subject = `${inviterName} invited you to join Dream Finora`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563EB;">You've been invited to join Dream Finora!</h2>
        <p>${inviterName} invited you to join Dream Finora, a platform for managing expenses, chores, and shared living.</p>
        <div style="margin: 30px 0;">
          <a href="${inviteLink}" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Click here to join</a>
        </div>
        <p style="color: #6B7280; font-size: 14px;">Or copy this link: <a href="${inviteLink}">${inviteLink}</a></p>
        <p style="color: #6B7280; font-size: 12px; margin-top: 30px;">This invitation expires in 7 days.</p>
      </div>
    `;

    await this.sendEmail(email, subject, html);
  }

  /**
   * Send group invitation email
   */
  async sendGroupInvitation(
    email: string,
    inviterName: string,
    groupName: string,
    groupInvitationToken: string,
    appInvitationToken?: string,
  ): Promise<void> {
    const groupInviteLink = `${process.env.FRONTEND_URL || 'https://dreamfinora.com'}/invite/group/${groupInvitationToken}`;
    const registerLink = appInvitationToken
      ? `${process.env.FRONTEND_URL || 'https://dreamfinora.com'}/register?invite=${appInvitationToken}`
      : null;

    const subject = `${inviterName} invited you to join "${groupName}" on Dream Finora`;

    let html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563EB;">You've been invited to join a circle!</h2>
        <p>${inviterName} invited you to join "<strong>${groupName}</strong>" on Dream Finora.</p>
    `;

    if (registerLink) {
      html += `
        <p>You're not registered yet. Join Dream Finora and automatically become part of this circle!</p>
        <div style="margin: 30px 0;">
          <a href="${registerLink}" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Join Dream Finora</a>
        </div>
        <p style="color: #6B7280; font-size: 14px;">Or copy this link: <a href="${registerLink}">${registerLink}</a></p>
      `;
    } else {
      html += `
        <div style="margin: 30px 0;">
          <a href="${groupInviteLink}" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Accept Invitation</a>
        </div>
        <p style="color: #6B7280; font-size: 14px;">Or copy this link: <a href="${groupInviteLink}">${groupInviteLink}</a></p>
      `;
    }

    html += `
        <p style="color: #6B7280; font-size: 12px; margin-top: 30px;">This invitation expires in 7 days.</p>
      </div>
    `;

    await this.sendEmail(email, subject, html);
  }

  /**
   * Send SMS invitation (for mobile numbers)
   */
  async sendSMSInvitation(
    mobileNumber: string,
    inviterName: string,
    invitationToken: string,
    isGroupInvitation: boolean = false,
    groupName?: string,
  ): Promise<void> {
    const inviteLink = isGroupInvitation
      ? `${process.env.FRONTEND_URL || 'https://dreamfinora.com'}/invite/group/${invitationToken}`
      : `${process.env.FRONTEND_URL || 'https://dreamfinora.com'}/register?invite=${invitationToken}`;

    const message = isGroupInvitation
      ? `${inviterName} invited you to join "${groupName}" on Dream Finora. Join: ${inviteLink}`
      : `${inviterName} invited you to join Dream Finora. Join: ${inviteLink}`;

    await this.sendSMS(mobileNumber, message);
  }

  /**
   * Private method to actually send email
   */
  private async sendEmail(
    to: string,
    subject: string,
    html: string,
  ): Promise<void> {
    const fromEmail =
      process.env.SENDGRID_FROM_EMAIL ||
      process.env.FROM_EMAIL ||
      'noreply@dreamfinora.com';

    if (this.sendGridEnabled) {
      try {
        const msg = {
          to,
          from: fromEmail,
          subject,
          html,
        };

        await sgMail.send(msg);
        this.logger.log(`Email sent successfully to ${to}`);
      } catch (error) {
        this.logger.error(`Failed to send email to ${to}:`, error);
        // Fall through to console logging
        this.logEmailToConsole(to, subject, html);
      }
    } else {
      // Fallback to console logging if SendGrid is not configured
      this.logEmailToConsole(to, subject, html);
    }
  }

  /**
   * Log email to console (fallback when SendGrid is not configured)
   */
  private logEmailToConsole(to: string, subject: string, html: string): void {
    this.logger.log('='.repeat(60));
    this.logger.log('📧 EMAIL (SendGrid not configured - logging to console)');
    this.logger.log(`To: ${to}`);
    this.logger.log(`Subject: ${subject}`);
    this.logger.log(
      `HTML: ${html.replace(/<[^>]*>/g, '').substring(0, 200)}...`,
    );
    this.logger.log('='.repeat(60));
  }

  /**
   * Private method to actually send SMS
   */
  private async sendSMS(to: string, message: string): Promise<void> {
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (this.twilioEnabled && fromNumber) {
      try {
        // Ensure phone number is in E.164 format (starts with +)
        const formattedTo = to.startsWith('+') ? to : `+${to}`;

        const result = await this.twilioClient!.messages.create({
          body: message,
          from: fromNumber,
          to: formattedTo,
        });

        this.logger.log(
          `SMS sent successfully to ${formattedTo} (SID: ${result.sid})`,
        );
      } catch (error) {
        this.logger.error(`Failed to send SMS to ${to}:`, error);
        // Fall through to console logging
        this.logSMSToConsole(to, message);
      }
    } else {
      // Fallback to console logging if Twilio is not configured
      this.logSMSToConsole(to, message);
    }
  }

  /**
   * Log SMS to console (fallback when Twilio is not configured)
   */
  private logSMSToConsole(to: string, message: string): void {
    this.logger.log('='.repeat(60));
    this.logger.log('📱 SMS (Twilio not configured - logging to console)');
    this.logger.log(`To: ${to}`);
    this.logger.log(`Message: ${message}`);
    this.logger.log('='.repeat(60));
  }
}
