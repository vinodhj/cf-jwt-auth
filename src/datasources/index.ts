/* eslint-disable @typescript-eslint/naming-convention */

import { DrizzleD1Database } from 'drizzle-orm/d1';
import { SignUpInput } from 'generated';
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
      console.log("error", error);
      if (error instanceof GraphQLError || error instanceof Error) {
        //to throw GraphQLError/original error
        throw new GraphQLError(`Failed to sign up ${error.message ? "- "+error.message : "" }`, {
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
}
