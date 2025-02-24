import { CfJwtAuthDataSource } from '@src/datasources';
import { GraphQLError } from 'graphql';
import jwt from 'jsonwebtoken';
import { TokenPayload } from './helper/jwtUtils';

export const logout = async (
  _: unknown,
  __: unknown,
  {
    datasources: { cfJwtAuthDataSource },
    accessToken,
    jwtSecret,
  }: { datasources: { cfJwtAuthDataSource: CfJwtAuthDataSource }; accessToken: string | null; jwtSecret: string }
) => {
  try {
    if (!accessToken) {
      throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHORIZED' },
      });
    }

    let payload: TokenPayload;
    try {
      payload = jwt.verify(accessToken, jwtSecret) as TokenPayload;
    } catch (error) {
      throw new GraphQLError('Invalid token', {
        extensions: { code: 'UNAUTHORIZED' },
      });
    }

    await cfJwtAuthDataSource.getKvStorageAPI().incrementTokenVersion(payload.email);

    return { success: true };
  } catch (error) {
    if (error instanceof GraphQLError || error instanceof Error) {
      // Re-throw GraphQL-specific errors
      throw error;
    }
    console.error('Unexpected error:', error);
    throw new GraphQLError('Failed to logout', {
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        error,
      },
    });
  }
};
