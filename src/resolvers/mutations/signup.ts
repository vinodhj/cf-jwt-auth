import { CfJwtAuthDataSource } from "@src/datasources";
import { SignUpInput } from "generated";
import { validateInputs } from "./helper/authValidators";
import { GraphQLError } from "graphql";

export const signUp = async (
    _: unknown,
    { input }: { input: SignUpInput },
    { datasources }: { datasources: { cfJwtAuthDataSource: CfJwtAuthDataSource }; }
  ) => {
    try {
      // Validate inputs
      validateInputs(input.email, input.password);
  
      // Sign up user
      return datasources.cfJwtAuthDataSource.signUp(input);
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