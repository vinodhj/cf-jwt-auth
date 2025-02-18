/* eslint-disable @typescript-eslint/naming-convention */

import { DrizzleD1Database } from 'drizzle-orm/d1';
import { DeleteUserInput, EditUserInput, LoginInput, SignUpInput, UserByEmailInput, UserByFieldInput } from 'generated';
import { eq, like } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import { nanoid } from 'nanoid';
import { Role, user } from 'db/schema/user';
import bcrypt from 'bcryptjs';

export class CfJwtAuthDataSource {
  private readonly db: DrizzleD1Database;
  private readonly role: Role;
  constructor({ db, role }: { db: DrizzleD1Database; role: Role }) {
    this.db = db;
    this.role = role;
  }

  async signUp(input: SignUpInput) {
    try {
      const hashedPassword = await bcrypt.hash(input.password, 10);

      const result = await this.db
        .insert(user)
        .values({
          id: nanoid(),
          name: input.name,
          email: input.email,
          password: hashedPassword,
          role: input.role === 'ADMIN' ? Role.ADMIN : Role.USER,
        })
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
      console.log('error', error);
      if (error instanceof GraphQLError || error instanceof Error) {
        //to throw GraphQLError/original error
        throw new GraphQLError(`Failed to sign up ${error.message ? '- ' + error.message : ''}`, {
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
            error: error.message,
          },
        });
      }
      throw new GraphQLError('Failed to sign up due to an unexpected error', {
        extensions: {
          code: 'INTERNAL_SERVER_ERROR',
          error,
        },
      });
    }
  }

  async login(input: LoginInput) {
    try {
      const result = await this.db.select().from(user).where(eq(user.email, input.email)).get();
      if (!result) {
        throw new GraphQLError('User not found', {
          extensions: {
            code: 'NOT_FOUND',
          },
        });
      }
      const isPasswordMatch = await bcrypt.compare(input.password, result.password);
      if (!isPasswordMatch) {
        throw new GraphQLError('Invalid password', {
          extensions: {
            code: 'UNAUTHORIZED',
          },
        });
      }

      const { password, ...userWithoutPassword } = result;

      return {
        success: true,
        user: {
          ...userWithoutPassword,
        },
      };
    } catch (error) {
      console.error('error', error);
      if (error instanceof GraphQLError || error instanceof Error) {
        //to throw GraphQLError/original error
        throw new GraphQLError(`Failed to login ${error.message ? '- ' + error.message : ''}`, {
          extensions: {
            code: error instanceof GraphQLError ? error.extensions.code : 'INTERNAL_SERVER_ERROR',
            error: error.message,
          },
        });
      }
      throw new GraphQLError('Failed to login due to an unexpected error', {
        extensions: {
          code: 'INTERNAL_SERVER_ERROR',
          error,
        },
      });
    }
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
          role: input.role === 'ADMIN' ? Role.ADMIN : Role.USER,
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
      throw new GraphQLError('Failed to delete user', {
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
