# Readers Africa

Readers Africa is a production-ready digital reading ecosystem for African literature, poetry, and author discovery. The platform preserves the existing design language while extending the experience with richer authentication, publishing workflows, discovery, social reading features, premium experiences, and deployment-ready configuration.

## Highlights
- Reader, author, and admin authentication with role-aware routing
- Profiles with avatars, bios, reading streaks, and achievement surfaces
- Publishing workflows for novels, poetry, and short stories
- Bookmarking, reading history, continue-reading, progress tracking, and recommendations
- Advanced search, likes, comments, replies, follows, leaderboards, and notifications
- Premium and M-Pesa-ready payment hooks for subscriptions, publishing fees, and tips
- PWA support, responsive layouts, accessibility improvements, loading states, and error handling
- React Native Expo app support using the same backend APIs

## Run locally
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

## Deployment notes
- Set environment variables for session secrets, admin credentials, and M-Pesa credentials
- Ensure the public upload folder exists for avatars and covers
- Use a production reverse proxy and HTTPS for secure sessions
