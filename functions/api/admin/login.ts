
import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';
import { Env } from '../../types';

const app = new Hono<{ Bindings: Env }>();

app.post('/api/admin/login', async (c) => {
    const { password } = await c.req.json();

    // Check against environment variable
    if (password === c.env.ADMIN_PASSWORD) {
        // Simple token: In a real app, use JWT. 
        // For this scale, a static session token or just hashing the password + secret is fine.
        // Let's just return a "session token" which is actually just a hash of the password to keep it stateless.
        // Or even simpler: Since we use HTTPS, we can just return a success flag and have the frontend send the password (or a hash) in header?
        // Better: Return a simple token.
        const token = btoa(`admin:${c.env.ADMIN_PASSWORD}`); // Basic auth style token for simplicity
        return c.json({ success: true, token });
    }

    return c.json({ error: 'Invalid password' }, 401);
});

export const onRequest = handle(app);
