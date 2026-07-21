export interface Article {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  excerpt: string;
  category: string;
  author: string;
  date: string;
  readTime: string;
  content: string;
  tags: string[];
}

export const articles: Article[] = [
  {
    id: 'article_achebe_profile',
    title: 'Chinua Achebe: A Voice for African Storytelling',
    subtitle: 'How Things Fall Apart changed world literature forever',
    image: '/uploads/Chinua Achebe.png',
    excerpt: 'Explore the life of Chinua Achebe and the legacy of his seminal work, Things Fall Apart, a cornerstone of modern African literature.',
    category: 'Author Spotlight',
    author: 'Elegance Library Editorial',
    date: 'June 2026',
    readTime: '5 min read',
    content: 'Chinua Achebe is widely regarded as the father of modern African literature. His debut novel, Things Fall Apart, is a powerful portrayal of Igbo society disrupted by colonial forces. The novel introduced the world to African voices in the English language and remains a vital text for readers who want to understand the cultural and historical complexities of post-colonial society. In our article, we trace Achebe’s influences, his deep sense of identity, and the lasting impact of his work on the global literary stage.',
    tags: ['African Literature', 'Biography', 'Classic']
  },
  {
    id: 'article_rowling_magic',
    title: 'The Art of Worldbuilding with J.K. Rowling',
    subtitle: 'Why magical storytelling still captivates modern readers',
    image: '/uploads/J.k Rowlings.png',
    excerpt: 'Unpack the narrative craft behind the Harry Potter saga and learn how emotional stakes and worldbuilding make fantasy feel real.',
    category: 'Writing Craft',
    author: 'Elegance Library Editorial',
    date: 'May 2026',
    readTime: '4 min read',
    content: 'J.K. Rowling created a world that feels grounded yet magical, with richly imagined locations, memorable characters, and emotional resonance. In this article, we examine the elements that make her storytelling so effective, from the rules of magic to the way she balances childlike wonder with serious themes. Whether you are a fantasy reader or an aspiring writer, Rowling’s technique offers a powerful model for building immersive fictional worlds.',
    tags: ['Fantasy', 'Storytelling', 'Worldbuilding']
  },
  {
    id: 'article_angelou_voice',
    title: 'Maya Angelou and the Power of Poetic Memoir',
    subtitle: 'Finding strength, grace, and identity in written memory',
    image: '/uploads/Maya Angelou.png',
    excerpt: 'Discover how Maya Angelou blended vivid lyricism with personal history to create memoirs that speak to resilience and self-discovery.',
    category: 'Poetry & Memoir',
    author: 'Elegance Library Editorial',
    date: 'April 2026',
    readTime: '6 min read',
    content: 'Maya Angelou’s work is defined by an unwavering voice that celebrates survival, dignity, and the human spirit. Her memoirs and poems combine exquisite imagery with honest reflection. This article explores the techniques Angelou uses to convey deep emotion, including repetition, rhythm, and powerful metaphor, as well as the ways she transforms her personal narrative into universal truth.',
    tags: ['Poetry', 'Memoir', 'Inspiration']
  },
  {
    id: 'article_ngugi_language',
    title: 'Ngugi wa Thiong’o: Language, Liberation, and Legacy',
    subtitle: 'A literary pioneer who wrote for his people',
    image: "/uploads/Ngũgĩ wa Thiong'o.png",
    excerpt: 'Learn why Ngugi wa Thiong’o chose to write in indigenous languages and how his work reshaped the literary landscape of Kenya and beyond.',
    category: 'Literary History',
    author: 'Elegance Library Editorial',
    date: 'March 2026',
    readTime: '5 min read',
    content: 'Ngugi wa Thiong’o is one of Africa’s most important living writers, known for his commitment to writing in Gikuyu and his fierce critique of colonial culture. In this article, we look at his major works, his ideas about language as a tool of power, and the enduring reach of his cultural activism. Ngugi’s decision to write for his own community remains a landmark in literary history.',
    tags: ['African Literature', 'Language', 'Culture']
  },
  {
    id: 'article_shakespeare_theatre',
    title: 'William Shakespeare: The Timeless Theatre Architect',
    subtitle: 'Why Shakespeare remains vital for modern readers and stage lovers',
    image: '/uploads/William Shakespeare.png',
    excerpt: 'From tragedy to comedy, Shakespeare’s craft continues to shape contemporary storytelling with psychological depth and theatrical intelligence.',
    category: 'Classic Literature',
    author: 'Elegance Library Editorial',
    date: 'February 2026',
    readTime: '4 min read',
    content: 'William Shakespeare’s plays offer more than dramatic spectacle; they investigate human nature, power, love, and betrayal. In this piece, we analyze his use of poetic language, character arcs, and dramatic structure. We also explain why staging his work still challenges and delights actors, directors, and audiences around the world.',
    tags: ['Drama', 'History', 'Theatre']
  }
];

export const featuredArticles = articles.slice(0, 4);

export function getArticleById(id: string) {
  return articles.find((article) => article.id === id);
}
