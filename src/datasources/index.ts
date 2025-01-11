/* eslint-disable @typescript-eslint/naming-convention */

import { DrizzleD1Database } from 'drizzle-orm/d1';
import { LoginInput, SignUpInput, UserByEmailInput } from 'generated';
import { eq } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import { nanoid } from 'nanoid';
import { Role, user } from 'db/schema/user';
import bcrypt from 'bcryptjs';

export class CfJwtAuthDataSource {
  private db: DrizzleD1Database;
  constructor({ db }: { db: DrizzleD1Database }) {
    this.db = db;
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
          role: Role.USER,
        })
        .returning()
        .get();
      return {
        success: true,
        user: {
          ...result,
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
      throw new GraphQLError('Failed to sign up', {
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

      return {
        success: true,
        user: {
          ...result,
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
      throw new GraphQLError('Failed to login', {
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
}
