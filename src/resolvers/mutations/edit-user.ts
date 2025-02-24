import { CfJwtAuthDataSource } from '@src/datasources';
import { EditUserInput } from 'generated';
import { GraphQLError } from 'graphql';
import { Role } from 'db/schema/user';

export const editUser = async (
  _: unknown,
  { input }: { input: EditUserInput },
  { datasources, accessToken, role }: { datasources: { cfJwtAuthDataSource: CfJwtAuthDataSource }; accessToken: string | null; role: Role }
) => {
  try {
    //validateUserAccess(accessToken, role);
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
