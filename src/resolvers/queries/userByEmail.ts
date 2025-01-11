import { CfJwtAuthDataSource } from '@src/datasources';
import { UserByEmailInput } from 'generated';
import { GraphQLError } from 'graphql';

export const userByEmail = (
  _: unknown,
 { input }: { input: UserByEmailInput },
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
    return datasources.cfJwtAuthDataSource.userByEmail(input);
  } catch (error) {
    if (error instanceof GraphQLError) {
      // Re-throw GraphQL-specific errors
      throw error;
    }
    console.error('Unexpected error:', error);
    throw new GraphQLError('Failed to get user', {
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        error,
      },
    });
  }
};
