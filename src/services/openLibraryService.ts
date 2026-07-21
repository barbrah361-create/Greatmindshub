export interface OpenLibraryAuthor {
  name: string;
  bio?: string;
  birthDate?: string;
  deathDate?: string;
  wikipedia?: string;
  photos?: number[];
  alternateNames?: string[];
  links?: { title: string; url: string; type: string }[];
}

export interface OpenLibraryWork {
  title: string;
  key: string;
  firstPublishYear?: number;
  subjects?: string[];
}

const NOTABLE_AUTHORS = [
  { search: 'Ngũgĩ wa Thiong\'o', id: 'auth_ngugi' },
  { search: 'Chinua Achebe', id: 'auth_achebe' },
  { search: 'Chimamanda Ngozi Adichie', id: 'auth_adichie' },
  { search: 'Wole Soyinka', id: 'auth_soyinka' },
  { search: 'Amanda Gorman', id: 'auth_gorman' },
  { search: 'Nelson Mandela', id: 'auth_mandela' },
  { search: 'Barack Obama', id: 'auth_obama' },
  { search: 'Oprah Winfrey', id: 'auth_oprah' },
  { search: 'Maya Angelou', id: 'auth_angelou' },
  { search: 'Stephen King', id: 'auth_king' },
  { search: 'J.K. Rowling', id: 'auth_rowling' },
  { search: 'Agatha Christie', id: 'auth_christie' },
  { search: 'Charles Dickens', id: 'auth_dickens' },
  { search: 'Jane Austen', id: 'auth_austen' },
  { search: 'George Orwell', id: 'auth_orwell' },
  { search: 'William Shakespeare', id: 'auth_shakespeare' },
  { search: 'Paulo Coelho', id: 'auth_coelho' },
  { search: 'Margaret Atwood', id: 'auth_atwood' },
  { search: 'J.R.R. Tolkien', id: 'auth_tolkien' },
  { search: 'C.S. Lewis', id: 'auth_lewis' },
  { search: 'Ernest Hemingway', id: 'auth_hemingway' }
];

export const OpenLibraryService = {
  NOTABLE_AUTHORS,

  async searchAuthor(name: string): Promise<OpenLibraryAuthor | null> {
    try {
      const res = await fetch(
        `https://openlibrary.org/search/authors.json?q=${encodeURIComponent(name)}&limit=1`
      );
      const data = await res.json();
      const doc = data.docs?.[0];
      if (!doc) return null;

      const detail = await this.getAuthorDetails(doc.key);
      return detail;
    } catch {
      return null;
    }
  },

  async getAuthorDetails(key: string): Promise<OpenLibraryAuthor | null> {
    try {
      const res = await fetch(`https://openlibrary.org${key}.json`);
      const data = await res.json();
      let bio = '';
      if (typeof data.bio === 'string') bio = data.bio;
      else if (data.bio?.value) bio = data.bio.value;

      return {
        name: data.name || data.personal_name || '',
        bio: bio.slice(0, 2000),
        birthDate: data.birth_date,
        deathDate: data.death_date,
        wikipedia: data.wikipedia,
        photos: data.photos,
        alternateNames: data.alternate_names,
        links: data.links
      };
    } catch {
      return null;
    }
  },

  async getAuthorWorks(authorKey: string, limit = 20): Promise<OpenLibraryWork[]> {
    try {
      const res = await fetch(
        `https://openlibrary.org${authorKey}/works.json?limit=${limit}`
      );
      const data = await res.json();
      return (data.entries || []).map((w: any) => ({
        title: w.title,
        key: w.key,
        firstPublishYear: w.first_publish_date ? parseInt(w.first_publish_date) : undefined,
        subjects: w.subjects?.slice(0, 5)
      }));
    } catch {
      return [];
    }
  },

  getAuthorPhotoUrl(photoId: number, size: 'S' | 'M' | 'L' = 'M'): string {
    return `https://covers.openlibrary.org/a/olid/${photoId}-${size}.jpg`;
  },

  getCoverUrl(coverId: number, size: 'S' | 'M' | 'L' = 'M'): string {
    return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
  },

  async fetchWikipediaSummary(title: string): Promise<string | null> {
    try {
      const res = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`
      );
      if (!res.ok) return null;
      const data = await res.json();
      return data.extract?.slice(0, 1500) || null;
    } catch {
      return null;
    }
  }
};
