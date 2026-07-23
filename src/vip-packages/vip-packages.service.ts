import {
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UpdateVipPackageDto } from './dto/update-vip-package.dto';
import { VipPackage } from './entities/vip-package.entity';

@Injectable()
export class VipPackagesService {
    constructor(
        @InjectRepository(VipPackage)
        private readonly vipPackageRepository: Repository<VipPackage>,
    ) { }

    async findPublicPackages() {
        const packages = await this.vipPackageRepository.find({
            where: {
                isActive: true,
            },
            order: {
                price: 'ASC',
            },
        });

        return packages.map((item) => this.toResponse(item));
    }

    async findPublicById(id: number) {
        const vipPackage = await this.vipPackageRepository.findOne({
            where: {
                id,
                isActive: true,
            },
        });

        if (!vipPackage) {
            throw new NotFoundException(
                'Gói VIP không tồn tại hoặc đã ngừng bán',
            );
        }

        return this.toResponse(vipPackage);
    }

    async findActiveById(id: number): Promise<VipPackage> {
        const vipPackage = await this.vipPackageRepository.findOne({
            where: {
                id,
                isActive: true,
            },
        });

        if (!vipPackage) {
            throw new NotFoundException(
                'Gói VIP không tồn tại hoặc đã ngừng bán',
            );
        }

        return vipPackage;
    }

    async findAllForAdmin() {
        const packages = await this.vipPackageRepository.find({
            order: {
                createdAt: 'DESC',
            },
        });

        return packages.map((item) => this.toResponse(item));
    }

    async findAdminById(id: number) {
        const vipPackage = await this.vipPackageRepository.findOne({
            where: { id },
        });

        if (!vipPackage) {
            throw new NotFoundException('Gói VIP không tồn tại');
        }

        return this.toResponse(vipPackage);
    }

    async update(id: number, dto: UpdateVipPackageDto) {
        const vipPackage = await this.vipPackageRepository.findOne({
            where: { id },
        });

        if (!vipPackage) {
            throw new NotFoundException('Gói VIP không tồn tại');
        }

        vipPackage.name = dto.name.trim();
        vipPackage.durationDays = dto.durationDays;
        vipPackage.price = Math.round(dto.price);
        vipPackage.discountPercent = dto.discountPercent;
        vipPackage.description = dto.description?.trim() || null;
        vipPackage.isActive = dto.isActive;

        await this.vipPackageRepository.save(vipPackage);

        return {
            message: 'Cập nhật gói VIP thành công',
            vipPackage: this.toResponse(vipPackage),
        };
    }

    private toResponse(vipPackage: VipPackage) {
        const finalPrice = Math.round(
            vipPackage.price *
            (1 - vipPackage.discountPercent / 100),
        );

        return {
            id: vipPackage.id,
            name: vipPackage.name,
            durationDays: vipPackage.durationDays,
            price: vipPackage.price,
            discountPercent: vipPackage.discountPercent,
            finalPrice,
            description: vipPackage.description,
            isActive: vipPackage.isActive,
            createdAt: vipPackage.createdAt,
            updatedAt: vipPackage.updatedAt,
        };
    }
}