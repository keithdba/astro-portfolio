import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

describe('Garage Navigation & Content', () => {
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
    // Note: This test requires 'npm run build' to have been executed.
    const html = getPageHtml('auto/index.html');
    dom = new JSDOM(html);
    document = dom.window.document;
  });

  it('verifies there are exactly 2 category cards in the garage', () => {
    const cards = document.querySelectorAll('.car-card');
    expect(cards.length).toBe(2);
  });

  it('verifies the Project Vehicles card links to the correct sub-section', () => {
    const projectLink = Array.from(document.querySelectorAll('.car-card'))
      .find(a => a.textContent.includes('Project Vehicles'));
    
    expect(projectLink).not.toBeUndefined();
    expect(projectLink.getAttribute('href')).toBe('/auto/project-vehicles');
  });



  it('verifies the Product Reviews card links to the new products placeholder', () => {
    const productsLink = Array.from(document.querySelectorAll('.car-card'))
      .find(a => a.textContent.includes('Product Reviews'));
    
    expect(productsLink).not.toBeUndefined();
    expect(productsLink.getAttribute('href')).toBe('/auto/products');
  });

  it('verifies the placeholder Product Reviews page exists and has the correct status', () => {
    const productsHtml = getPageHtml('auto/products/index.html');
    const productsDom = new JSDOM(productsHtml);
    const productsDoc = productsDom.window.document;
    
    // Check for "Product Reviews" title or h1
    const title = productsDoc.querySelector('.mech-title');
    expect(title).not.toBeNull();
    expect(title.textContent.trim()).toBe('Product Reviews');

    const statusText = productsDoc.querySelector('.status-heading');
    expect(statusText).not.toBeNull();
    expect(statusText.textContent.trim()).toContain('IN_PROGRESS');
  });
});
