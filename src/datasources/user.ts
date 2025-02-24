import { DrizzleD1Database } from 'drizzle-orm/d1';
import { DeleteUserInput, EditUserInput, UserByEmailInput, UserByFieldInput } from 'generated';
import { eq, like } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import { Role, user } from 'db/schema/user';
import { SessionUserType } from '.';

export class UserDataSource {
  private readonly db: DrizzleD1Database;
  private readonly kv: KVNamespace;
  private readonly sessionUser: SessionUserType;

  constructor({ db, jwtKV, sessionUser }: { db: DrizzleD1Database; jwtKV: KVNamespace; sessionUser: SessionUserType }) {
    this.db = db;
    this.kv = jwtKV;
    this.sessionUser = sessionUser;
  }

  async users() {
    try {
      return this.db.select().from(user).execute();
    } catch (error) {
      console.error('Unexpected error:', error);
      throw new GraphQLError('Failed to get users', {
        extensions: {
          code: 'INTERNAL_SERVER_ERROR',
          error,
        },
      });
    }
  }

  async userByEmail(input: UserByEmailInput) {
    try {
      return this.db.select().from(user).where(eq(user.email, input.email)).get();
    } catch (error) {
      console.error('Unexpected error:', error);
      throw new GraphQLError('Failed to get user', {
        extensions: {
          code: 'INTERNAL_SERVER_ERROR',
          error,
        },
      });
    }
  }

  async userByfield(input: UserByFieldInput) {
    try {
      if (input.field === 'name') {
        return this.db.select().from(user).where(like(user.name, input.value)).execute();
      }
      return this.db.select().from(user).where(eq(user[input.field], input.value)).execute();
    } catch (error) {
      console.error('Unexpected error:', error);
      throw new GraphQLError('Failed to get user', {
        extensions: {
          code: 'INTERNAL_SERVER_ERROR',
          error,
        },
      });
    }
  }

  async editUser(input: EditUserInput) {
    try {
      const result = await this.db
        .update(user)
        .set({
          name: input.name,
          email: input.email,
          ...(input.role && { role: input.role === 'ADMIN' ? Role.Admin : Role.User }),
          updated_at: new Date(),
        })
        .where(eq(user.id, input.id))
        .returning()
        .get();

      const { password, ...userWithoutPassword } = result;
      return {
        success: true,
        user: {
          ...userWithoutPassword,
        },
      };
    } catch (error) {
      console.error('Unexpected error:', error);
      throw new GraphQLError('Failed to edit user', {
        extensions: {
          code: 'INTERNAL_SERVER_ERROR',
          error,
        },
      });
    }
  }

  async deleteUser(input: DeleteUserInput) {
    try {
      const deleted = await this.db.delete(user).where(eq(user.id, input.id)).execute();
      if (deleted && deleted.success) {
        if (deleted.meta.changed_db) {
          return true;
        } else {
          console.warn(`User not deleted. Changes: ${deleted.meta.changes}`);
          return false;
        }
      } else {
        console.error('Delete operation failed:', deleted);
        return false;
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      throw new GraphQLError('Failed to delete user', {
        extensions: {
          code: 'INTERNAL_SERVER_ERROR',
          error,
        },
      });
    }
  }
}
