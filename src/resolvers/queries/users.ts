import { CfJwtAuthDataSource } from '@src/datasources';
import { GraphQLError } from 'graphql';

export const users = (
  _: unknown,
  __: unknown,
  { datasources, accessToken }: { datasources: { cfJwtAuthDataSource: CfJwtAuthDataSource }; accessToken: string | null }
) => {
  try {
    if (!accessToken) {
      throw new GraphQLError('Unauthorized', {
        extensions: {
          code: 'UNAUTHORIZED',
        },
      });
    }
    return datasources.cfJwtAuthDataSource.users();
  } catch (error) {
    if (error instanceof GraphQLError) {
      // Re-throw GraphQL-specific errors
      throw error;
    }
    console.error('Unexpected error:', error);
    throw new GraphQLError('Failed to get users', {
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        error,
      },
    });
  }
};
