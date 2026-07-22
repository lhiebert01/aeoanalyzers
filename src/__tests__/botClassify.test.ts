import { describe, it, expect } from 'vitest';
import { classifyUserAgent, TIER_DEFINITIONS, REGISTRY_VERSION } from '../lib/botClassify';

describe('botClassify (WO-3)', () => {
  it('classifies Live bots (human asked, engine fetched now)', () => {
    expect(classifyUserAgent('Mozilla/5.0 ChatGPT-User/1.0')?.tier).toBe('live');
    expect(classifyUserAgent('Claude-User/1.0')?.tier).toBe('live');
    expect(classifyUserAgent('Perplexity-User/1.0')?.tier).toBe('live');
  });

  it('classifies Search / indexing bots', () => {
    expect(classifyUserAgent('OAI-SearchBot/1.0')?.tier).toBe('search');
    expect(classifyUserAgent('Mozilla/5.0 (compatible; PerplexityBot/1.0)')?.tier).toBe('search');
    expect(classifyUserAgent('Mozilla/5.0 (compatible; bingbot/2.0)')?.tier).toBe('search');
  });

  it('classifies Training / ingestion bots', () => {
    expect(classifyUserAgent('GPTBot/1.1')?.tier).toBe('training');
    expect(classifyUserAgent('ClaudeBot/1.0')?.tier).toBe('training');
    expect(classifyUserAgent('Google-Extended')?.tier).toBe('training');
    expect(classifyUserAgent('CCBot/2.0')?.tier).toBe('training');
  });

  it('prefers the most-specific token (Extended before Applebot, -User before Bot)', () => {
    expect(classifyUserAgent('Applebot-Extended/1.0')?.tier).toBe('training');
    expect(classifyUserAgent('Applebot/0.1')?.tier).toBe('search');
    // A Perplexity live-fetch UA must not be mistaken for the indexing bot.
    expect(classifyUserAgent('Perplexity-User/1.0')?.engine).toContain('Perplexity');
    expect(classifyUserAgent('Perplexity-User/1.0')?.tier).toBe('live');
  });

  it('returns null for human / untracked traffic', () => {
    expect(classifyUserAgent('Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537')).toBeNull();
    expect(classifyUserAgent('')).toBeNull();
    expect(classifyUserAgent(null)).toBeNull();
  });

  it('exposes a versioned registry and plain-language tier definitions', () => {
    expect(REGISTRY_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(TIER_DEFINITIONS.live).toMatch(/asked/i);
    expect(TIER_DEFINITIONS.search).toMatch(/Bing/);
    expect(TIER_DEFINITIONS.training).toMatch(/not an endorsement/i);
  });

  it('carries token lifecycle status + consequence (ADDENDUM-002 #2)', () => {
    expect(classifyUserAgent('GPTBot/1.1')?.status).toBe('active');
    expect(classifyUserAgent('anthropic-ai/0.1')?.status).toBe('legacy');
    expect(classifyUserAgent('Grok/1.0')?.status).toBe('unstable');
    expect(classifyUserAgent('Grok/1.0')?.vendor).toBe('xAI');
    // Applebot vs Applebot-Extended are distinct consequences, not conflated.
    expect(classifyUserAgent('Applebot-Extended/1.0')?.consequence).toMatch(/training/i);
    expect(classifyUserAgent('Applebot/0.1')?.consequence).toMatch(/Siri|Spotlight/i);
    expect(classifyUserAgent('ChatGPT-User/1.0')?.consequence).toMatch(/live retrieval/i);
  });
});
