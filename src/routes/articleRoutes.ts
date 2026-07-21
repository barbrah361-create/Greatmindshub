import { Router } from 'express';
import { ArticleController } from '../controllers/ArticleController.js';

const router = Router();

router.get('/', ArticleController.getArticles);
router.get('/:id', ArticleController.getArticleDetails);

export default router;
