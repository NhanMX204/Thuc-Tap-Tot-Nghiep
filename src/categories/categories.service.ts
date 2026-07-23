import {
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Category } from './entities/category.entity';

@Injectable()
export class CategoriesService {
    constructor(
        @InjectRepository(Category)
        private readonly categoryRepository: Repository<Category>,
    ) { }

    async findAll(): Promise<Category[]> {
        return this.categoryRepository.find({
            where: {
                isActive: true,
            },
            order: {
                name: 'ASC',
            },
        });
    }

    async findActiveById(id: number): Promise<Category> {
        const category =
            await this.categoryRepository.findOne({
                where: {
                    id,
                    isActive: true,
                },
            });

        if (!category) {
            throw new NotFoundException(
                'Danh mục không tồn tại hoặc đã bị khóa',
            );
        }

        return category;
    }
}