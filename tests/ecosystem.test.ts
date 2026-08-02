import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRecommendationSet, summarizeText, calculateReadingStreak } from '../src/utils/ecosystem.ts';

test('buildRecommendationSet returns relevant recommendations', () => {
  const novels = [
    { title: 'Midnight in Nairobi', genre: 'Mystery' },
    { title: 'Whispers of the Coast', genre: 'Romance' },
    { title: 'River of Stars', genre: 'Fantasy' }
  ];
  const recommendations = buildRecommendationSet(novels, ['Mystery', 'Fantasy']);
  assert.ok(recommendations.length >= 2);
  assert.ok(recommendations.some((item) => item.genre === 'Mystery'));
});

test('summarizeText condenses content into a concise blurb', () => {
  const summary = summarizeText('A brave young writer enters a city of secrets and finds purpose through art and courage.');
  assert.ok(summary.length > 0);
  assert.ok(summary.includes('brave') || summary.includes('writer'));
});

test('calculateReadingStreak produces a positive value from history items', () => {
  const streak = calculateReadingStreak([
    { lastReadAt: '2026-08-01T10:00:00.000Z' },
    { lastReadAt: '2026-07-31T09:00:00.000Z' },
    { lastReadAt: '2026-07-30T08:00:00.000Z' }
  ]);
  assert.ok(streak >= 3);
});
