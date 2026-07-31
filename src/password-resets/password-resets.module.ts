import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '../users/entities/user.entity';
import { PasswordResetRequest } from './entities/password-reset-request.entity';
import { PasswordResetsService } from './password-resets.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PasswordResetRequest,
      User,
    ]),
  ],
  providers: [PasswordResetsService],
  exports: [PasswordResetsService],
})
export class PasswordResetsModule { }