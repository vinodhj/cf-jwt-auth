import { CfJwtAuthDataSource, SessionUserType } from '@src/datasources';
import { Role } from 'db/schema/user';
import { ColumnName, UserByFieldInput } from 'generated';
import { GraphQLError } from 'graphql';
import { validateUserAccess } from '../mutations/helper/userAccessValidators';

export const userByfield = (
  _: unknown,
  { input }: { input: UserByFieldInput },
  {
    datasources: { cfJwtAuthDataSource },
    accessToken,
    sessionUser,
  }: { datasources: { cfJwtAuthDataSource: CfJwtAuthDataSource }; accessToken: string | null; sessionUser: SessionUserType }
) => {
  try {
    if (input.field === ColumnName.Id || input.field === ColumnName.Email) {
      validateUserAccess(accessToken, sessionUser, { [input.field]: input.value });
    } else {
      validateUserAccess(accessToken, sessionUser, {});
    }

    let value = input.value;
    if (input.field === ColumnName.Role) {
      const validRoles = ['ADMIN', 'USER'];
      if (!validRoles.includes(input.value.toUpperCase())) {
        throw new GraphQLError('Invalid role value', {
          extensions: {
            code: 'INPUT_INVALID_ROLE',
          },
        });
      }
      value = input.value.toUpperCase() === 'ADMIN' ? Role.Admin : Role.User;
    } else if (input.field === ColumnName.Name) {
      // Concatenate a wildcard % with the user_id
      value = `${input.value}%`;
    }
    return cfJwtAuthDataSource.getUserAPI().userByfield({
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
