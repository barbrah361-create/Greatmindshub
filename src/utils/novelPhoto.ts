// Map of genres to local cover images under /uploads
export const CATEGORY_IMAGE_MAP: Record<string, string> = {
  'African Literature': 'African fictions.jpg',
  'Romance': 'romance novel.jpeg',
  'Fantasy': 'fantesy novel.png',
  'Adventure': 'adventure novel.webp',
  'Thriller': 'thriller.webp',
  'Mystery': 'mystery.jpg',
  'Horror': 'horror novel.webp',
  'Comedy': 'Drama novel.webp',
  'Crime': 'mystery.jpg',
  'Action': 'adventure novel.webp',
  'Science Fiction': 'science fiction.jpg',
  'Biography': 'historical fiction.webp',
  'Autobiography': 'historical fiction.webp',
  'Poetry': 'poetry.webp',
  'History': 'historical fiction.webp',
  'Politics': 'historical fiction.webp',
  'Religion': 'classics novels.jpg',
  'Business': 'historical fiction.webp',
  'Technology': 'science fiction.jpg',
  'Programming': 'science fiction.jpg',
  'Education': 'classics novels.jpg',
  'Children Books': 'fantesy novel.png',
  'Young Adult': 'romance novel.jpeg',
  'Classic Literature': 'classics novels.jpg',
  'Penguin Classics': 'classics novels.jpg',
  'Short Stories': 'poetry.webp',
  'Health': 'historical fiction.webp',
  'Psychology': 'historical fiction.webp',
  'Philosophy': 'classics novels.jpg',
  'Self Help': 'poetry.webp',
  'Comics': 'fantesy novel.png',
  'Graphic Novels': 'adventure novel.webp',
  'Historical Fiction': 'historical fiction.webp',
  'Memoir': 'historical fiction.webp',
  'Political Fiction': 'historical fiction.webp',
  'Drama': 'Drama novel.webp'
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
