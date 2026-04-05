import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Contact form schema
const contactFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email'),
  subject: z.string().min(1, 'Subject is required').max(200),
  message: z.string().min(10, 'Message too short').max(5000)
});

describe('Contact Form Validation', () => {
  it('should validate correct form data', () => {
    const validData = {
      name: 'John Doe',
      email: 'john@example.com',
      subject: 'Inquiry',
      message: 'This is a test message with sufficient length.'
    };
    
    expect(() => contactFormSchema.parse(validData)).not.toThrow();
  });

  it('should reject empty name', () => {
    const invalidData = {
      name: '',
      email: 'john@example.com',
      subject: 'Inquiry',
      message: 'This is a test message with sufficient length.'
    };
    
    expect(() => contactFormSchema.parse(invalidData)).toThrow();
  });

  it('should reject invalid email format', () => {
    const invalidData = {
      name: 'John Doe',
      email: 'not-an-email',
      subject: 'Inquiry',
      message: 'This is a test message with sufficient length.'
    };
    
    expect(() => contactFormSchema.parse(invalidData)).toThrow();
  });

  it('should reject message shorter than 10 characters', () => {
    const invalidData = {
      name: 'John Doe',
      email: 'john@example.com',
      subject: 'Inquiry',
      message: 'Short'
    };
    
    expect(() => contactFormSchema.parse(invalidData)).toThrow();
  });

  it('should accept minimum valid message length', () => {
    const validData = {
      name: 'John',
      email: 'test@test.com',
      subject: 'Hi',
      message: '0123456789'
    };
    
    expect(() => contactFormSchema.parse(validData)).not.toThrow();
  });

  it('should handle various valid email formats', () => {
    const emails = [
      'user@example.com',
      'user.name@example.co.uk',
      'user+tag@example.com'
    ];

    emails.forEach(email => {
      expect(() => 
        contactFormSchema.parse({
          name: 'Test',
          email,
          subject: 'Test',
          message: 'Valid message content here'
        })
      ).not.toThrow();
    });
  });
});
