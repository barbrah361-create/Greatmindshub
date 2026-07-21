import { Request, Response } from 'express';
import { NovelModel } from '../models/Novel.js';
import { AuthorModel } from '../models/Author.js';
import { PoemModel } from '../models/Poem.js';

export const SeoController = {
  sitemap: (req: Request, res: Response) => {
    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const novels = NovelModel.findPublic().exec();
    const authors = AuthorModel.findPublic().exec();
    const poems = PoemModel.findPublic().exec();

    const urls = [
      { loc: baseUrl, priority: '1.0' },
      { loc: `${baseUrl}/novels`, priority: '0.9' },
      { loc: `${baseUrl}/authors`, priority: '0.9' },
      { loc: `${baseUrl}/poems`, priority: '0.9' },
      { loc: `${baseUrl}/articles`, priority: '0.8' },
      { loc: `${baseUrl}/about`, priority: '0.5' },
      ...novels.map(n => ({ loc: `${baseUrl}/novels/${n._id}`, priority: '0.7' })),
      ...authors.map(a => ({ loc: `${baseUrl}/authors/${a._id}`, priority: '0.7' })),
      ...poems.map(p => ({ loc: `${baseUrl}/poems/${p._id}`, priority: '0.6' }))
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u.loc}</loc><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(xml);
  },

  robots: (req: Request, res: Response) => {
    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    res.type('text/plain');
    res.send(`User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /auth/\nDisallow: /dashboard/\nSitemap: ${baseUrl}/sitemap.xml`);
  }
};
