# Cloudflare Auth using JWT

This project demonstrates how to implement **JWT-based authentication** in a **Cloudflare Worker**. It covers the following aspects:
- Generating a JWT for user login.
- Protecting API routes using JWT authentication.
- Handling unauthorized access.
  
## Features

- **User Authentication**: Using JSON Web Tokens (JWT) for user authentication.
- **Access Control**: Secure endpoints that require a valid JWT to access.
- **Authorization**: Protect specific routes (e.g., `protectedData`) using JWT.

## Prerequisites

- **Cloudflare Workers**: A basic understanding of Cloudflare Workers and how to deploy them.
- **JWT**: Familiarity with JSON Web Tokens (JWT) and how they are used for secure authentication.
- **Node.js**: For local testing and development.

## License

This project is licensed under the [MIT License](LICENSE).