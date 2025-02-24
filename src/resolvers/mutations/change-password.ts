import { CfJwtAuthDataSource, SessionUserType } from '@src/datasources';
import { ChangePasswordInput } from 'generated';
import { GraphQLError } from 'graphql';
import { changePasswordValidators } from './helper/changePasswordValidators';
import { validateUserAccess } from './helper/userAccessValidators';

export const changePassword = async (
  _: unknown,
  { input }: { input: ChangePasswordInput },
  {
    datasources,
    accessToken,
    sessionUser,
  }: { datasources: { cfJwtAuthDataSource: CfJwtAuthDataSource }; accessToken: string | null; sessionUser: SessionUserType }
) => {
  try {
    validateUserAccess(accessToken, sessionUser, { id: input.id });
    // Validate inputs
    changePasswordValidators(input.current_password, input.new_password, input.confirm_password);

    // Change password
    return await datasources.cfJwtAuthDataSource.changePassword(input);
  } catch (error) {
    if (error instanceof GraphQLError) {
      // Re-throw GraphQL-specific errors
      throw error;
    }
    console.error('Unexpected error:', error);
    throw new GraphQLError('Failed to change password', {
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        error,
      },
    });
  }
};
