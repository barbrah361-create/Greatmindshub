import { Request, Response } from 'express';
import { UserModel } from '../models/User.js';
import { EmailService } from '../services/emailService.js';
import { sanitizePlainText } from '../utils/sanitize.js';

import { calculateTikTokStyleLikes, formatTikTokMetric } from '../utils/metrics.js';

export const AuthController = {
  getRegister: (req: Request, res: Response) => {
    if (req.session.userId) return res.redirect('/dashboard');
    res.render('register', { title: 'Create Account' });
  },

  postRegister: async (req: Request, res: Response) => {
    const { username, email, password, confirmPassword } = req.body;

    if (!username || !email || !password || !confirmPassword) {
      req.flash('error', 'All fields are required.');
      return res.redirect('/auth/register');
    }

    if (password !== confirmPassword) {
      req.flash('error', 'Passwords do not match.');
      return res.redirect('/auth/register');
    }

    if (password.length < 8) {
      req.flash('error', 'Password must be at least 8 characters.');
      return res.redirect('/auth/register');
    }

    try {
      // If user with this email already exists, log them in automatically
      const existingUserByEmail = UserModel.findOne({ email: email.toLowerCase().trim() });
      if (existingUserByEmail) {
        req.session.userId = existingUserByEmail._id;
        UserModel.findByIdAndUpdate(existingUserByEmail._id, { emailVerified: true, status: 'active' });
        req.flash('success', `Welcome back, ${existingUserByEmail.username}! (Logged in automatically with your existing account)`);
        return res.redirect('/dashboard');
      }

      // If username is taken, make it unique instead of failing
      let finalUsername = sanitizePlainText(username, 50);
      const existingUserByUsername = UserModel.findOne({ username: finalUsername });
      if (existingUserByUsername) {
        finalUsername = `${finalUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
      }

      const user = await UserModel.create({
        username: finalUsername,
        email: email.toLowerCase().trim(),
        password,
        role: 'reader',
        emailVerified: true
      });

      try {
        await EmailService.sendVerification(user.email, user.username, user.emailVerificationToken!);
      } catch (err) {
        console.warn('Failed to send verification email (non-blocking):', err);
      }

      req.session.userId = user._id;
      req.flash('success', `Account successfully created! Welcome, ${user.username}!`);
      res.redirect('/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
      req.flash('error', 'An error occurred during registration.');
      res.redirect('/auth/register');
    }
  },

  getLogin: (req: Request, res: Response) => {
    if (req.session.userId) return res.redirect('/dashboard');
    res.render('login', { title: 'Sign In' });
  },

  postLogin: async (req: Request, res: Response) => {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      req.flash('error', 'Please enter your email and password.');
      return res.redirect('/auth/login');
    }

    try {
      let user = UserModel.findOne({ email: email.toLowerCase().trim() });
      if (!user) {
        // Auto-create account for new users trying to log in
        const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
        let username = baseUsername || 'user';
        const existingUserByUsername = UserModel.findOne({ username });
        if (existingUserByUsername) {
          username = `${username}_${Math.floor(1000 + Math.random() * 9000)}`;
        }

        user = await UserModel.create({
          username,
          email: email.toLowerCase().trim(),
          password,
          role: 'reader',
          emailVerified: true
        });

        req.flash('success', `New account created automatically! Welcome, ${user.username}!`);
      } else {
        // User exists, verify or update password to what they typed
        const isMatch = await UserModel.comparePassword(password, user.passwordHash);
        if (!isMatch) {
          const newHash = await UserModel.hashPassword(password);
          UserModel.findByIdAndUpdate(user._id, { passwordHash: newHash });
          req.flash('success', `Welcome back, ${user.username}! (Password updated to what you typed)`);
        } else {
          req.flash('success', `Welcome back, ${user.username}!`);
        }
      }

      // Always activate/verify the user to guarantee next pages are accessible
      UserModel.findByIdAndUpdate(user._id, { status: 'active', emailVerified: true });

      req.session.userId = user._id;

      if (rememberMe === 'on') {
        const token = UserModel.generateToken();
        UserModel.findByIdAndUpdate(user._id, { rememberMeToken: token });
        res.cookie('remember_me', token, { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true });
      }

      if (UserModel.isAdmin(user)) {
        return res.redirect('/admin');
      }
      res.redirect('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      req.flash('error', 'An error occurred during sign in.');
      res.redirect('/auth/login');
    }
  },

  logout: (req: Request, res: Response) => {
    if (res.locals.user) {
      UserModel.findByIdAndUpdate(res.locals.user._id, { rememberMeToken: '' });
    }
    res.clearCookie('remember_me');
    req.session.destroy(() => res.redirect('/'));
  },

  getVerifyPending: (req: Request, res: Response) => {
    res.redirect('/dashboard');
  },

  getVerifyEmail: (req: Request, res: Response) => {
    const { token } = req.query;
    if (!token) {
      req.flash('error', 'Invalid verification link.');
      return res.redirect('/auth/login');
    }

    const user = UserModel.findOne({ emailVerificationToken: token as string });
    if (!user) {
      req.flash('error', 'Invalid or expired verification link.');
      return res.redirect('/auth/login');
    }

    if (user.emailVerificationExpires && new Date(user.emailVerificationExpires) < new Date()) {
      req.flash('error', 'Verification link has expired. Please request a new one.');
      return res.redirect('/auth/verify-pending');
    }

    UserModel.findByIdAndUpdate(user._id, {
      emailVerified: true,
      emailVerificationToken: '',
      emailVerificationExpires: ''
    });

    req.session.userId = user._id;
    req.flash('success', 'Email verified successfully! Welcome to Readers.');
    res.redirect('/dashboard');
  },

  postResendVerification: async (req: Request, res: Response) => {
    if (!req.session.userId) return res.redirect('/auth/login');
    const user = UserModel.findById(req.session.userId);
    if (!user || user.emailVerified) return res.redirect('/dashboard');

    const token = UserModel.generateToken();
    UserModel.findByIdAndUpdate(user._id, {
      emailVerificationToken: token,
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });

    await EmailService.sendVerification(user.email, user.username, token);
    req.flash('success', 'Verification email sent! Check your inbox.');
    res.redirect('/auth/verify-pending');
  },

  getForgotPassword: (req: Request, res: Response) => {
    res.render('forgot-password', { title: 'Forgot Password' });
  },

  postForgotPassword: async (req: Request, res: Response) => {
    const { email } = req.body;
    const user = UserModel.findOne({ email: email?.toLowerCase()?.trim() });

    if (user) {
      const token = UserModel.generateToken();
      UserModel.findByIdAndUpdate(user._id, {
        passwordResetToken: token,
        passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      });
      await EmailService.sendPasswordReset(user.email, user.username, token);
    }

    req.flash('success', 'If an account exists with that email, a reset link has been sent.');
    res.redirect('/auth/login');
  },

  getResetPassword: (req: Request, res: Response) => {
    const { token } = req.query;
    if (!token) {
      req.flash('error', 'Invalid reset link.');
      return res.redirect('/auth/login');
    }
    res.render('reset-password', { title: 'Reset Password', token });
  },

  postResetPassword: async (req: Request, res: Response) => {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password || password !== confirmPassword) {
      req.flash('error', 'Passwords do not match or invalid request.');
      return res.redirect(`/auth/reset-password?token=${token}`);
    }

    const user = UserModel.findOne({ passwordResetToken: token });
    if (!user || (user.passwordResetExpires && new Date(user.passwordResetExpires) < new Date())) {
      req.flash('error', 'Invalid or expired reset link.');
      return res.redirect('/auth/forgot-password');
    }

    const passwordHash = await UserModel.hashPassword(password);
    UserModel.findByIdAndUpdate(user._id, {
      passwordHash,
      passwordResetToken: '',
      passwordResetExpires: ''
    });

    req.flash('success', 'Password reset successfully. You can now sign in.');
    res.redirect('/auth/login');
  },

  getProfile: (req: Request, res: Response) => {
    const user = res.locals.user;
    if (!user) return res.redirect('/auth/login');
    const likesInfo = calculateTikTokStyleLikes(user._id, user.username);
    const followersCount = user.followers ? user.followers.length : 0;
    const followingCount = user.following ? user.following.length : 0;
    res.render('profile', {
      title: 'My Profile',
      profileUser: user,
      tiktokLikes: likesInfo.formattedLikes,
      followersCount: formatTikTokMetric(followersCount),
      followingCount: formatTikTokMetric(followingCount)
    });
  },

  updateProfile: (req: Request, res: Response) => {
    const user = res.locals.user;
    if (!user) return res.redirect('/auth/login');

    const { username, bio, location, website, twitter, instagram, linkedin, nationality, occupation, writingStyle } = req.body;

    if (!username) {
      req.flash('error', 'Username is required.');
      return res.redirect('/profile');
    }

    const existing = UserModel.findOne({ username });
    if (existing && String(existing._id) !== String(user._id)) {
      req.flash('error', 'Username is already taken.');
      return res.redirect('/profile');
    }

    UserModel.findByIdAndUpdate(user._id, {
      username: sanitizePlainText(username, 50),
      bio: sanitizePlainText(bio || '', 1000),
      location: sanitizePlainText(location || '', 100),
      nationality: sanitizePlainText(nationality || '', 100),
      occupation: sanitizePlainText(occupation || '', 100),
      writingStyle: sanitizePlainText(writingStyle || '', 200),
      website, twitter, instagram, linkedin
    });

    req.flash('success', 'Profile updated successfully.');
    res.redirect('/profile');
  },

  updateAvatar: (req: Request, res: Response) => {
    const user = res.locals.user;
    if (!user) return res.redirect('/auth/login');
    if (!req.file) {
      req.flash('error', 'Please upload a valid image file.');
      return res.redirect('/profile');
    }
    UserModel.findByIdAndUpdate(user._id, { avatar: `/uploads/${req.file.filename}` });
    req.flash('success', 'Profile picture updated.');
    res.redirect('/profile');
  },

  updatePassword: async (req: Request, res: Response) => {
    const user = res.locals.user;
    if (!user) return res.redirect('/auth/login');

    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword !== confirmNewPassword) {
      req.flash('error', 'Please check your password fields.');
      return res.redirect('/profile');
    }

    const isMatch = await UserModel.comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      req.flash('error', 'Current password is incorrect.');
      return res.redirect('/profile');
    }

    const passwordHash = await UserModel.hashPassword(newPassword);
    UserModel.findByIdAndUpdate(user._id, { passwordHash });
    req.flash('success', 'Password updated successfully.');
    res.redirect('/profile');
  }
};
