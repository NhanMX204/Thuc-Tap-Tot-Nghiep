import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CategoriesService } from '../categories/categories.service';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { UsersService } from '../users/users.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionTargetType } from './enums/subscription-target-type.enum';

@Injectable()
export class SubscriptionsService {
    constructor(
        @InjectRepository(Subscription)
        private readonly subscriptionRepository: Repository<Subscription>,

        private readonly usersService: UsersService,

        private readonly categoriesService: CategoriesService,
    ) { }

    async findMy(userId: number) {
        const subscriptions =
            await this.subscriptionRepository.find({
                where: {
                    userId,
                },
                order: {
                    createdAt: 'DESC',
                },
            });

        return {
            message:
                'Lấy danh sách theo dõi thành công',
            data: subscriptions.map(
                (subscription) => ({
                    id: subscription.id,
                    targetType:
                        subscription.targetType,
                    targetId:
                        subscription.targetId,
                    createdAt:
                        subscription.createdAt,
                }),
            ),
        };
    }

    async create(
        currentUser: AuthenticatedUser,
        dto: CreateSubscriptionDto,
    ) {
        await this.validateTarget(
            currentUser,
            dto.targetType,
            dto.targetId,
        );

        const existing =
            await this.subscriptionRepository.findOne({
                where: {
                    userId: currentUser.id,
                    targetType: dto.targetType,
                    targetId: dto.targetId,
                },
            });

        if (existing) {
            throw new ConflictException(
                'Bạn đã theo dõi đối tượng này',
            );
        }

        const subscription =
            this.subscriptionRepository.create({
                userId: currentUser.id,
                targetType: dto.targetType,
                targetId: dto.targetId,
            });

        const savedSubscription =
            await this.subscriptionRepository.save(
                subscription,
            );

        return {
            message: 'Theo dõi thành công',
            subscription: {
                id: savedSubscription.id,
                targetType:
                    savedSubscription.targetType,
                targetId:
                    savedSubscription.targetId,
                createdAt:
                    savedSubscription.createdAt,
            },
        };
    }

    async remove(
        userId: number,
        targetType: SubscriptionTargetType,
        targetId: number,
    ): Promise<void> {
        const subscription =
            await this.subscriptionRepository.findOne({
                where: {
                    userId,
                    targetType,
                    targetId,
                },
            });

        if (!subscription) {
            throw new NotFoundException(
                'Bạn chưa theo dõi đối tượng này',
            );
        }

        await this.subscriptionRepository.remove(
            subscription,
        );
    }

    private async validateTarget(
        currentUser: AuthenticatedUser,
        targetType: SubscriptionTargetType,
        targetId: number,
    ): Promise<void> {
        if (
            targetType ===
            SubscriptionTargetType.AUTHOR
        ) {
            if (currentUser.id === targetId) {
                throw new BadRequestException(
                    'Bạn không thể theo dõi chính mình',
                );
            }

            const author =
                await this.usersService.findById(
                    targetId,
                );

            if (
                !author ||
                author.role !== UserRole.AUTHOR
            ) {
                throw new NotFoundException(
                    'Tác giả không tồn tại',
                );
            }

            return;
        }

        await this.categoriesService.findActiveById(
            targetId,
        );
    }
}