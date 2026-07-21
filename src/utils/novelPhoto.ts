// Specific title -> cover image map
export const NOVEL_TITLE_MAP: Record<string, string> = {
  'Pride and Prejudice': 'Pride and Prejudice.jpg',
  'Things Fall Apart': 'Things Fall Apart.jpg',
  'Nineteen Eighty-Four': 'Nineteen Eighty-Four.jpg',
  '1984': 'Nineteen Eighty-Four.jpg',
  'The Alchemist': 'The Alchemist.jpg',
  'Half of a Yellow Sun': 'Half of a Yellow Sun.jpg',
  'Long Walk to Freedom': 'Long Walk to Freedom.jpg',
  'I Know Why the Caged Bird Sings': 'I Know Why the Caged Bird Sings.jpg',
  "Harry Potter and the Philosopher's Stone": "Harry Potter and the Philosopher's Stone.jpg",
  'Petals of Blood': 'Petals of Blood.jpg'
};

// Map of genres to local cover images under /uploads
export const CATEGORY_IMAGE_MAP: Record<string, string> = {
  'African Literature': 'cat-african-literature.jpg',
  'Romance': 'cat-romance.jpg',
  'Fantasy': 'cat-fantasy.jpg',
  'Adventure': 'cat-adventure.jpg',
  'Thriller': 'cat-thriller.jpg',
  'Mystery': 'cat-mystery.jpg',
  'Horror': 'cat-horror.jpg',
  'Comedy': 'cat-comedy.jpg',
  'Crime': 'cat-crime.jpg',
  'Action': 'cat-action.jpg',
  'Science Fiction': 'cat-scifi.jpg',
  'Biography': 'cat-biography.jpg',
  'Autobiography': 'cat-autobiography.jpg',
  'Poetry': 'cat-poetry.jpg',
  'History': 'cat-history.jpg',
  'Politics': 'cat-politics.jpg',
  'Religion': 'cat-religion.jpg',
  'Business': 'cat-business.jpg',
  'Technology': 'cat-technology.jpg',
  'Programming': 'cat-programming.jpg',
  'Education': 'cat-education.jpg',
  'Children Books': 'cat-children.jpg',
  'Young Adult': 'cat-young-adult.jpg',
  'Classic Literature': 'cat-classic-literature.jpg',
  'Penguin Classics': 'cat-penguin-classics.jpg',
  'Short Stories': 'cat-short-stories.jpg',
  'Health': 'cat-health.jpg',
  'Psychology': 'cat-psychology.jpg',
  'Philosophy': 'cat-philosophy.jpg',
  'Self Help': 'cat-self-help.jpg',
  'Comics': 'cat-comics.jpg',
  'Graphic Novels': 'cat-graphic-novels.jpg',
  'Historical Fiction': 'cat-historical-fiction.jpg',
  'Memoir': 'cat-memoir.jpg',
  'Political Fiction': 'cat-political-fiction.jpg',
  'Drama': 'cat-drama.jpg'
};

/**
 * Returns the local image path for a given category/genre.
 */
export function getCategoryCover(category: string): string {
  const filename = CATEGORY_IMAGE_MAP[category];
  if (filename) {
    return `/uploads/${encodeURIComponent(filename).replace(/%2F/g, '/')}`;
  }
  return '/uploads/OIP.webp'; // Singular fallback
}

/**
 * Returns the correct local image cover for a given novel based on its genre or title.
 */
export function getLocalNovelCover(novel: { genre?: string; title?: string; coverImage?: string } | any): string {
  if (!novel) return '/uploads/OIP.webp';

  const title = novel.title ? String(novel.title).trim() : '';
  if (title && NOVEL_TITLE_MAP[title]) {
    return `/uploads/${encodeURIComponent(NOVEL_TITLE_MAP[title]).replace(/%2F/g, '/')}`;
  }

  // If already a local upload (starts with /uploads/ or public), respect it
  if (novel.coverImage && (novel.coverImage.startsWith('/uploads') || novel.coverImage.startsWith('uploads'))) {
    return novel.coverImage;
  }

  // Map to the correct local category file
  const genre = novel.genre || '';
  const filename = CATEGORY_IMAGE_MAP[genre];
  if (filename) {
    return `/uploads/${encodeURIComponent(filename).replace(/%2F/g, '/')}`;
  }

  return novel.coverImage || '/uploads/OIP.webp';
}

