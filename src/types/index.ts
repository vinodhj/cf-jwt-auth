import { gql } from 'graphql-tag';

export const typeDefs = gql`
  scalar DateTime

  enum Role {
    ADMIN
    USER
  }

  type User {
    id: ID! #nano_id
    name: String!
    email: String!
    password: String! # hashed
    role: Role!
    created_at: DateTime!
    updated_at: DateTime!
  }

  input SignUpInput {
    name: String!
    email: String!
    password: String!
  }

  type SignUpResponse {
    success: Boolean!
    user: User
  }

  type Query {
    user(id: ID!): User
  }

  type Mutation {
    signUp(input: SignUpInput): SignUpResponse!
  }
`;
