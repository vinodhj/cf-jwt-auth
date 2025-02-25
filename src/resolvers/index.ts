import { Resolvers } from 'generated';
import { AuthMutation } from './Auth/mutations';
import { AuthQuery } from './Auth/queries';

const Query = {
  ...AuthQuery,
};
const Mutation = {
  ...AuthMutation,
};

export const resolvers: Resolvers = { Query, Mutation };
