import { CfJwtAuthDataSource, SessionUserType } from '@src/datasources';
import { EditUserInput } from 'generated';
import { GraphQLError } from 'graphql';
import { validateUserAccess } from './helper/userAccessValidators';

export const editUser = async (
  _: unknown,
  { input }: { input: EditUserInput },
  {
    datasources,
    accessToken,
    sessionUser,
  }: { datasources: { cfJwtAuthDataSource: CfJwtAuthDataSource }; accessToken: string | null; sessionUser: SessionUserType }
) => {
  try {
    validateUserAccess(accessToken, sessionUser, { id: input.id });
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
