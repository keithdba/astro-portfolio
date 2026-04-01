import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

describe('Recent Blog Navigation', () => {
  let dom;
  let document;

  const getPageHtml = (relativePath) => {
    const paths = [
      path.resolve(process.cwd(), 'dist', relativePath),
      path.resolve(process.cwd(), 'dist/client', relativePath)
    ];
    for (const p of paths) {
      if (fs.existsSync(p)) return fs.readFileSync(p, 'utf-8');
    }
    throw new Error(`File not found: ${relativePath}. Checked: ${paths.join(', ')}`);
  };

  beforeAll(() => {
    const html = getPageHtml('index.html');
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
    const proHtml = getPageHtml('pro/index.html');
    
    // Check for core logic rather than specific function names due to minification
    expect(proHtml).toContain('hash');
    expect(proHtml).toContain('location.hash');
    expect(proHtml).toContain('hashchange');
    expect(proHtml).toContain('architecture');
    expect(proHtml).toContain('process');
    expect(proHtml).toContain('projects');
  });
});

