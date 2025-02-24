/* eslint-disable @typescript-eslint/naming-convention */

import { DrizzleD1Database } from 'drizzle-orm/d1';
import {
  AdminKvAsset,
  AdminKvAssetInput,
  ChangePasswordInput,
  DeleteUserInput,
  EditUserInput,
  LoginInput,
  SignUpInput,
  UserByEmailInput,
  UserByFieldInput,
} from 'generated';
import { and, eq, like } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import { nanoid } from 'nanoid';
import { Role, user } from 'db/schema/user';
import bcrypt from 'bcryptjs';
import { verifyToken } from '@src/resolvers/mutations/helper/jwtUtils';

export class CfJwtAuthDataSource {
  private readonly db: DrizzleD1Database;
  private readonly role: Role;
  private readonly kv: KVNamespace;
  private readonly accessToken: string | null;
  private readonly jwtSecret: string;
  constructor({
    db,
    role,
    jwtKV,
    accessToken,
    jwtSecret,
  }: {
    db: DrizzleD1Database;
    role: Role;
    jwtKV: KVNamespace;
    accessToken: string | null;
    jwtSecret: string;
  }) {
    this.db = db;
    this.role = role;
    this.kv = jwtKV;
    this.accessToken = accessToken;
    this.jwtSecret = jwtSecret;
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
          ...(input.role && this.role === Role.ADMIN && { role: input.role === 'ADMIN' ? Role.ADMIN : Role.USER }),
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

  async incrementTokenVersion(email: string): Promise<boolean> {
    // Retrieve the current token version from KV using the user's email as the key.
    const currentVersionStr = await this.kv.get(`user:${email}:tokenVersion`);
    let currentVersion = currentVersionStr ? parseInt(currentVersionStr) : 0;

    // Increment the version so that tokens with the old version are now invalid.
    currentVersion++;
    await this.kv.put(`user:${email}:tokenVersion`, currentVersion.toString());
    return true;
  }

  async changePassword(input: ChangePasswordInput) {
    try {
      const result_user = await this.getUserById(input.id);
      if (this.role !== Role.ADMIN && this.accessToken) {
        const jwtPayload = await verifyToken(this.accessToken, this.jwtSecret, this.kv);
        if (result_user.email !== jwtPayload.email) {
          console.log('You are not authorized to change another users password');
          throw new GraphQLError('You are not authorized to change another users password', {
            extensions: {
              code: 'FORBIDDEN',
            },
          });
        }
      }
      await this.validateCurrentPassword(input.current_password, result_user.password);
      return await this.updatePassword(input.id, input.new_password);
    } catch (error) {
      this.handleError(error, 'Failed to change password');
    }
  }

  async adminKvAsset(input: AdminKvAssetInput): Promise<AdminKvAsset> {
    try {
      // fetch the admin kv asset from kv store
      const result = await this.kv.get(input.kv_key.toString());
      return {
        kv_key: input.kv_key,
        kv_value: result ? JSON.parse(result) : null,
      };
    } catch (error) {
      console.error('Unexpected error:', error);
      throw new GraphQLError('Failed to get admin kv asset', {
        extensions: {
          code: 'INTERNAL_SERVER_ERROR',
          error,
        },
      });
    }
  }
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

  private async validateCurrentPassword(currentPassword: string, storedPassword: string) {
    const isPasswordMatch = await bcrypt.compare(currentPassword, storedPassword);
    if (!isPasswordMatch) {
      throw new GraphQLError('Invalid current password', {
        extensions: {
          code: 'UNAUTHORIZED',
        },
      });
    }
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

  private handleError(error: unknown, message: string) {
    console.error('error', error);
    if (error instanceof GraphQLError || error instanceof Error) {
      throw new GraphQLError(`${message} ${error.message ? '- ' + error.message : ''}`, {
        extensions: {
          code: error instanceof GraphQLError ? error.extensions.code : 'INTERNAL_SERVER_ERROR',
          error: error.message,
        },
      });
    }
    throw new GraphQLError(`${message} due to an unexpected error`, {
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        error,
      },
    });
  }
}
