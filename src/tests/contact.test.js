import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

describe('Contact Modal Functionality & Integration', () => {
  let dom;
  let document;

  beforeAll(() => {
    // Tests evaluate purely against the statistically generated HTML map of index.html
    const htmlPath = path.resolve(process.cwd(), 'dist/index.html');
    if(!fs.existsSync(htmlPath)) {
      throw new Error(`File not found: ${htmlPath}. Ensure 'npm run build' is executed before tests.`);
    }

    const html = fs.readFileSync(htmlPath, 'utf-8');
    
    // Mount the JSDOM
    dom = new JSDOM(html, { runScripts: "dangerously" });
    document = dom.window.document;
  });

  it('verifies the redundant Contact links have been thoroughly removed', () => {
    const contactLinks = Array.from(document.querySelectorAll('.page-nav a'))
      .filter(a => a.textContent.trim().toLowerCase() === 'contact');
    
    expect(contactLinks.length).toBe(0);
  });

  it('ensures the Get In Touch interactive button is hooked into the structural DOM', () => {
    const btn = document.getElementById('contactModalBtn');
    
    expect(btn).not.toBeNull();
    expect(btn.tagName.toLowerCase()).toBe('button');
    expect(btn.textContent.trim()).toBe('Get In Touch');
  });

  it('successfully locates a native <dialog> architecture mapped with correct semantics', () => {
    const dialog = document.getElementById('contactModal');
    
    expect(dialog).not.toBeNull();
    expect(dialog.tagName.toLowerCase()).toBe('dialog');
  });

  it('guarantees the strict inclusion of all modal form parameters targeting Keit\\\'s internal secure email workflow', () => {
    const form = document.getElementById('contactForm');
    
    // Strict schema requirement validation
    expect(form).not.toBeNull();
    expect(form.getAttribute('action')).toBe('mailto:keith@macdaly.com');
    expect(form.getAttribute('method')).toBe('GET');
    expect(form.getAttribute('enctype')).toBe('text/plain');
    
    // Assert required children presence
    expect(form.querySelector('input[name="name"]')).not.toBeNull();
    expect(form.querySelector('input[name="email"]')).not.toBeNull();
    expect(form.querySelector('textarea[name="body"]')).not.toBeNull();
    expect(form.querySelector('button[type="submit"]')).not.toBeNull();
  });
});
