import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateProfileCompletion, normalizeSocialUrl, estimateReadingTime, buildReaderSummary } from '../src/utils/profile.js';

test('calculateProfileCompletion rewards populated profile details', () => {
  const completion = calculateProfileCompletion({
    avatar: '/uploads/avatar.png',
    bio: 'Loves literary fiction',
    country: 'Nigeria',
    languages: 'English, Yoruba',
    website: 'https://example.com',
    favoriteGenres: ['Fantasy'],
    favoriteAuthors: ['Aminata'],
    twitter: 'https://x.com/demo',
    instagram: 'https://instagram.com/demo'
  });

  assert.equal(completion, 100);
});

test('normalizeSocialUrl adds https and validates safe links', () => {
  assert.equal(normalizeSocialUrl('x.com/demo', 'twitter'), 'https://x.com/demo');
  assert.equal(normalizeSocialUrl('https://instagram.com/demo', 'instagram'), 'https://instagram.com/demo');
  assert.equal(normalizeSocialUrl('javascript:alert(1)', 'website'), '');
});

test('estimateReadingTime produces a reasonable reading duration', () => {
  const minutes = estimateReadingTime('The river carried memories across the page while the moonlight painted every detail with quiet grace.');
  assert.equal(minutes, 1);
});

test('buildReaderSummary extracts a concise insight from page text', () => {
  const summary = buildReaderSummary('The hero steps through the forest, carrying a lantern and searching for truth.');
  assert.match(summary, /forest|lantern|truth/i);
});
