import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { db } from './db';
import { users, properties, bookings } from './db/schema';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors());

// Health check
app.get('/', (c) => {
  return c.json({ message: 'RentSafe-ai API is running!' });
});

app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Users API
app.get('/api/users', async (c) => {
  const allUsers = await db.select().from(users);
  return c.json(allUsers);
});

app.get('/api/users/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const user = await db.select().from(users).where((u, { eq }) => eq(u.id, id));
  if (!user.length) {
    return c.json({ error: 'User not found' }, 404);
  }
  return c.json(user[0]);
});

// Properties API
app.get('/api/properties', async (c) => {
  const allProperties = await db.select().from(properties);
  return c.json(allProperties);
});

app.get('/api/properties/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const property = await db.select().from(properties).where((p, { eq }) => eq(p.id, id));
  if (!property.length) {
    return c.json({ error: 'Property not found' }, 404);
  }
  return c.json(property[0]);
});

// Bookings API
app.get('/api/bookings', async (c) => {
  const allBookings = await db.select().from(bookings);
  return c.json(allBookings);
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

export default {
  port: process.env.PORT || 8000,
  fetch: app.fetch,
};
