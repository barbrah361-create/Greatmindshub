import { Request, Response } from 'express';
import { NovelModel } from '../models/Novel.js';
import { AuthorModel } from '../models/Author.js';
import { UserModel } from '../models/User.js';
import { CommentModel } from '../models/Comment.js';
import { PoemModel } from '../models/Poem.js';
import { PaymentModel } from '../models/Payment.js';
import { EmailService } from '../services/emailService.js';

export const AdminController = {
  // 1. Admin Index / Dashboard with Analytics
  getDashboard: (req: Request, res: Response) => {
    try {
      const novelsCount = NovelModel.countDocuments({});
      const authorsCount = AuthorModel.countDocuments({});
      
      const allUsers = UserModel.find().exec();
      const usersCount = allUsers.length;

      // Active readers (registered users who have reading history)
      const activeReadersCount = allUsers.filter(u => u.readingHistory && u.readingHistory.length > 0).length;

      // Reported Comments
      const reportedComments = CommentModel.find({ isReported: true }).exec();
      const pendingNovels = NovelModel.find({ approvalStatus: 'pending' }).exec();
      const pendingAuthors = AuthorModel.find({ approvalStatus: 'pending' }).exec();
      const pendingPoems = PoemModel.find({ approvalStatus: 'pending' }).exec();
      const payments = PaymentModel.find({ status: 'completed' }).exec();
      const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

      // Datasets for Analytics Charts
      const allNovels = NovelModel.find().exec();
      
      // Dataset A: Most Read Novels (Sorted by readerCount descending)
      const mostReadNovels = [...allNovels]
        .sort((a, b) => b.readerCount - a.readerCount)
        .slice(0, 5)
        .map(n => ({ title: n.title, readers: n.readerCount }));

      // Dataset B: Most Popular Authors (summing novel reader count per author)
      const allAuthors = AuthorModel.find().exec();
      const authorPopularity = allAuthors.map(author => {
        const authorNovels = allNovels.filter(n => String(n.authorId) === String(author._id));
        const totalReaders = authorNovels.reduce((sum, n) => sum + n.readerCount, 0);
        return {
          name: author.name,
          readers: totalReaders
        };
      }).sort((a, b) => b.readers - a.readers).slice(0, 5);

      // Dataset C: User Registration History (Simulated Monthly Data)
      const userRegistrations = [
        { month: 'Jan', count: 12 },
        { month: 'Feb', count: 19 },
        { month: 'Mar', count: 32 },
        { month: 'Apr', count: 48 },
        { month: 'May', count: 64 },
        { month: 'Jun', count: usersCount }
      ];

      // Dataset D: Active Readers (Simulated Active readers count monthly)
      const activeReadersMonthly = [
        { month: 'Jan', count: 8 },
        { month: 'Feb', count: 14 },
        { month: 'Mar', count: 22 },
        { month: 'Apr', count: 35 },
        { month: 'May', count: 45 },
        { month: 'Jun', count: activeReadersCount }
      ];

      res.render('admin-dashboard', {
        title: 'Admin Control Center',
        stats: {
          novelsCount,
          authorsCount,
          usersCount,
          activeReadersCount,
          reportedCommentsCount: reportedComments.length,
          pendingCount: pendingNovels.length + pendingAuthors.length + pendingPoems.length,
          totalRevenue
        },
        reportedComments,
        pendingNovels,
        pendingAuthors,
        pendingPoems,
        chartData: {
          mostReadNovels,
          authorPopularity,
          userRegistrations,
          activeReadersMonthly
        }
      });
    } catch (error) {
      console.error('Admin dashboard error:', error);
      res.status(500).render('error', { statusCode: 500, message: 'Could not load admin portal.' });
    }
  },

  // 2. Manage Novels
  getManageNovels: (req: Request, res: Response) => {
    try {
      const novels = NovelModel.find().exec();
      res.render('manage-novels', { title: 'Manage Novels', novels });
    } catch (error) {
      console.error('Manage novels error:', error);
      res.status(500).render('error', { statusCode: 500, message: 'Could not load novels manager.' });
    }
  },

  // GET Add Novel Form
  getAddNovel: (req: Request, res: Response) => {
    try {
      const authors = AuthorModel.find().exec();
      const categories = [
        'Romance', 'Mystery', 'Fantasy', 'Historical Fiction', 
        'African Literature', 'Science Fiction', 'Horror', 
        'Thriller', 'Adventure', 'Classics', 'Poetry', 'Drama'
      ];
      res.render('add-novel', { title: 'Add New Novel', authors, categories });
    } catch (error) {
      console.error('Add novel form load error:', error);
      res.status(500).render('error', { statusCode: 500, message: 'Could not open add novel form.' });
    }
  },

  // POST Add Novel Form
  postAddNovel: (req: Request, res: Response) => {
    const { title, authorId, genre, publicationYear, description, synopsis, contentText } = req.body;

    if (!title || !authorId || !genre || !publicationYear || !description || !synopsis || !contentText) {
      req.flash('error', 'All fields are required.');
      return res.redirect('/admin/novels/add');
    }

    try {
      const author = AuthorModel.findById(authorId);
      if (!author) {
        req.flash('error', 'Selected author does not exist.');
        return res.redirect('/admin/novels/add');
      }

      const coverImage = req.file ? `/uploads/${req.file.filename}` : 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=600&auto=format&fit=crop&q=80';

      // Split typed pages by markdown/custom double-newline delimiter
      const contentPages = contentText.split('\n\n---PAGE---\n\n').filter((p: string) => p.trim().length > 0);
      if (contentPages.length === 0) {
        contentPages.push(contentText);
      }

      NovelModel.create({
        title,
        authorId,
        authorName: author.name,
        genre,
        publicationYear: parseInt(publicationYear),
        description,
        synopsis,
        coverImage,
        rating: 5.0,
        ratingCount: 0,
        readerCount: 0,
        contentPages
      });

      // Update author novel count
      AuthorModel.findByIdAndUpdate(authorId, { novelCount: (author.novelCount || 0) + 1 });

      req.flash('success', 'Novel added successfully.');
      res.redirect('/admin/novels');
    } catch (error) {
      console.error('Add novel error:', error);
      req.flash('error', 'Could not add novel. Please verify parameters.');
      res.redirect('/admin/novels/add');
    }
  },

  // GET Edit Novel Form
  getEditNovel: (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const novel = NovelModel.findById(id);
      if (!novel) {
        req.flash('error', 'Novel not found.');
        return res.redirect('/admin/novels');
      }

      const authors = AuthorModel.find().exec();
      const categories = [
        'Romance', 'Mystery', 'Fantasy', 'Historical Fiction', 
        'African Literature', 'Science Fiction', 'Horror', 
        'Thriller', 'Adventure', 'Classics', 'Poetry', 'Drama'
      ];

      // Join pages with delimiter for editing
      const contentText = novel.contentPages.join('\n\n---PAGE---\n\n');

      res.render('edit-novel', { title: 'Edit Novel', novel, authors, categories, contentText });
    } catch (error) {
      console.error('Edit novel form load error:', error);
      res.status(500).render('error', { statusCode: 500, message: 'Could not open edit form.' });
    }
  },

  // POST Edit Novel Action
  postEditNovel: (req: Request, res: Response) => {
    const { id } = req.params;
    const { title, authorId, genre, publicationYear, description, synopsis, contentText } = req.body;

    if (!title || !authorId || !genre || !publicationYear || !description || !synopsis || !contentText) {
      req.flash('error', 'All fields are required.');
      return res.redirect(`/admin/novels/edit/${id}`);
    }

    try {
      const novel = NovelModel.findById(id);
      if (!novel) {
        req.flash('error', 'Novel not found.');
        return res.redirect('/admin/novels');
      }

      const author = AuthorModel.findById(authorId);
      if (!author) {
        req.flash('error', 'Selected author does not exist.');
        return res.redirect(`/admin/novels/edit/${id}`);
      }

      const updateData: any = {
        title,
        authorId,
        authorName: author.name,
        genre,
        publicationYear: parseInt(publicationYear),
        description,
        synopsis
      };

      if (req.file) {
        updateData.coverImage = `/uploads/${req.file.filename}`;
      }

      const contentPages = contentText.split('\n\n---PAGE---\n\n').filter((p: string) => p.trim().length > 0);
      if (contentPages.length === 0) {
        contentPages.push(contentText);
      }
      updateData.contentPages = contentPages;

      NovelModel.findByIdAndUpdate(id, updateData);

      // Adjust novel counts if author changed
      if (String(novel.authorId) !== String(authorId)) {
        const oldAuthor = AuthorModel.findById(novel.authorId);
        if (oldAuthor) {
          AuthorModel.findByIdAndUpdate(novel.authorId, { novelCount: Math.max(0, (oldAuthor.novelCount || 1) - 1) });
        }
        AuthorModel.findByIdAndUpdate(authorId, { novelCount: (author.novelCount || 0) + 1 });
      }

      req.flash('success', 'Novel updated successfully.');
      res.redirect('/admin/novels');
    } catch (error) {
      console.error('Edit novel error:', error);
      req.flash('error', 'Could not update novel.');
      res.redirect(`/admin/novels/edit/${id}`);
    }
  },

  // POST Delete Novel
  postDeleteNovel: (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const novel = NovelModel.findById(id);
      if (novel) {
        const author = AuthorModel.findById(novel.authorId);
        if (author) {
          AuthorModel.findByIdAndUpdate(novel.authorId, { novelCount: Math.max(0, (author.novelCount || 1) - 1) });
        }
        NovelModel.findByIdAndDelete(id);
        req.flash('success', 'Novel deleted successfully.');
      } else {
        req.flash('error', 'Novel not found.');
      }
      res.redirect('/admin/novels');
    } catch (error) {
      console.error('Delete novel error:', error);
      req.flash('error', 'Could not delete novel.');
      res.redirect('/admin/novels');
    }
  },

  // 3. Manage Authors
  getManageAuthors: (req: Request, res: Response) => {
    try {
      const authors = AuthorModel.find().exec();
      res.render('manage-authors', { title: 'Manage Authors', authors });
    } catch (error) {
      console.error('Manage authors error:', error);
      res.status(500).render('error', { statusCode: 500, message: 'Could not load authors manager.' });
    }
  },

  // GET Add Author Form
  getAddAuthor: (req: Request, res: Response) => {
    res.render('add-author', { title: 'Add New Author' });
  },

  // POST Add Author Form
  postAddAuthor: (req: Request, res: Response) => {
    const { name, bio, nationality, literaryAchievements, famousNovels } = req.body;

    if (!name || !bio || !nationality || !literaryAchievements || !famousNovels) {
      req.flash('error', 'All fields are required.');
      return res.redirect('/admin/authors/add');
    }

    try {
      const photo = req.file ? `/uploads/${req.file.filename}` : 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&auto=format&fit=crop&q=80';
      
      AuthorModel.create({
        name,
        bio,
        nationality,
        literaryAchievements,
        famousNovels,
        photo,
        novelCount: 0
      });

      req.flash('success', 'Author added successfully.');
      res.redirect('/admin/authors');
    } catch (error) {
      console.error('Add author error:', error);
      req.flash('error', 'Could not add author.');
      res.redirect('/admin/authors/add');
    }
  },

  // GET Edit Author Form
  getEditAuthor: (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const author = AuthorModel.findById(id);
      if (!author) {
        req.flash('error', 'Author not found.');
        return res.redirect('/admin/authors');
      }
      res.render('edit-author', { title: 'Edit Author', author });
    } catch (error) {
      console.error('Edit author form error:', error);
      res.status(500).render('error', { statusCode: 500, message: 'Could not open edit form.' });
    }
  },

  // POST Edit Author Action
  postEditAuthor: (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, bio, nationality, literaryAchievements, famousNovels } = req.body;

    if (!name || !bio || !nationality || !literaryAchievements || !famousNovels) {
      req.flash('error', 'All fields are required.');
      return res.redirect(`/admin/authors/edit/${id}`);
    }

    try {
      const updateData: any = {
        name,
        bio,
        nationality,
        literaryAchievements,
        famousNovels
      };

      if (req.file) {
        updateData.photo = `/uploads/${req.file.filename}`;
      }

      AuthorModel.findByIdAndUpdate(id, updateData);
      req.flash('success', 'Author details updated successfully.');
      res.redirect('/admin/authors');
    } catch (error) {
      console.error('Edit author error:', error);
      req.flash('error', 'Could not update author.');
      res.redirect(`/admin/authors/edit/${id}`);
    }
  },

  // POST Delete Author
  postDeleteAuthor: (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      AuthorModel.findByIdAndDelete(id);
      req.flash('success', 'Author deleted successfully.');
      res.redirect('/admin/authors');
    } catch (error) {
      console.error('Delete author error:', error);
      req.flash('error', 'Could not delete author.');
      res.redirect('/admin/authors');
    }
  },

  // 4. Manage Users
  getManageUsers: (req: Request, res: Response) => {
    try {
      const users = UserModel.find().exec();
      res.render('manage-users', { title: 'Manage Users', users });
    } catch (error) {
      console.error('Manage users error:', error);
      res.status(500).render('error', { statusCode: 500, message: 'Could not load users manager.' });
    }
  },

  // POST Toggle User Role
  postToggleUserRole: (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const user = UserModel.findById(id);
      if (user) {
        const newRole = user.role === 'admin' ? 'reader' : 'admin';
        UserModel.findByIdAndUpdate(id, { role: newRole });
        req.flash('success', `User role updated to ${newRole}.`);
      } else {
        req.flash('error', 'User not found.');
      }
      res.redirect('/admin/users');
    } catch (error) {
      console.error('Toggle role error:', error);
      req.flash('error', 'Could not update role.');
      res.redirect('/admin/users');
    }
  },

  // POST Suspend User (simulated delete or suspension flag, let's delete them cleanly)
  postSuspendUser: (req: Request, res: Response) => {
    const { id } = req.params;
    const adminUser = res.locals.user;
    if (String(adminUser._id) === String(id)) {
      req.flash('error', 'You cannot suspend yourself!');
      return res.redirect('/admin/users');
    }

    try {
      UserModel.findByIdAndUpdate(id, { status: 'suspended' });
      req.flash('success', 'User account suspended.');
      res.redirect('/admin/users');
    } catch (error) {
      console.error('Suspend user error:', error);
      req.flash('error', 'Could not suspend user.');
      res.redirect('/admin/users');
    }
  },

  // 5. Dismiss Reported Comment
  postDismissComment: (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      CommentModel.findByIdAndUpdate(id, { isReported: false });
      req.flash('success', 'Report dismissed.');
      res.redirect('/admin');
    } catch (error) {
      console.error('Dismiss comment error:', error);
      req.flash('error', 'Could not dismiss report.');
      res.redirect('/admin');
    }
  },

  getApprovals: (req: Request, res: Response) => {
    const pendingNovels = NovelModel.find({ approvalStatus: 'pending' }).sort({ createdAt: -1 }).exec();
    const pendingAuthors = AuthorModel.find({ approvalStatus: 'pending' }).sort({ createdAt: -1 }).exec();
    const pendingPoems = PoemModel.find({ approvalStatus: 'pending' }).sort({ createdAt: -1 }).exec();
    res.render('admin-approvals', {
      title: 'Approval Queue',
      pendingNovels,
      pendingAuthors,
      pendingPoems
    });
  },

  postApproveNovel: async (req: Request, res: Response) => {
    const novel = NovelModel.findById(req.params.id);
    if (!novel) return res.redirect('/admin/approvals');
    NovelModel.findByIdAndUpdate(novel._id, { approvalStatus: 'approved' });
    const submitter = novel.submittedBy ? UserModel.findById(novel.submittedBy) : null;
    if (submitter) {
      await EmailService.sendUploadApproved(submitter.email, submitter.username, 'novel', novel.title, `/novels/${novel._id}`);
    }
    req.flash('success', `"${novel.title}" approved and published.`);
    res.redirect('/admin/approvals');
  },

  postRejectNovel: async (req: Request, res: Response) => {
    const novel = NovelModel.findById(req.params.id);
    if (!novel) return res.redirect('/admin/approvals');
    const reason = req.body.reason || '';
    NovelModel.findByIdAndUpdate(novel._id, { approvalStatus: 'rejected', rejectionReason: reason });
    const submitter = novel.submittedBy ? UserModel.findById(novel.submittedBy) : null;
    if (submitter) {
      await EmailService.sendUploadRejected(submitter.email, submitter.username, 'novel', novel.title, reason);
    }
    req.flash('success', `"${novel.title}" rejected.`);
    res.redirect('/admin/approvals');
  },

  postApproveAuthor: async (req: Request, res: Response) => {
    const author = AuthorModel.findById(req.params.id);
    if (!author) return res.redirect('/admin/approvals');
    AuthorModel.findByIdAndUpdate(author._id, { approvalStatus: 'approved', verified: true });
    req.flash('success', `"${author.name}" approved.`);
    res.redirect('/admin/approvals');
  },

  postRejectAuthor: (req: Request, res: Response) => {
    const author = AuthorModel.findById(req.params.id);
    if (!author) return res.redirect('/admin/approvals');
    AuthorModel.findByIdAndUpdate(author._id, { approvalStatus: 'rejected' });
    req.flash('success', `"${author.name}" rejected.`);
    res.redirect('/admin/approvals');
  },

  postApprovePoem: async (req: Request, res: Response) => {
    const poem = PoemModel.findById(req.params.id);
    if (!poem) return res.redirect('/admin/approvals');
    PoemModel.findByIdAndUpdate(poem._id, { approvalStatus: 'approved' });
    const submitter = UserModel.findById(poem.submittedBy);
    if (submitter) {
      await EmailService.sendUploadApproved(submitter.email, submitter.username, 'poem', poem.title, `/poems/${poem._id}`);
    }
    req.flash('success', `"${poem.title}" approved and published.`);
    res.redirect('/admin/approvals');
  },

  postRejectPoem: async (req: Request, res: Response) => {
    const poem = PoemModel.findById(req.params.id);
    if (!poem) return res.redirect('/admin/approvals');
    const reason = req.body.reason || '';
    PoemModel.findByIdAndUpdate(poem._id, { approvalStatus: 'rejected', rejectionReason: reason });
    const submitter = UserModel.findById(poem.submittedBy);
    if (submitter) {
      await EmailService.sendUploadRejected(submitter.email, submitter.username, 'poem', poem.title, reason);
    }
    req.flash('success', `"${poem.title}" rejected.`);
    res.redirect('/admin/approvals');
  },

  postDeleteComment: (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      CommentModel.findByIdAndDelete(id);
      req.flash('success', 'Comment deleted successfully.');
      res.redirect('/admin');
    } catch (error) {
      console.error('Delete comment error:', error);
      req.flash('error', 'Could not delete comment.');
      res.redirect('/admin');
    }
  }
};
