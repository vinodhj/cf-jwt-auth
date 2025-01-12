import { CfJwtAuthDataSource } from '@src/datasources';
import { Role } from 'db/schema/user';
import { UserByFieldInput } from 'generated';
import { GraphQLError } from 'graphql';
import { validateUserAccess } from '../mutations/helper/userAccessValidators';

export const userByfield = (
  _: unknown,
  { input }: { input: UserByFieldInput },
  { datasources, accessToken, role }: { datasources: { cfJwtAuthDataSource: CfJwtAuthDataSource }; accessToken: string | null; role: Role }
) => {
  try {
    validateUserAccess(accessToken, role);
    let value = input.value;
    if (input.field === 'role') {
      const validRoles = ['ADMIN', 'USER'];
      if (!validRoles.includes(input.value.toUpperCase())) {
        throw new GraphQLError('Invalid role value', {
          extensions: {
            code: 'INPUT_INVALID_ROLE',
          },
        });
      }
      value = input.value.toUpperCase() === 'ADMIN' ? Role.ADMIN : Role.USER;
    } else if (input.field === 'name') {
      // Concatenate a wildcard % with the user_id
      value = `${input.value}%`;
    }
    return datasources.cfJwtAuthDataSource.userByfield({
      field: input.field,
      value,
    });
  } catch (error) {
    if (error instanceof GraphQLError) {
      // Re-throw GraphQL-specific errors
      throw error;
    }
    console.error('Unexpected error:', error);
    throw new GraphQLError('Failed to get user by field', {
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        error,
      },
    });
  }
};
