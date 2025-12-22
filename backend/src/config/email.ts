import nodemailer from 'nodemailer'

// Create reusable transporter
export const createEmailTransporter = () => {
  // For development, use ethereal email (fake SMTP)
  // For production, use your actual SMTP credentials (Gmail, SendGrid, etc.)
  
  if (process.env.NODE_ENV === 'production') {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  }
  
  // For development - using Gmail (you need to enable "Less secure apps" or use App Password)
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'your-email@gmail.com',
      pass: process.env.EMAIL_PASS || 'your-app-password',
    },
  })
}

// Email configuration
export const emailConfig = {
  from: process.env.EMAIL_FROM || 'Fleet Management <noreply@fleetmanagement.com>',
}
