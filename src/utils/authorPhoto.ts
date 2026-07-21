// NOTE: `path` import removed because it is unused and can trigger TS/ESM tooling issues.


// Map known author _id/name -> local image file under /public/uploads
// Add/adjust entries to match actual filenames in public/uploads.
const AUTHOR_PHOTO_MAP: Record<string, string> = {
  auth_shakespeare: 'William Shakespeare.png',
  'William Shakespeare': 'William Shakespeare.png',

  auth_achebe: 'Chinua Achebe.png',
  'Chinua Achebe': 'Chinua Achebe.png',

  auth_adichie: 'Chimamanda Ngozi Adichie.png',
  'Chimamanda Ngozi Adichie': 'Chimamanda Ngozi Adichie.png',

  auth_austen: 'Jane austen.png',
  'Jane Austen': 'Jane austen.png',

  auth_orwell: 'George Orwell.png',
  'George Orwell': 'George Orwell.png',

  auth_coelho: 'Paulo Coelho.png',
  'Paulo Coelho': 'Paulo Coelho.png',

  auth_mandela: 'Nelson Mandela.png',
  'Nelson Mandela': 'Nelson Mandela.png',

  auth_angelou: 'Maya Angelou.png',
  'Maya Angelou': 'Maya Angelou.png',

  auth_rowling: 'J.k Rowlings.png',
  'J.K. Rowling': 'J.k Rowlings.png',

  auth_ngugi: "Ngũgĩ wa Thiong'o.png",
  "Ngũgĩ wa Thiong'o": "Ngũgĩ wa Thiong'o.png",

  auth_gorman: 'Amanda Gorman.png',
  'Amanda Gorman': 'Amanda Gorman.png',

  auth_obama: 'Barack Obama.png',
  'Barack Obama': 'Barack Obama.png',

  auth_soyinka: 'Wole Soyinka.jpg',
  'Wole Soyinka': 'Wole Soyinka.jpg',

  auth_king: 'Stephen King.jpg',
  'Stephen King': 'Stephen King.jpg',

  auth_christie: 'Agattha christie.webp',
  'Agatha Christie': 'Agattha christie.webp',

  auth_dickens: 'Charles Dickens.jpg',
  'Charles Dickens': 'Charles Dickens.jpg',

  auth_atwood: 'Margaret-Atwood.webp',
  'Margaret Atwood': 'Margaret-Atwood.webp',

  auth_tolkien: 'J.R.R. Tolkien.webp',
  'J.R.R. Tolkien': 'J.R.R. Tolkien.webp',

  auth_lewis: 'C.S. Lewis.jpeg',
  'C.S. Lewis': 'C.S. Lewis.jpeg',

  auth_hemingway: 'Ernest Hemingway.webp',
  'Ernest Hemingway': 'Ernest Hemingway.webp'
};

const WIKIPEDIA_MAP: Record<string, string> = {
  auth_shakespeare: 'https://en.wikipedia.org/wiki/William_Shakespeare',
  'William Shakespeare': 'https://en.wikipedia.org/wiki/William_Shakespeare',

  auth_austen: 'https://en.wikipedia.org/wiki/Jane_Austen',
  'Jane Austen': 'https://en.wikipedia.org/wiki/Jane_Austen',

  auth_achebe: 'https://en.wikipedia.org/wiki/Chinua_Achebe',
  'Chinua Achebe': 'https://en.wikipedia.org/wiki/Chinua_Achebe',

  auth_adichie: 'https://en.wikipedia.org/wiki/Chimamanda_Ngozi_Adichie',
  'Chimamanda Ngozi Adichie': 'https://en.wikipedia.org/wiki/Chimamanda_Ngozi_Adichie',

  auth_orwell: 'https://en.wikipedia.org/wiki/George_Orwell',
  'George Orwell': 'https://en.wikipedia.org/wiki/George_Orwell',

  auth_coelho: 'https://en.wikipedia.org/wiki/Paulo_Coelho',
  'Paulo Coelho': 'https://en.wikipedia.org/wiki/Paulo_Coelho',

  auth_mandela: 'https://en.wikipedia.org/wiki/Nelson_Mandela',
  'Nelson Mandela': 'https://en.wikipedia.org/wiki/Nelson_Mandela',

  auth_angelou: 'https://en.wikipedia.org/wiki/Maya_Angelou',
  'Maya Angelou': 'https://en.wikipedia.org/wiki/Maya_Angelou',

  auth_rowling: 'https://en.wikipedia.org/wiki/J._K._Rowling',
  'J.K. Rowling': 'https://en.wikipedia.org/wiki/J._K._Rowling',

  auth_ngugi: 'https://en.wikipedia.org/wiki/Ng%C5%ABg%C4%AB_wa_Thiong%27o',
  "Ngũgĩ wa Thiong'o": 'https://en.wikipedia.org/wiki/Ng%C5%ABg%C4%AB_wa_Thiong%27o',

  auth_soyinka: 'https://en.wikipedia.org/wiki/Wole_Soyinka',
  'Wole Soyinka': 'https://en.wikipedia.org/wiki/Wole_Soyinka',

  auth_gorman: 'https://en.wikipedia.org/wiki/Amanda_Gorman',
  'Amanda Gorman': 'https://en.wikipedia.org/wiki/Amanda_Gorman',

  auth_obama: 'https://en.wikipedia.org/wiki/Barack_Obama',
  'Barack Obama': 'https://en.wikipedia.org/wiki/Barack_Obama',

  auth_king: 'https://en.wikipedia.org/wiki/Stephen_King',
  'Stephen King': 'https://en.wikipedia.org/wiki/Stephen_King',

  auth_christie: 'https://en.wikipedia.org/wiki/Agatha_Christie',
  'Agatha Christie': 'https://en.wikipedia.org/wiki/Agatha_Christie',

  auth_dickens: 'https://en.wikipedia.org/wiki/Charles_Dickens',
  'Charles Dickens': 'https://en.wikipedia.org/wiki/Charles_Dickens',

  auth_atwood: 'https://en.wikipedia.org/wiki/Margaret_Atwood',
  'Margaret Atwood': 'https://en.wikipedia.org/wiki/Margaret_Atwood',

  auth_tolkien: 'https://en.wikipedia.org/wiki/J._R._R._Tolkien',
  'J.R.R. Tolkien': 'https://en.wikipedia.org/wiki/J._R._R._Tolkien',

  auth_lewis: 'https://en.wikipedia.org/wiki/C._S._Lewis',
  'C.S. Lewis': 'https://en.wikipedia.org/wiki/C._S._Lewis',

  auth_hemingway: 'https://en.wikipedia.org/wiki/Ernest_Hemingway',
  'Ernest Hemingway': 'https://en.wikipedia.org/wiki/Ernest_Hemingway'
};

export function getWikipediaLink(author: { _id?: string; name?: string; externalLink?: string } | any): string {
  if (!author) return 'https://en.wikipedia.org/wiki/List_of_authors';
  const id = author._id ? String(author._id) : '';
  const name = author.name ? String(author.name).trim() : '';

  const matched = WIKIPEDIA_MAP[id] || WIKIPEDIA_MAP[name];
  if (matched) return matched;

  if (author.externalLink && author.externalLink.includes('wikipedia.org')) {
    return author.externalLink;
  }

  if (name) {
    const formattedName = name.replace(/\s+/g, '_');
    return `https://en.wikipedia.org/wiki/${encodeURIComponent(formattedName)}`;
  }

  return 'https://en.wikipedia.org/wiki/List_of_authors';
}

export function getLocalAuthorPhoto(author: { _id?: string; name?: string; photo?: string } | any): string {
  const id = author?._id ? String(author._id) : '';
  const name = author?.name ? String(author.name) : '';

  const filename = AUTHOR_PHOTO_MAP[id] || AUTHOR_PHOTO_MAP[name];
  if (filename) {
    // Use public URL path
    return `/uploads/${encodeURIComponent(filename).replace(/%2F/g, '/')}`;
  }

  // Fallback to whatever is stored
  return author?.photo || '/uploads/default-avatar.png';
}

