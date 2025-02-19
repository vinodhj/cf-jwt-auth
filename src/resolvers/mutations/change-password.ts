import { CfJwtAuthDataSource } from '@src/datasources';
import { ChangePasswordInput } from 'generated';
import { GraphQLError } from 'graphql';
import { changePasswordValidators } from './helper/changePasswordValidators';

export const changePassword = async (
  _: unknown,
  { input }: { input: ChangePasswordInput },
  { datasources }: { datasources: { cfJwtAuthDataSource: CfJwtAuthDataSource } }
) => {
  try {
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
    throw new GraphQLError('Failed to sign up', {
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        error,
      },
    });
  }
};
