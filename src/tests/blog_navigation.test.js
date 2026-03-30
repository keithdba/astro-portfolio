import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

describe('Recent Blog Navigation', () => {
  let dom;
  let document;

  beforeAll(() => {
    const htmlPath = path.resolve(process.cwd(), 'dist/index.html');
    if(!fs.existsSync(htmlPath)) {
      throw new Error(`File not found: ${htmlPath}. Ensure 'npm run build' is executed before tests.`);
    }
    const html = fs.readFileSync(htmlPath, 'utf-8');
    dom = new JSDOM(html);
    document = dom.window.document;
  });

  it('verifies there are exactly 3 blog entries', () => {
    const blogCards = document.querySelectorAll('.blog-card');
    expect(blogCards.length).toBe(3);
  });

  it('verifies the blog cards point to the correct sections in the professional portfolio', () => {
    const blogCards = Array.from(document.querySelectorAll('.blog-card'));
    
    const hrefs = blogCards.map(card => card.getAttribute('href'));
    
    expect(hrefs).toContain('/pro#architecture');
    expect(hrefs).toContain('/pro#process');
    expect(hrefs).toContain('/pro#projects');
  });

  it('verifies the blog cards contains an excerpt', () => {
    const excerpts = document.querySelectorAll('.blog-excerpt');
    expect(excerpts.length).toBe(3);
    
    excerpts.forEach(excerpt => {
      expect(excerpt.textContent.trim().length).toBeGreaterThan(20);
    });
  });

  it('verifies the tab activation logic is present in the professional portfolio', () => {
    const proHtmlPath = path.resolve(process.cwd(), 'dist/pro/index.html');
    const proHtml = fs.readFileSync(proHtmlPath, 'utf-8');
    
    // Check for core logic rather than specific function names due to minification
    expect(proHtml).toContain('hash');
    expect(proHtml).toContain('location.hash');
    expect(proHtml).toContain('hashchange');
    expect(proHtml).toContain('architecture');
    expect(proHtml).toContain('process');
    expect(proHtml).toContain('projects');
  });
});

