import type { APIRoute } from 'astro';
export const prerender = true;
import nodemailer from 'nodemailer';
import { z } from 'zod';
import dotenv from 'dotenv';
import fs from 'fs';

// Attempt to load from the specific GoDaddy path if it exists
const GODADDY_ENV_PATH = '/home/rsa1bm8j8le5/.env';
if (fs.existsSync(GODADDY_ENV_PATH)) {
  dotenv.config({ path: GODADDY_ENV_PATH });
} else {
  // Fallback for local development or other environments
  dotenv.config();
}

// Define the schema for input validation
const contactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  message: z.string().min(1, 'Message is required'),
  // Hidden honeypot field to catch automated bots
  website: z.string().optional(),
});

export const POST: APIRoute = async ({ request }: { request: Request }) => {
  try {
    const data = await request.json();
    const { name, email, message, website } = data; // Honeypot included

    // 1. Basic Zod validation
    const result = contactSchema.safeParse({ name, email, message, website });
    
    if (!result.success) {
      return new Response(
        JSON.stringify({
          message: 'Validation failed',
          errors: result.error.issues,
        }),
        { status: 400 }
      );
    }

    const validatedData = result.data;

    // 2. Honeypot check: If the hidden 'website' field is filled, it's likely a bot.
    if (validatedData.website) {
      console.warn('Honeypot triggered by bot submission.');
      // Return a 200 to trick the bot into thinking it succeeded
      return new Response(
        JSON.stringify({ message: 'Success (Honeypot triggered)' }),
        { status: 200 }
      );
    }

    // 3. Configure SMTP transporter
    // IMPORTANT: SMTP_USER and SMTP_PASSWORD must be set in your environment (e.g., Vercel dashboard)
    const transporter = nodemailer.createTransport({
      host: 'smtp.office365.com',
      port: 587,
      secure: false, // STARTTLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false, // Sometimes needed for Office 365, though not ideal for security. 
      }
    });

    // 4. Construct the email
    const mailOptions = {
      from: `"MacDaly Contact" <${process.env.SMTP_USER}>`, // Matches authenticated user to prevent SendAsDenied
      to: 'keith@macdaly.com',
      replyTo: validatedData.email,
      subject: `New Contact Form Submission from ${validatedData.name}`,
      text: `
Name: ${validatedData.name}
Email: ${validatedData.email}
Message: ${validatedData.message}

---
Timestamp: ${new Date().toISOString()}
      `.trim(),
    };

    // 5. Send email
    await transporter.sendMail(mailOptions);

    return new Response(
      JSON.stringify({ message: 'Thanks, your message has been sent.' }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Contact form error:', error);
    return new Response(
      JSON.stringify({
        message: 'There was an error sending your message. Please try again.',
      }),
      { status: 500 }
    );
  }
};
