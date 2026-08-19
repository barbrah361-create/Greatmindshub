import app, { bootstrapPromise } from '../server.js';

export default async function handler(req: any, res: any) {
  try {
    await bootstrapPromise;
    return app(req, res);
  } catch (err: any) {
    console.error('Vercel API Handler Error:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err?.message || String(err) });
  }
}
