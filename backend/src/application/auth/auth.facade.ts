import { Injectable, Inject } from '@nestjs/common';
import { GenerateTokenUseCase } from './use-cases/generate-token.use-case.js';
import { GetCurrentUserUseCase } from './use-cases/get-current-user.use-case.js';
import { ValidateOrCreateUserUseCase } from './use-cases/validate-or-create-user.use-case.js';
import { GoogleProfile } from '@/domain/ports/auth.port.js';

@Injectable()
export class AuthFacade {
  constructor(
    @Inject(GenerateTokenUseCase)
    private readonly generateToken: GenerateTokenUseCase,
    @Inject(GetCurrentUserUseCase)
    private readonly getCurrentUser: GetCurrentUserUseCase,
    @Inject(ValidateOrCreateUserUseCase)
    private readonly validateOrCreate: ValidateOrCreateUserUseCase,
  ) {}

  login(user: any) {
    return this.generateToken.execute(user);
  }

  me(id: string) {
    return this.getCurrentUser.execute(id);
  }

  upsertGoogle(profile: GoogleProfile) {
    return this.validateOrCreate.execute(profile);
  }
}
