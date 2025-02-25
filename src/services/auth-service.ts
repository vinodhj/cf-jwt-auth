import { AuthDataSource } from '@src/datasources/auth';
import { ChangePasswordInput, LoginInput, SignUpInput } from 'generated';
import { validateEmailAndPassword } from '@src/resolvers/Auth/mutations/helper/authValidators';
import { generateToken, TokenPayload } from '@src/resolvers/Auth/mutations/helper/jwtUtils';
import { SessionUserType } from '@src/datasources';
import { validateUserAccess } from '@src/resolvers/Auth/mutations/helper/userAccessValidators';
import { changePasswordValidators } from '@src/resolvers/Auth/mutations/helper/changePasswordValidators';

export class AuthServiceAPI {
  private readonly authDataSource: AuthDataSource;
  private readonly jwtSecret: string;
  private readonly sessionUser: SessionUserType | null;

  constructor({
    authDataSource,
    jwtSecret,
    sessionUser,
  }: {
    authDataSource: AuthDataSource;
    jwtSecret: string;
    sessionUser?: SessionUserType;
  }) {
    this.authDataSource = authDataSource;
    this.jwtSecret = jwtSecret;
    this.sessionUser = sessionUser ?? null;
  }

  async signUp(input: SignUpInput) {
    // Validate inputs (you can customize validation as needed)
    validateEmailAndPassword(input.email, input.password);
    return await this.authDataSource.signUp(input);
  }

  async login(input: LoginInput) {
    // Validate inputs
    validateEmailAndPassword(input.email, input.password);

    const result = await this.authDataSource.login(input);

    const tokenPayload: TokenPayload = {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
      tokenVersion: result.token_version,
    };

    const token = generateToken(tokenPayload, this.jwtSecret, '8h');
    return {
      token,
      ...result,
    };
  }

  async changePassword(input: ChangePasswordInput, accessToken: string | null) {
    // Validate user access and inputs
    validateUserAccess(accessToken, this.sessionUser, { id: input.id });
    changePasswordValidators(input.current_password, input.new_password, input.confirm_password);

    const result = await this.authDataSource.changePassword(input);
    return result ?? false;
  }
}
