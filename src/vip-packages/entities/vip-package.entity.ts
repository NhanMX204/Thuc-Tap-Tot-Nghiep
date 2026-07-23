import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

import { decimalNumberTransformer } from '../../common/database/decimal-number.transformer';

@Entity('vip_packages')
export class VipPackage {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({
        type: 'varchar',
        length: 150,
    })
    name!: string;

    @Column({
        name: 'duration_days',
        type: 'int',
        unsigned: true,
    })
    durationDays!: number;

    @Column({
        type: 'decimal',
        precision: 15,
        scale: 0,
        transformer: decimalNumberTransformer,
    })
    price!: number;

    @Column({
        name: 'discount_percent',
        type: 'decimal',
        precision: 5,
        scale: 2,
        default: 0,
        transformer: decimalNumberTransformer,
    })
    discountPercent!: number;

    @Column({
        type: 'text',
        nullable: true,
    })
    description!: string | null;

    @Column({
        name: 'is_active',
        type: 'boolean',
        default: true,
    })
    isActive!: boolean;

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