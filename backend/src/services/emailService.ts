import { createEmailTransporter, emailConfig } from '../config/email'
import nodemailer from 'nodemailer'

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export const sendEmail = async (options: EmailOptions) => {
  try {
    const transporter = createEmailTransporter()
    
    const mailOptions = {
      from: emailConfig.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    }

    const info = await transporter.sendMail(mailOptions)
    console.log('✉️  Email sent:', info.messageId)
    
    // For development with ethereal
    if (process.env.NODE_ENV === 'development') {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info))
    }
    
    return { success: true, messageId: info.messageId }
  } catch (error: any) {
    console.error('❌ Error sending email:', error.message)
    return { success: false, error: error.message }
  }
}

// Booking Confirmation Email
export const sendBookingConfirmationEmail = async (booking: any, customer: any, vehicle: any) => {
  const subject = 'Booking Confirmation - Your Vehicle is Reserved!'
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
        .detail-label { font-weight: bold; color: #555; }
        .detail-value { color: #333; }
        .highlight { background: #667eea; color: white; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Booking Confirmed!</h1>
          <p>Your vehicle reservation is confirmed</p>
        </div>
        <div class="content">
          <p>Hi ${customer.profile?.firstName || 'Valued Customer'},</p>
          <p>Great news! Your booking has been confirmed. Here are your reservation details:</p>
          
          <div class="booking-details">
            <h3 style="margin-top: 0; color: #667eea;">Vehicle Details</h3>
            <div class="detail-row">
              <span class="detail-label">Vehicle:</span>
              <span class="detail-value">${vehicle.year} ${vehicle.make} ${vehicle.modelName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">License Plate:</span>
              <span class="detail-value">${vehicle.licensePlate}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Type:</span>
              <span class="detail-value">${vehicle.type.toUpperCase()}</span>
            </div>
          </div>

          <div class="booking-details">
            <h3 style="margin-top: 0; color: #667eea;">Booking Information</h3>
            <div class="detail-row">
              <span class="detail-label">Booking ID:</span>
              <span class="detail-value">#${booking._id.toString().slice(-8).toUpperCase()}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Pickup Date:</span>
              <span class="detail-value">${new Date(booking.scheduledDate.start).toLocaleString()}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Return Date:</span>
              <span class="detail-value">${new Date(booking.scheduledDate.end).toLocaleString()}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Pickup Location:</span>
              <span class="detail-value">${booking.pickupLocation.address}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Status:</span>
              <span class="detail-value" style="color: #10b981; font-weight: bold;">✓ ${booking.status.toUpperCase()}</span>
            </div>
          </div>

          <div class="highlight">
            <h2 style="margin: 0;">Total Amount: $${booking.pricing.totalAmount.toFixed(2)}</h2>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Payment Status: ${booking.payment.status}</p>
          </div>

          <p><strong>What's Next?</strong></p>
          <ul>
            <li>A driver will be assigned to your booking soon</li>
            <li>You'll receive updates via email and SMS</li>
            <li>Make sure to be at the pickup location on time</li>
          </ul>

          <div style="text-align: center;">
            <a href="${(process.env.FRONTEND_URL || '')}/dashboard/customer/bookings/${booking._id}" class="button">View Booking Details</a>
          </div>

          <p>If you have any questions, please don't hesitate to contact our support team.</p>
          
          <p>Safe travels!<br>The Fleet Management Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
          <p>&copy; 2025 Fleet Management System. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmail({
    to: customer.email,
    subject,
    html,
  })
}

// Trip Completion Email
export const sendTripCompletionEmail = async (booking: any, customer: any, vehicle: any, trip?: any) => {
  const subject = 'Trip Completed - Thank You for Your Business!'
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .trip-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
        .detail-label { font-weight: bold; color: #555; }
        .detail-value { color: #333; }
        .success-badge { background: #10b981; color: white; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
        .button { display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Trip Completed Successfully!</h1>
          <p>Thank you for choosing our service</p>
        </div>
        <div class="content">
          <p>Hi ${customer.profile?.firstName || 'Valued Customer'},</p>
          <p>Your trip has been completed successfully. We hope you had a great experience!</p>
          
          <div class="success-badge">
            <h2 style="margin: 0;">🎊 Trip Completed</h2>
            <p style="margin: 5px 0 0 0;">Your journey is complete</p>
          </div>

          <div class="trip-details">
            <h3 style="margin-top: 0; color: #10b981;">Trip Summary</h3>
            <div class="detail-row">
              <span class="detail-label">Booking ID:</span>
              <span class="detail-value">#${booking._id.toString().slice(-8).toUpperCase()}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Vehicle:</span>
              <span class="detail-value">${vehicle.year} ${vehicle.make} ${vehicle.modelName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Trip Duration:</span>
              <span class="detail-value">${new Date(booking.scheduledDate.start).toLocaleDateString()} - ${new Date(booking.scheduledDate.end).toLocaleDateString()}</span>
            </div>
            ${trip?.distance ? `
            <div class="detail-row">
              <span class="detail-label">Distance Covered:</span>
              <span class="detail-value">${trip.distance} km</span>
            </div>
            ` : ''}
            <div class="detail-row">
              <span class="detail-label">Total Amount:</span>
              <span class="detail-value" style="color: #10b981; font-weight: bold;">$${booking.pricing.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <p><strong>We'd love to hear from you!</strong></p>
          <p>Your feedback helps us improve our service. Please take a moment to rate your experience.</p>

          <div style="text-align: center;">
            <a href="${(process.env.FRONTEND_URL || '')}/dashboard/customer/bookings/${booking._id}" class="button">View Receipt & Rate Service</a>
          </div>

          <p>Thank you for choosing our fleet management service. We look forward to serving you again!</p>
          
          <p>Safe travels!<br>The Fleet Management Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
          <p>&copy; 2025 Fleet Management System. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmail({
    to: customer.email,
    subject,
    html,
  })
}

// Trip Cancellation Email
export const sendTripCancellationEmail = async (booking: any, customer: any, vehicle: any, cancelReason?: string) => {
  const subject = 'Booking Cancelled - Confirmation'
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .cancel-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
        .detail-label { font-weight: bold; color: #555; }
        .detail-value { color: #333; }
        .warning-box { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>❌ Booking Cancelled</h1>
          <p>Your reservation has been cancelled</p>
        </div>
        <div class="content">
          <p>Hi ${customer.profile?.firstName || 'Valued Customer'},</p>
          <p>This email confirms that your booking has been cancelled.</p>
          
          <div class="cancel-details">
            <h3 style="margin-top: 0; color: #ef4444;">Cancelled Booking Details</h3>
            <div class="detail-row">
              <span class="detail-label">Booking ID:</span>
              <span class="detail-value">#${booking._id.toString().slice(-8).toUpperCase()}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Vehicle:</span>
              <span class="detail-value">${vehicle.year} ${vehicle.make} ${vehicle.modelName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Scheduled Pickup:</span>
              <span class="detail-value">${new Date(booking.scheduledDate.start).toLocaleString()}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Cancelled On:</span>
              <span class="detail-value">${new Date(booking.cancelledAt || Date.now()).toLocaleString()}</span>
            </div>
            ${cancelReason ? `
            <div class="detail-row">
              <span class="detail-label">Reason:</span>
              <span class="detail-value">${cancelReason}</span>
            </div>
            ` : ''}
          </div>

          <div class="warning-box">
            <p style="margin: 0; color: #991b1b;"><strong>💰 Refund Information:</strong></p>
            <p style="margin: 5px 0 0 0;">If you've already made a payment, the refund will be processed within 5-7 business days to your original payment method.</p>
          </div>

          <p><strong>Need Help?</strong></p>
          <p>If you cancelled by mistake or have any questions, please contact our support team immediately.</p>

          <div style="text-align: center;">
            <a href="${(process.env.FRONTEND_URL || '')}/dashboard/customer/vehicles" class="button">Browse Available Vehicles</a>
          </div>

          <p>We hope to serve you again in the future!</p>
          
          <p>Best regards,<br>The Fleet Management Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
          <p>&copy; 2025 Fleet Management System. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmail({
    to: customer.email,
    subject,
    html,
  })
}
