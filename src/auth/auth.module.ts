import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { SessionsModule } from '../sessions/sessions.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MailModule } from '../mail/mail.module';
import { PasswordResetsModule } from '../password-resets/password-resets.module';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    SessionsModule,
    PasswordResetsModule,
    MailModule,

    PassportModule.register({
      defaultStrategy: 'jwt',
    }),

    JwtModule.register({}),
  ],

  controllers: [AuthController],

  providers: [
    AuthService,
    JwtStrategy,
  ],

  exports: [
    AuthService,
    JwtModule,
  ],
})
export class AuthModule { }