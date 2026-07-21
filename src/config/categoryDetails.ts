export interface CategoryDetail {
  name: string;
  image: string;
  description: string;
}

export const CATEGORY_DETAILS: Record<string, CategoryDetail> = {
  'African Literature': {
    name: 'African Literature',
    image: '/uploads/cat-african-literature.jpg',
    description: 'Oral traditions, vibrant cultural narratives, and celebrated modern African prose.'
  },
  'Romance': {
    name: 'Romance',
    image: '/uploads/cat-romance.jpg',
    description: 'Swept by intense emotions, lifelong pledges, and warm romantic chronicles.'
  },
  'Fantasy': {
    name: 'Fantasy',
    image: '/uploads/cat-fantasy.jpg',
    description: 'Kingdoms of magic lore, sorcery relics, mythical beasts, and ancient epic quests.'
  },
  'Adventure': {
    name: 'Adventure',
    image: '/uploads/cat-adventure.jpg',
    description: 'Voyages through untamed wilderness, roaring rivers, and hidden treasures.'
  },
  'Thriller': {
    name: 'Thriller',
    image: '/uploads/cat-thriller.jpg',
    description: 'Suspenseful cliffhangers, ticking timers, pulse-pounding plots, and conspiracies.'
  },
  'Mystery': {
    name: 'Mystery',
    image: '/uploads/cat-mystery.jpg',
    description: 'Shadows of doubt, master detectives, secretive clues, and hidden crime structures.'
  },
  'Horror': {
    name: 'Horror',
    image: '/uploads/cat-horror.jpg',
    description: 'Spooky encounters, dark eerie environments, ancient curses, and terrifying tales.'
  },
  'Comedy': {
    name: 'Comedy',
    image: '/uploads/cat-comedy.jpg',
    description: 'Witty humor, hilarious social satire, clever parodies, and lighthearted laughs.'
  },
  'Crime': {
    name: 'Crime',
    image: '/uploads/cat-crime.jpg',
    description: 'Underworld syndicates, forensic investigations, heist masterminds, and justice.'
  },
  'Action': {
    name: 'Action',
    image: '/uploads/cat-action.jpg',
    description: 'Explosive battles, martial encounters, high-speed chases, and heroic combat.'
  },
  'Science Fiction': {
    name: 'Science Fiction',
    image: '/uploads/cat-scifi.jpg',
    description: 'Futuristic empires, deep space travel, cybernetics, and innovative tech.'
  },
  'Biography': {
    name: 'Biography',
    image: '/uploads/cat-biography.jpg',
    description: 'Life stories of revolutionary thinkers, world leaders, and historical icons.'
  },
  'Autobiography': {
    name: 'Autobiography',
    image: '/uploads/cat-autobiography.jpg',
    description: 'First-person memoirs, personal triumphs, and transformative life journeys.'
  },
  'Poetry': {
    name: 'Poetry',
    image: '/uploads/cat-poetry.jpg',
    description: 'Structured stanzas, rhythmic expressions of the soul, and lyrical collections.'
  },
  'History': {
    name: 'History',
    image: '/uploads/cat-history.jpg',
    description: 'Deep explorations of past civilizations, historic battles, and global eras.'
  },
  'Politics': {
    name: 'Politics',
    image: '/uploads/cat-politics.jpg',
    description: 'Statecraft insights, political philosophy, diplomacy, and global governance.'
  },
  'Religion': {
    name: 'Religion',
    image: '/uploads/cat-religion.jpg',
    description: 'Sacred scriptures, spiritual traditions, theology, and timeless faith wisdom.'
  },
  'Business': {
    name: 'Business',
    image: '/uploads/cat-business.jpg',
    description: 'Entrepreneurial leadership, financial wisdom, corporate strategy, and growth.'
  },
  'Technology': {
    name: 'Technology',
    image: '/uploads/cat-technology.jpg',
    description: 'Digital revolutions, artificial intelligence, robotics, and tech innovations.'
  },
  'Programming': {
    name: 'Programming',
    image: '/uploads/cat-programming.jpg',
    description: 'Software design patterns, algorithms, system architecture, and code mastery.'
  },
  'Education': {
    name: 'Education',
    image: '/uploads/cat-education.jpg',
    description: 'Pedagogical frameworks, academic research, and lifelong learning guides.'
  },
  'Children Books': {
    name: 'Children Books',
    image: '/uploads/cat-children.jpg',
    description: 'Enchanting fairy tales, colorful bedtime stories, and youthful imagination.'
  },
  'Young Adult': {
    name: 'Young Adult',
    image: '/uploads/cat-young-adult.jpg',
    description: 'Coming-of-age journeys, high school sagas, identity, and personal growth.'
  },
  'Classic Literature': {
    name: 'Classic Literature',
    image: '/uploads/cat-classic-literature.jpg',
    description: 'Enduring literary masterpieces that shaped human thought across centuries.'
  },
  'Penguin Classics': {
    name: 'Penguin Classics',
    image: '/uploads/cat-penguin-classics.jpg',
    description: 'Canonical editions of world-renowned classical authors and landmark works.'
  },
  'Short Stories': {
    name: 'Short Stories',
    image: '/uploads/cat-short-stories.jpg',
    description: 'Concise narrative gems, flash fiction anthologies, and punchy tales.'
  },
  'Health': {
    name: 'Health',
    image: '/uploads/cat-health.jpg',
    description: 'Physical fitness, nutrition science, holistic wellbeing, and healthy habits.'
  },
  'Psychology': {
    name: 'Psychology',
    image: '/uploads/cat-psychology.jpg',
    description: 'Uncovering the human mind, behavioral patterns, memory, and cognitive insights.'
  },
  'Philosophy': {
    name: 'Philosophy',
    image: '/uploads/cat-philosophy.jpg',
    description: 'Existential inquiries, ethical frameworks, logic, and deep philosophical thought.'
  },
  'Self Help': {
    name: 'Self Help',
    image: '/uploads/cat-self-help.jpg',
    description: 'Mindfulness, productivity, emotional resilience, and personal transformation.'
  },
  'Comics': {
    name: 'Comics',
    image: '/uploads/cat-comics.jpg',
    description: 'Vibrant panel graphics, superhero showdowns, and illustrated adventures.'
  },
  'Graphic Novels': {
    name: 'Graphic Novels',
    image: '/uploads/cat-graphic-novels.jpg',
    description: 'Long-form visual storytelling blending stunning artwork with deep themes.'
  },
  'Historical Fiction': {
    name: 'Historical Fiction',
    image: '/uploads/cat-historical-fiction.jpg',
    description: 'Vivid historic settings, authentic period details, and dramatized history.'
  },
  'Memoir': {
    name: 'Memoir',
    image: '/uploads/cat-memoir.jpg',
    description: 'Intimate personal reflections, lived struggles, and heartwarming memories.'
  },
  'Political Fiction': {
    name: 'Political Fiction',
    image: '/uploads/cat-political-fiction.jpg',
    description: 'Dystopian regimes, political intrigue, power dynamics, and societal sagas.'
  },
  'Drama': {
    name: 'Drama',
    image: '/uploads/cat-drama.jpg',
    description: 'Intense character conflicts, theatrical plays, emotional depth, and human trials.'
  }
};

export function getCategoryDetail(category: string): CategoryDetail {
  if (CATEGORY_DETAILS[category]) {
    return CATEGORY_DETAILS[category];
  }
  const nameClean = category.trim();
  const slug = nameClean.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return {
    name: category,
    image: `/uploads/cat-${slug}.jpg`,
    description: `Explore dedicated works and timeless collections in ${category}.`
  };
}
