import { CfJwtAuthDataSource } from '@src/datasources';
import { EditUserInput } from 'generated';
import { GraphQLError } from 'graphql';

export const editUser = async (
  _: unknown,
  { input }: { input: EditUserInput },
  { datasources }: { datasources: { cfJwtAuthDataSource: CfJwtAuthDataSource } }
) => {
  try {
    // edit user
    return await datasources.cfJwtAuthDataSource.editUser(input);
  } catch (error) {
    if (error instanceof GraphQLError) {
      // Re-throw GraphQL-specific errors
      throw error;
    }
    console.error('Unexpected error:', error);
    throw new GraphQLError('Failed to edit user', {
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        error,
      },
    });
  }
};
