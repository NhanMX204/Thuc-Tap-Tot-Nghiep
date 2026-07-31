import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

import { User } from '../../users/entities/user.entity';

@Entity('password_reset_requests')
@Index('IDX_PASSWORD_RESET_USER_CREATED', [
    'userId',
    'createdAt',
])
export class PasswordResetRequest {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({
        name: 'user_id',
        type: 'int',
    })
    userId!: number;

    @ManyToOne(() => User, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    @JoinColumn({
        name: 'user_id',
    })
    user!: User;

    @Column({
        name: 'code_hash',
        type: 'varchar',
        length: 255,
        select: false,
    })
    codeHash!: string;

    @Column({
        type: 'int',
        unsigned: true,
        default: 0,
    })
    attempts!: number;

    @Column({
        name: 'expires_at',
        type: 'datetime',
    })
    expiresAt!: Date;

    @Column({
        name: 'verified_at',
        type: 'datetime',
        nullable: true,
    })
    verifiedAt!: Date | null;

    @Column({
        name: 'consumed_at',
        type: 'datetime',
        nullable: true,
    })
    consumedAt!: Date | null;

    @Column({
        name: 'request_ip',
        type: 'varchar',
        length: 100,
        nullable: true,
    })
    requestIp!: string | null;

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