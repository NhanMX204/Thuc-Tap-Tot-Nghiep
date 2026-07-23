import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from '../../users/entities/user.entity';
import { SubscriptionTargetType } from '../enums/subscription-target-type.enum';

@Entity('subscriptions')
@Index(
    'UQ_SUBSCRIPTIONS_USER_TARGET',
    [
        'userId',
        'targetType',
        'targetId',
    ],
    {
        unique: true,
    },
)
export class Subscription {
    @PrimaryGeneratedColumn()
    id!: number;

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
        name: 'target_type',
        type: 'enum',
        enum: SubscriptionTargetType,
    })
    targetType!: SubscriptionTargetType;

    @Column({
        name: 'target_id',
        type: 'int',
    })
    targetId!: number;

    @CreateDateColumn({
        name: 'created_at',
        type: 'datetime',
    })
    createdAt!: Date;
}