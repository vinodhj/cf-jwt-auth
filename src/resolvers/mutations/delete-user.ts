import { CfJwtAuthDataSource } from '@src/datasources';
import { DeleteUserInput } from 'generated';
import { GraphQLError } from 'graphql';
import { Role } from 'db/schema/user';
import { validateUserAccess } from './helper/userAccessValidators';

export const deleteUser = async (
  _: unknown,
  { input }: { input: DeleteUserInput },
  { datasources, accessToken, role }: { datasources: { cfJwtAuthDataSource: CfJwtAuthDataSource }; accessToken: string | null; role: Role }
) => {
  try {
    validateUserAccess(accessToken, role);
    // Delete user
    return await datasources.cfJwtAuthDataSource.deleteUser(input);
  } catch (error) {
    if (error instanceof GraphQLError) {
      // Re-throw GraphQL-specific errors
      throw error;
    }
    console.error('Unexpected error:', error);
    throw new GraphQLError('Failed to delete user', {
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        error,
      },
    });
  }
};
