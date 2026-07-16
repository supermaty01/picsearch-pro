import { describe, expect, it } from 'vitest';

import { isOriginAllowed, parseAllowedOrigins } from '../src/lib/cors.js';

describe('parseAllowedOrigins', () => {
  it('splits, trims, and drops empty entries', () => {
    expect(parseAllowedOrigins(' https://a.dev , https://b.dev ,, ')).toEqual([
      'https://a.dev',
      'https://b.dev',
    ]);
  });
});

describe('isOriginAllowed (NFR-5)', () => {
  const allowed = ['https://picsearch-pro.pages.dev'];

  it('allows an exact match', () => {
    expect(isOriginAllowed('https://picsearch-pro.pages.dev', allowed)).toBe(true);
  });

  it('allows per-commit Pages preview subdomains implicitly', () => {
    expect(isOriginAllowed('https://8549ffcc.picsearch-pro.pages.dev', allowed)).toBe(true);
  });

  it('rejects other pages.dev projects', () => {
    expect(isOriginAllowed('https://evil-project.pages.dev', allowed)).toBe(false);
    expect(isOriginAllowed('https://x.evil-project.pages.dev', allowed)).toBe(false);
  });

  it('rejects lookalike hosts that merely end with the allowed host string', () => {
    expect(isOriginAllowed('https://evilpicsearch-pro.pages.dev', allowed)).toBe(false);
  });

  it('rejects a scheme downgrade on a preview subdomain', () => {
    expect(isOriginAllowed('http://8549ffcc.picsearch-pro.pages.dev', allowed)).toBe(false);
  });

  it('does not extend non-Pages origins to their subdomains', () => {
    expect(isOriginAllowed('https://sub.example.com', ['https://example.com'])).toBe(false);
  });

  it('supports explicit wildcard entries for any domain', () => {
    const wildcard = ['https://*.example.com'];
    expect(isOriginAllowed('https://sub.example.com', wildcard)).toBe(true);
    expect(isOriginAllowed('https://deep.sub.example.com', wildcard)).toBe(true);
    expect(isOriginAllowed('https://example.com.evil.net', wildcard)).toBe(false);
  });

  it('rejects unrelated origins', () => {
    expect(isOriginAllowed('https://attacker.dev', allowed)).toBe(false);
  });
});
