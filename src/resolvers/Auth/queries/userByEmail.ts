import { CfJwtAuthDataSource, SessionUserType } from '@src/datasources';
import { UserByEmailInput } from 'generated';
import { GraphQLError } from 'graphql';
import { validateUserAccess } from '../mutations/helper/userAccessValidators';

export const userByEmail = (
  _: unknown,
  { input }: { input: UserByEmailInput },
  {
    datasources,
    accessToken,
    sessionUser,
  }: { datasources: { cfJwtAuthDataSource: CfJwtAuthDataSource }; accessToken: string | null; sessionUser: SessionUserType }
) => {
  try {
    validateUserAccess(accessToken, sessionUser, { email: input.email });
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
