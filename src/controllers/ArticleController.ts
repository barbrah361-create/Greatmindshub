import { Request, Response } from 'express';
import { articles, getArticleById, featuredArticles } from '../config/articles.js';

export const ArticleController = {
  getArticles: (req: Request, res: Response) => {
    try {
      res.render('articles', {
        title: 'Articles',
        articles,
        featuredArticles
      });
    } catch (error) {
      console.error('Articles page error:', error);
      res.status(500).render('error', { statusCode: 500, message: 'Could not load articles.' });
    }
  },

  getArticleDetails: (req: Request, res: Response) => {
    try {
      const article = getArticleById(req.params.id);
      if (!article) {
        return res.status(404).render('error', { statusCode: 404, message: 'Article not found.' });
      }

      res.render('article-details', {
        title: article.title,
        article
      });
    } catch (error) {
      console.error('Article detail error:', error);
      res.status(500).render('error', { statusCode: 500, message: 'Could not load the article.' });
    }
  }
};
