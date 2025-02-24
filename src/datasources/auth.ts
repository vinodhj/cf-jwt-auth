import { DrizzleD1Database } from 'drizzle-orm/d1';
import { ChangePasswordInput, LoginInput, SignUpInput } from 'generated';
import { and, eq } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import { nanoid } from 'nanoid';
import { Role, user } from 'db/schema/user';
import bcrypt from 'bcryptjs';
import { SessionUserType } from '.';
import { handleError, validateCurrentPassword } from './utils';

export class AuthDataSource {
  private readonly db: DrizzleD1Database;
  private readonly kv: KVNamespace;
  private readonly sessionUser: SessionUserType;

  constructor({ db, jwtKV, sessionUser }: { db: DrizzleD1Database; jwtKV: KVNamespace; sessionUser: SessionUserType }) {
    this.db = db;
    this.kv = jwtKV;
    this.sessionUser = sessionUser;
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
          role: input.role === 'ADMIN' ? Role.Admin : Role.User,
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

      // Fetch the current token version for this user (default to 0 if not set)
      const currentVersionStr = await this.kv.get(`user:${input.email}:tokenVersion`);
      const currentVersion = currentVersionStr ? parseInt(currentVersionStr) : 0;

      const { password, ...userWithoutPassword } = result;

      return {
        success: true,
        user: {
          ...userWithoutPassword,
        },
        token_version: currentVersion,
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

  async changePassword(input: ChangePasswordInput) {
    try {
      const result_user = await this.getUserById(input.id);
      await validateCurrentPassword(input.current_password, result_user.password);
      return await this.updatePassword(input.id, input.new_password);
    } catch (error) {
      handleError(error, 'Failed to change password');
    }
  }

  // need to call from another service
  private async getUserById(id: string) {
    const result_user = await this.db.select().from(user).where(eq(user.id, id)).get();
    if (!result_user) {
      throw new GraphQLError('User not found', {
        extensions: {
          code: 'NOT_FOUND',
        },
      });
    }
    return result_user;
  }

  private async updatePassword(id: string, newPassword: string) {
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    const result = await this.db
      .update(user)
      .set({
        password: hashedNewPassword,
        updated_at: new Date(),
      })
      .where(and(eq(user.id, id)))
      .execute();

    if (result && result.success) {
      if (result.meta.changed_db) {
        return true;
      } else {
        console.warn(`Password not updated. Changes: ${result.meta.changes}`);
        return false;
      }
    }
  }
}
