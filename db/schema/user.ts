import { text, integer, sqliteTable } from 'drizzle-orm/sqlite-core';

export enum Role {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export const user = sqliteTable('user', {
  id: text('id').primaryKey(), // nano id
  name: text('name').notNull(),
  email: text('email').notNull(),
  password: text('password').notNull(),
  role: text('role', { enum: ['ADMIN', 'USER'] })
    .notNull()
    .$type<Role>(),
  created_at: integer('created_at', { mode: 'timestamp_ms' })
    .$default(() => new Date())
    .notNull(),
  updated_at: integer('updated_at', { mode: 'timestamp_ms' })
    .$default(() => new Date())
    .notNull(),
});
