import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from './entities/session.entity';

interface CreateSessionData {
    id: string;
    userId: number;
    refreshTokenHash: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
}

@Injectable()
export class SessionsService {
    constructor(
        @InjectRepository(Session)
        private readonly sessionRepository: Repository<Session>,
    ) { }

    async create(data: CreateSessionData): Promise<Session> {
        const session = this.sessionRepository.create({
            id: data.id,
            userId: data.userId,
            refreshTokenHash: data.refreshTokenHash,
            expiresAt: data.expiresAt,
            revokedAt: null,
            userAgent: data.userAgent ?? null,
            ipAddress: data.ipAddress ?? null,
        });

        return this.sessionRepository.save(session);
    }

    async findActiveWithTokenHash(
        sessionId: string,
    ): Promise<Session | null> {
        return this.sessionRepository
            .createQueryBuilder('session')
            .addSelect('session.refreshTokenHash')
            .leftJoinAndSelect('session.user', 'user')
            .where('session.id = :sessionId', {
                sessionId,
            })
            .andWhere('session.revokedAt IS NULL')
            .andWhere('session.expiresAt > :now', {
                now: new Date(),
            })
            .getOne();
    }

    async rotateRefreshToken(
        sessionId: string,
        refreshTokenHash: string,
        expiresAt: Date,
    ): Promise<void> {
        await this.sessionRepository.update(
            {
                id: sessionId,
            },
            {
                refreshTokenHash,
                expiresAt,
            },
        );
    }

    async revoke(sessionId: string): Promise<void> {
        await this.sessionRepository.update(
            {
                id: sessionId,
            },
            {
                revokedAt: new Date(),
            },
        );
    }

    async revokeAllByUserId(userId: number): Promise<void> {
        await this.sessionRepository
            .createQueryBuilder()
            .update(Session)
            .set({
                revokedAt: new Date(),
            })
            .where('user_id = :userId', {
                userId,
            })
            .andWhere('revoked_at IS NULL')
            .execute();
    }
}