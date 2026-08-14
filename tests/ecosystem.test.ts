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
  const today = new Date();
  const d1 = new Date(today);
  const d2 = new Date(today);
  const d3 = new Date(today);
  d2.setDate(today.getDate() - 1);
  d3.setDate(today.getDate() - 2);

  const streak = calculateReadingStreak([
    { lastReadAt: d1.toISOString() },
    { lastReadAt: d2.toISOString() },
    { lastReadAt: d3.toISOString() }
  ]);
  assert.ok(streak >= 3);
});
