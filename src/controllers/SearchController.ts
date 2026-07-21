import { Request, Response } from 'express';
import { NovelModel } from '../models/Novel.js';
import { AuthorModel } from '../models/Author.js';
import { PoemModel } from '../models/Poem.js';
import { getLocalAuthorPhoto, getWikipediaLink } from '../utils/authorPhoto.js';
import { getLocalNovelCover } from '../utils/novelPhoto.js';

export const SearchController = {
  search: (req: Request, res: Response) => {
    const q = (req.query.q as string || '').trim();
    const type = (req.query.type as string) || 'all';

    const results = {
      novels: [] as any[],
      authors: [] as any[],
      poems: [] as any[]
    };

    if (type === 'all' || type === 'novels' || type === 'books') {
      const allNovels = NovelModel.findPublic().sort({ readerCount: -1 }).limit(200).exec();
      const lq = q.toLowerCase();
      results.novels = allNovels.filter(n =>
        n.title?.toLowerCase().includes(lq) ||
        n.authorName?.toLowerCase().includes(lq) ||
        n.genre?.toLowerCase().includes(lq) ||
        n.description?.toLowerCase().includes(lq) ||
        n.tags?.some((t: string) => t.toLowerCase().includes(lq))
      ).slice(0, 20).map(n => ({
        ...n,
        coverImage: getLocalNovelCover(n)
      }));
    }

    if (type === 'all' || type === 'authors') {
      const allAuthors = AuthorModel.findPublic().sort({ novelCount: -1 }).limit(200).exec();
      const lq = q.toLowerCase();
      results.authors = allAuthors.filter(a =>
        a.name?.toLowerCase().includes(lq) ||
        a.nationality?.toLowerCase().includes(lq) ||
        a.bio?.toLowerCase().includes(lq)
      ).slice(0, 20).map(a => ({
        ...a,
        photo: getLocalAuthorPhoto(a),
        externalLink: getWikipediaLink(a)
      }));
    }

    if (type === 'all' || type === 'poems') {
      const allPoems = PoemModel.findPublic().sort({ createdAt: -1 }).limit(100).exec();
      results.poems = allPoems.filter(p =>
        p.title.toLowerCase().includes(q.toLowerCase()) ||
        p.content.toLowerCase().includes(q.toLowerCase()) ||
        p.authorName.toLowerCase().includes(q.toLowerCase())
      ).slice(0, 20);
    }

    res.render('search', { title: `Search: ${q}`, query: q, type, results });
  }
};
