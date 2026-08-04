export interface ProfileSnapshot {
  avatar?: string;
  coverPhoto?: string;
  bio?: string;
  country?: string;
  languages?: string;
  website?: string;
  favoriteGenres?: string[];
  favoriteAuthors?: string[];
  twitter?: string;
  instagram?: string;
  linkedin?: string;
  facebook?: string;
  tiktok?: string;
  youtube?: string;
  verified?: boolean;
  location?: string;
  occupation?: string;
  writingStyle?: string;
}

export function calculateProfileCompletion(profile: ProfileSnapshot): number {
  let score = 0;
  const socialLinks = [profile.twitter, profile.instagram, profile.linkedin, profile.facebook, profile.tiktok, profile.youtube].filter((entry): entry is string => Boolean(entry && entry.trim()));

  if (profile.avatar && profile.avatar.trim()) score += 25;
  if (profile.coverPhoto && profile.coverPhoto.trim()) score += 5;
  if (profile.bio && profile.bio.trim()) score += 15;
  if (profile.country && profile.country.trim()) score += 10;
  if (profile.languages && profile.languages.trim()) score += 10;
  if (profile.website && profile.website.trim()) score += 10;
  if ((profile.favoriteGenres || []).some((entry) => entry && entry.trim())) score += 10;
  if ((profile.favoriteAuthors || []).some((entry) => entry && entry.trim())) score += 10;
  if (socialLinks.length > 0) {
    score += Math.min(10, socialLinks.length * 5);
  }

  return Math.min(100, score);
}

export function normalizeSocialUrl(value: string | undefined, type: 'website' | 'twitter' | 'instagram' | 'linkedin' | 'facebook' | 'tiktok' | 'youtube'): string {
  if (!value) return '';

  const trimmed = String(value).trim();
  if (!trimmed) return '';

  const lower = trimmed.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:')) return '';

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withProtocol);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    if (type !== 'website') {
      const allowedHosts = ['x.com', 'twitter.com', 'instagram.com', 'linkedin.com', 'facebook.com', 'tiktok.com', 'youtube.com', 'www.x.com', 'www.twitter.com', 'www.instagram.com', 'www.linkedin.com', 'www.facebook.com', 'www.tiktok.com', 'www.youtube.com'];
      const host = parsed.hostname.toLowerCase();
      if (!allowedHosts.includes(host) && !allowedHosts.includes(`www.${host}`)) {
        return '';
      }
    }
    return parsed.toString();
  } catch {
    return '';
  }
}

export function estimateReadingTime(text: string, wordsPerMinute = 200): number {
  if (!text || !text.trim()) return 1;
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

export function buildReaderSummary(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'A rich passage that rewards a slow, attentive read.';
  const summary = cleaned.length > 150 ? `${cleaned.slice(0, 147)}...` : cleaned;
  return summary;
}
