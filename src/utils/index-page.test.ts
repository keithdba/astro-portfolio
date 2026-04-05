import { describe, it, expect } from 'vitest';

interface BlogEntry {
  id: string;
  title: string;
  date: string;
  excerpt: string;
}

function createBlogEntries(
  arcTitle?: string,
  procTitle?: string,
  uiuxTitle?: string
): BlogEntry[] {
  return [
    {
      id: 'architecture',
      title: arcTitle || 'System Architecture',
      date: 'Mar 28, 2026',
      excerpt: 'A full-stack AI-native architecture designed to minimize the distance between human intent and functional reality.'
    },
    {
      id: 'process',
      title: procTitle || 'Process Architecture',
      date: 'Mar 25, 2026',
      excerpt: 'Human-directed, agentic, AI-native delivery model.'
    },
    {
      id: 'projects',
      title: uiuxTitle || 'Vibe Coding Projects',
      date: 'Mar 20, 2026',
      excerpt: 'Early experiments in AI-native workflows.'
    }
  ];
}

describe('Index Page Blog Entries', () => {
  it('should create three default blog entries', () => {
    const entries = createBlogEntries();
    expect(entries).toHaveLength(3);
  });

  it('should have correct IDs', () => {
    const entries = createBlogEntries();
    expect(entries.map(e => e.id)).toEqual(['architecture', 'process', 'projects']);
  });

  it('should have correct default titles', () => {
    const entries = createBlogEntries();
    expect(entries[0].title).toBe('System Architecture');
    expect(entries[1].title).toBe('Process Architecture');
    expect(entries[2].title).toBe('Vibe Coding Projects');
  });

  it('should use custom titles when provided', () => {
    const entries = createBlogEntries(
      'Custom Architecture',
      'Custom Process',
      'Custom Projects'
    );
    
    expect(entries[0].title).toBe('Custom Architecture');
    expect(entries[1].title).toBe('Custom Process');
    expect(entries[2].title).toBe('Custom Projects');
  });

  it('should maintain data consistency', () => {
    const entries1 = createBlogEntries();
    const entries2 = createBlogEntries();

    expect(entries1.map(e => e.id)).toEqual(entries2.map(e => e.id));
    expect(entries1.map(e => e.date)).toEqual(entries2.map(e => e.date));
  });

  it('should never have empty titles or excerpts', () => {
    const entries = createBlogEntries();
    entries.forEach(entry => {
      expect(entry.title).toBeTruthy();
      expect(entry.excerpt).toBeTruthy();
    });
  });
});
