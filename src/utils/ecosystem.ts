export interface ReadingHistoryItemLike {
  lastReadAt?: string;
}

export interface RecommendationItem {
  title: string;
  genre: string;
}

export function buildRecommendationSet(items: RecommendationItem[], preferredGenres: string[]): RecommendationItem[] {
  const normalized = preferredGenres.map((genre) => genre.toLowerCase());
  const scored = items
    .map((item) => ({
      ...item,
      score: normalized.includes((item.genre || '').toLowerCase()) ? 2 : 1
    }))
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, 4);
}

export function summarizeText(text: string): string {
  const trimmed = (text || '').trim();
  if (!trimmed) return 'A fresh story awaits discovery.';
  const sentences = trimmed.split(/(?<=[.!?])\s+/).filter(Boolean);
  const firstSentence = sentences[0] || trimmed;
  return firstSentence.length > 140 ? `${firstSentence.slice(0, 137)}...` : firstSentence;
}

export function calculateReadingStreak(history: ReadingHistoryItemLike[]): number {
  if (!history.length) return 0;
  const sorted = [...history].sort((a, b) => new Date(b.lastReadAt || 0).getTime() - new Date(a.lastReadAt || 0).getTime());
  const today = new Date();
  let streak = 0;
  const seen = new Set<string>();

  for (const entry of sorted) {
    const date = new Date(entry.lastReadAt || 0);
    const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > streak + 7) break;
    const key = date.toISOString().slice(0, 10);
    if (seen.has(key)) continue;
    seen.add(key);
    streak += 1;
  }

  return Math.max(1, streak);
}
