import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../common/enums/user-role.enum';
import { UserStatus } from '../common/enums/user-status.enum';
import { User } from './entities/user.entity';

interface CreateUserData {
    name: string;
    email: string;
    passwordHash: string;
    role?: UserRole;
}

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) { }

    async create(data: CreateUserData): Promise<User> {
        const user = this.userRepository.create({
            name: data.name.trim(),
            email: data.email.trim().toLowerCase(),
            passwordHash: data.passwordHash,
            role: data.role ?? UserRole.MEMBER,
            status: UserStatus.ACTIVE,
            vipExpiredAt: null,
        });

        return this.userRepository.save(user);
    }

    async findById(id: number): Promise<User | null> {
        return this.userRepository.findOne({
            where: { id },
        });
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.userRepository.findOne({
            where: {
                email: email.trim().toLowerCase(),
            },
        });
    }

    async findByEmailWithPassword(email: string): Promise<User | null> {
        return this.userRepository
            .createQueryBuilder('user')
            .addSelect('user.passwordHash')
            .where('user.email = :email', {
                email: email.trim().toLowerCase(),
            })
            .getOne();
    }

    async emailExists(email: string): Promise<boolean> {
        const total = await this.userRepository.count({
            where: {
                email: email.trim().toLowerCase(),
            },
        });

        return total > 0;
    }
}