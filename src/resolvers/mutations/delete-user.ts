import { CfJwtAuthDataSource } from '@src/datasources';
import { DeleteUserInput } from 'generated';
import { GraphQLError } from 'graphql';

export const deleteUser = async (
  _: unknown,
  { input }: { input: DeleteUserInput },
  { datasources }: { datasources: { cfJwtAuthDataSource: CfJwtAuthDataSource } }
) => {
  try {
    // Delete user
    return await datasources.cfJwtAuthDataSource.deleteUser(input);
  } catch (error) {
    if (error instanceof GraphQLError) {
      // Re-throw GraphQL-specific errors
      throw error;
    }
    console.error('Unexpected error:', error);
    throw new GraphQLError('Failed to sign up', {
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        error,
      },
    });
  }
};
