import sgMail from '@sendgrid/mail';
import { Booking } from '@shared/schema';

// Initialize SendGrid with API Key
if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY.startsWith('SG.')) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn('SendGrid API key is missing or invalid. Notification features will not work.');
}

// Main notification function that determines which method to use based on preference and availability
export async function sendBookingNotification(booking: Booking, user: any): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_API_KEY.startsWith('SG.')) {
    console.warn('SendGrid API key not configured or invalid. Notification not sent.');
    return false;
  }

  try {
    // If user has mobile number and prefers SMS
    if (user.phoneNumber && user.notificationPreference === 'sms') {
      return await sendSMSNotification(booking, user);
    } else {
      // Default to email notification
      return await sendEmailNotification(booking, user);
    }
  } catch (error) {
    console.error('Failed to send notification:', error);
    return false;
  }
}

// Email notification using SendGrid
async function sendEmailNotification(booking: Booking, user: any): Promise<boolean> {
  try {
    const bookingType = booking.bookingType === 'emergency' ? 'Emergency' : 'Scheduled';
    const msg = {
      to: user.email,
      from: 'notifications@medirush.com', // Verified sender in SendGrid
      subject: `Your ${bookingType} Ambulance Booking Confirmation`,
      text: getPlainTextEmailContent(booking, user),
      html: getHtmlEmailContent(booking, user),
    };

    await sgMail.send(msg);
    console.log(`Email notification sent to ${user.email}`);
    return true;
  } catch (error) {
    console.error('Error sending email notification:', error);
    return false;
  }
}

// SMS notification through SendGrid's partner service
async function sendSMSNotification(booking: Booking, user: any): Promise<boolean> {
  try {
    // SendGrid doesn't directly support SMS, but we can use their email to SMS gateway
    // This would typically involve a different setup with Twilio or another SMS provider
    // For now, we'll use email as a fallback 
    console.log('SMS notification requested but not available. Sending email instead.');
    return await sendEmailNotification(booking, user);
  } catch (error) {
    console.error('Error sending SMS notification:', error);
    return false;
  }
}

// Plain text version for email
function getPlainTextEmailContent(booking: Booking, user: any): string {
  const bookingType = booking.bookingType === 'emergency' ? 'Emergency' : 'Scheduled';
  const bookingTime = booking.scheduledTime 
    ? new Date(booking.scheduledTime).toLocaleString() 
    : 'Immediate';
  
  return `
    MediRush - ${bookingType} Ambulance Booking Confirmation
    
    Hello ${user.firstName},
    
    Your ${bookingType.toLowerCase()} ambulance booking has been confirmed.
    
    Booking Details:
    - Booking ID: ${booking.id}
    - Status: ${booking.status}
    - Pickup Location: ${booking.pickupAddress}
    - ${booking.scheduledTime ? `Scheduled Time: ${bookingTime}` : 'Immediate dispatch'}
    
    You can track your ambulance in real-time by visiting our website or mobile app.
    
    For emergency assistance, please call: 911
    
    Thank you for choosing MediRush.
    This is an automated message, please do not reply.
  `;
}

// HTML version for email
function getHtmlEmailContent(booking: Booking, user: any): string {
  const bookingType = booking.bookingType === 'emergency' ? 'Emergency' : 'Scheduled';
  const bookingTime = booking.scheduledTime 
    ? new Date(booking.scheduledTime).toLocaleString() 
    : 'Immediate';
  const statusColor = booking.status === 'confirmed' ? '#4CAF50' : '#FF9800';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>MediRush Booking Confirmation</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #f44336;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 5px 5px 0 0;
        }
        .content {
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 0 0 5px 5px;
        }
        .booking-details {
          background-color: #f9f9f9;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .status {
          display: inline-block;
          padding: 5px 10px;
          border-radius: 3px;
          color: white;
          background-color: ${statusColor};
        }
        .footer {
          font-size: 12px;
          color: #777;
          margin-top: 30px;
          text-align: center;
          border-top: 1px solid #eee;
          padding-top: 15px;
        }
        .tracking-button {
          display: block;
          width: 200px;
          margin: 20px auto;
          padding: 10px;
          background-color: #4CAF50;
          color: white;
          text-align: center;
          text-decoration: none;
          border-radius: 5px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>MediRush</h1>
        <h2>${bookingType} Ambulance Booking Confirmation</h2>
      </div>
      <div class="content">
        <p>Hello ${user.firstName},</p>
        
        <p>Your ${bookingType.toLowerCase()} ambulance booking has been confirmed.</p>
        
        <div class="booking-details">
          <h3>Booking Details</h3>
          <p><strong>Booking ID:</strong> ${booking.id}</p>
          <p><strong>Status:</strong> <span class="status">${booking.status}</span></p>
          <p><strong>Pickup Location:</strong> ${booking.pickupAddress}</p>
          <p><strong>Time:</strong> ${bookingTime}</p>
        </div>
        
        <a href="https://medirush.com/tracking/${booking.id}" class="tracking-button">Track Your Ambulance</a>
        
        <p>For emergency assistance, please call: <strong>911</strong></p>
        
        <p>Thank you for choosing MediRush.</p>
        
        <div class="footer">
          <p>This is an automated message, please do not reply.</p>
          <p>© ${new Date().getFullYear()} MediRush. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}