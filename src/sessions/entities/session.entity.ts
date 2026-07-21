import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryColumn,
    UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('sessions')
@Index('IDX_SESSION_USER_ID', ['userId'])
export class Session {
    @PrimaryColumn({
        type: 'varchar',
        length: 36,
    })
    id!: string;

    @Column({
        name: 'user_id',
        type: 'int',
    })
    userId!: number;

    @ManyToOne(() => User, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({
        name: 'user_id',
    })
    user!: User;

    @Column({
        name: 'refresh_token_hash',
        type: 'varchar',
        length: 255,
        select: false,
    })
    refreshTokenHash!: string;

    @Column({
        name: 'expires_at',
        type: 'datetime',
    })
    expiresAt!: Date;

    @Column({
        name: 'revoked_at',
        type: 'datetime',
        nullable: true,
    })
    revokedAt!: Date | null;

    @Column({
        name: 'user_agent',
        type: 'varchar',
        length: 500,
        nullable: true,
    })
    userAgent!: string | null;

    @Column({
        name: 'ip_address',
        type: 'varchar',
        length: 100,
        nullable: true,
    })
    ipAddress!: string | null;

    @CreateDateColumn({
        name: 'created_at',
        type: 'datetime',
    })
    createdAt!: Date;

    @UpdateDateColumn({
        name: 'updated_at',
        type: 'datetime',
    })
    updatedAt!: Date;
}