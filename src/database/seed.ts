import {
    Logger,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import {
    DataSource,
    Repository,
} from 'typeorm';

import { AppModule } from '../app.module';
import { ArticleView } from '../article-views/entities/article-view.entity';
import { Article } from '../articles/entities/article.entity';
import { ArticleStatus } from '../articles/enums/article-status.enum';
import { ArticleType } from '../articles/enums/article-type.enum';
import { Category } from '../categories/entities/category.entity';
import { Comment } from '../comments/entities/comment.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { UserStatus } from '../common/enums/user-status.enum';
import { VipTransaction } from '../transactions/entities/vip-transaction.entity';
import { PaymentMethod } from '../transactions/enums/payment-method.enum';
import { TransactionStatus } from '../transactions/enums/transaction-status.enum';
import { User } from '../users/entities/user.entity';
import { VipPackage } from '../vip-packages/entities/vip-package.entity';

const logger = new Logger('DatabaseSeed');

async function bootstrap(): Promise<void> {
    const app =
        await NestFactory
            .createApplicationContext(
                AppModule,
            );

    try {
        const dataSource =
            app.get(DataSource);

        await seedDatabase(dataSource);

        logger.log(
            'Seed dữ liệu thành công',
        );
    } catch (error) {
        logger.error(
            'Seed dữ liệu thất bại',
            error instanceof Error
                ? error.stack
                : String(error),
        );

        process.exitCode = 1;
    } finally {
        await app.close();
    }
}

async function seedDatabase(
    dataSource: DataSource,
): Promise<void> {
    const userRepository =
        dataSource.getRepository(User);

    const categoryRepository =
        dataSource.getRepository(
            Category,
        );

    const articleRepository =
        dataSource.getRepository(Article);

    const viewRepository =
        dataSource.getRepository(
            ArticleView,
        );

    const commentRepository =
        dataSource.getRepository(
            Comment,
        );

    const vipPackageRepository =
        dataSource.getRepository(
            VipPackage,
        );

    const transactionRepository =
        dataSource.getRepository(
            VipTransaction,
        );

    const passwordHash =
        await bcrypt.hash(
            'Password123',
            12,
        );

    const admin =
        await findOrCreateUser(
            userRepository,
            {
                name: 'Quản trị viên',
                email: 'admin@gmail.com',
                passwordHash,
                role: UserRole.ADMIN,
            },
        );

    await findOrCreateUser(
        userRepository,
        {
            name: 'Kiểm duyệt viên',
            email: 'censor@gmail.com',
            passwordHash,
            role: UserRole.CENSOR,
        },
    );

    const author =
        await findOrCreateUser(
            userRepository,
            {
                name: 'Tác giả mẫu',
                email: 'author@gmail.com',
                passwordHash,
                role: UserRole.AUTHOR,
            },
        );

    const member =
        await findOrCreateUser(
            userRepository,
            {
                name: 'Độc giả mẫu',
                email: 'member@gmail.com',
                passwordHash,
                role: UserRole.MEMBER,
            },
        );

    const categoriesData = [
        {
            name: 'Thời sự',
            slug: 'thoi-su',
            description:
                'Tin tức thời sự',
        },
        {
            name: 'Kinh tế',
            slug: 'kinh-te',
            description:
                'Tin tức kinh tế',
        },
        {
            name: 'Công nghệ',
            slug: 'cong-nghe',
            description:
                'Tin tức công nghệ',
        },
        {
            name: 'Thể thao',
            slug: 'the-thao',
            description:
                'Tin tức thể thao',
        },
        {
            name: 'Giải trí',
            slug: 'giai-tri',
            description:
                'Tin tức giải trí',
        },
    ];

    const categoryMap =
        new Map<string, Category>();

    for (
        const item of categoriesData
    ) {
        let category =
            await categoryRepository
                .findOne({
                    where: {
                        slug: item.slug,
                    },
                });

        if (!category) {
            category =
                await categoryRepository.save(
                    categoryRepository.create({
                        ...item,
                        isActive: true,
                    }),
                );
        }

        categoryMap.set(
            item.slug,
            category,
        );
    }

    const packagesData = [
        {
            name: 'VIP 7 ngày',
            durationDays: 7,
            price: 29000,
            discountPercent: 0,
        },
        {
            name: 'VIP 30 ngày',
            durationDays: 30,
            price: 99000,
            discountPercent: 10,
        },
        {
            name: 'VIP 365 ngày',
            durationDays: 365,
            price: 999000,
            discountPercent: 20,
        },
    ];

    const packageMap =
        new Map<string, VipPackage>();

    for (
        const item of packagesData
    ) {
        let vipPackage =
            await vipPackageRepository
                .findOne({
                    where: {
                        name: item.name,
                    },
                });

        if (!vipPackage) {
            vipPackage =
                await vipPackageRepository.save(
                    vipPackageRepository.create({
                        ...item,
                        description:
                            `Đọc nội dung VIP trong ${item.durationDays} ngày`,
                        isActive: true,
                    }),
                );
        }

        packageMap.set(
            item.name,
            vipPackage,
        );
    }

    const technologyCategory =
        categoryMap.get('cong-nghe');

    const economyCategory =
        categoryMap.get('kinh-te');

    if (
        !technologyCategory ||
        !economyCategory
    ) {
        throw new Error(
            'Không tạo được danh mục mẫu',
        );
    }

    const approvedArticle =
        await findOrCreateArticle(
            articleRepository,
            {
                authorId: author.id,
                categoryId:
                    technologyCategory.id,

                title:
                    'Xu hướng công nghệ nổi bật năm 2026',

                slug:
                    'xu-huong-cong-nghe-noi-bat-nam-2026',

                sapo:
                    'Những xu hướng công nghệ đang nhận được nhiều sự quan tâm.',

                content:
                    'Nội dung chi tiết về trí tuệ nhân tạo, điện toán đám mây và các nền tảng phát triển phần mềm hiện đại.',

                type: ArticleType.NORMAL,

                status:
                    ArticleStatus.APPROVED,

                isVisible: true,

                publishedAt:
                    daysAgo(6),
            },
        );

    const vipArticle =
        await findOrCreateArticle(
            articleRepository,
            {
                authorId: author.id,
                categoryId:
                    economyCategory.id,

                title:
                    'Phân tích kinh tế chuyên sâu',

                slug:
                    'phan-tich-kinh-te-chuyen-sau',

                sapo:
                    'Báo cáo phân tích dành cho độc giả VIP.',

                content:
                    'Nội dung phân tích chuyên sâu về thị trường, doanh nghiệp và xu hướng kinh tế.',

                type: ArticleType.VIP,

                status:
                    ArticleStatus.APPROVED,

                isVisible: true,

                publishedAt:
                    daysAgo(4),
            },
        );

    await findOrCreateArticle(
        articleRepository,
        {
            authorId: author.id,
            categoryId:
                technologyCategory.id,

            title:
                'Bài viết đang chờ kiểm duyệt',

            slug:
                'bai-viet-dang-cho-kiem-duyet',

            sapo:
                'Bài viết mẫu đang ở trạng thái chờ kiểm duyệt.',

            content:
                'Đây là nội dung bài viết mẫu để kiểm tra quy trình kiểm duyệt.',

            type: ArticleType.NORMAL,

            status:
                ArticleStatus.PENDING,

            isVisible: false,

            publishedAt: null,
        },
    );

    const existingViews =
        await viewRepository.count({
            where: {
                articleId:
                    approvedArticle.id,
            },
        });

    if (existingViews === 0) {
        const views: ArticleView[] = [];

        for (
            let index = 0;
            index < 12;
            index += 1
        ) {
            views.push(
                viewRepository.create({
                    articleId:
                        approvedArticle.id,

                    userId:
                        index % 3 === 0
                            ? member.id
                            : null,

                    readerKey:
                        index % 3 === 0
                            ? null
                            : randomUUID(),

                    ipAddress: '127.0.0.1',
                    userAgent:
                        'Seed browser',

                    viewedAt:
                        daysAgo(index % 7),
                }),
            );
        }

        await viewRepository.save(
            views,
        );

        approvedArticle.viewCount =
            views.length;

        await articleRepository.save(
            approvedArticle,
        );
    }

    const existingVipViews =
        await viewRepository.count({
            where: {
                articleId: vipArticle.id,
            },
        });

    if (existingVipViews === 0) {
        const views = Array.from(
            {
                length: 5,
            },
            (_, index) =>
                viewRepository.create({
                    articleId:
                        vipArticle.id,

                    userId: member.id,

                    readerKey: null,

                    ipAddress: '127.0.0.1',
                    userAgent:
                        'Seed browser',

                    viewedAt:
                        daysAgo(index % 4),
                }),
        );

        await viewRepository.save(
            views,
        );

        vipArticle.viewCount =
            views.length;

        await articleRepository.save(
            vipArticle,
        );
    }

    const commentCount =
        await commentRepository.count({
            where: {
                articleId:
                    approvedArticle.id,
            },
        });

    if (commentCount === 0) {
        await commentRepository.save([
            commentRepository.create({
                articleId:
                    approvedArticle.id,

                userId: member.id,

                content:
                    'Bài viết rất hữu ích.',

                isVisible: true,

                createdAt:
                    daysAgo(3),
            }),

            commentRepository.create({
                articleId:
                    approvedArticle.id,

                userId: admin.id,

                content:
                    'Nội dung được trình bày rõ ràng.',

                isVisible: true,

                createdAt:
                    daysAgo(1),
            }),
        ]);
    }

    const vip30Package =
        packageMap.get('VIP 30 ngày');

    if (!vip30Package) {
        throw new Error(
            'Không tạo được gói VIP mẫu',
        );
    }

    const existingTransaction =
        await transactionRepository
            .findOne({
                where: {
                    transactionCode:
                        'SEED-VIP-TRANSACTION-001',
                },
            });

    if (!existingTransaction) {
        const finalPrice =
            Math.round(
                vip30Package.price *
                (1 -
                    vip30Package
                        .discountPercent /
                    100),
            );

        await transactionRepository.save(
            transactionRepository.create({
                transactionCode:
                    'SEED-VIP-TRANSACTION-001',

                userId: member.id,

                packageId:
                    vip30Package.id,

                packageName:
                    vip30Package.name,

                packageDurationDays:
                    vip30Package.durationDays,

                originalPrice:
                    vip30Package.price,

                discountPercent:
                    vip30Package
                        .discountPercent,

                amount: finalPrice,

                paymentMethod:
                    PaymentMethod.VNPAY,

                status:
                    TransactionStatus.SUCCESS,

                vnpTransactionNo:
                    'SEED-VNPAY-001',

                vnpBankCode: 'NCB',

                vnpBankTransactionNo:
                    'SEED-BANK-001',

                vnpResponseCode: '00',

                vnpTransactionStatus:
                    '00',

                orderInfo:
                    'Thanh toan goi VIP 30 ngay',

                paidAt: daysAgo(2),

                expiresAt:
                    new Date(
                        Date.now() +
                        15 * 60 * 1000,
                    ),
            }),
        );

        member.vipExpiredAt =
            new Date(
                Date.now() +
                30 *
                24 *
                60 *
                60 *
                1000,
            );

        await userRepository.save(
            member,
        );
    }
}

async function findOrCreateUser(
    repository: Repository<User>,
    data: {
        name: string;
        email: string;
        passwordHash: string;
        role: UserRole;
    },
): Promise<User> {
    let user =
        await repository.findOne({
            where: {
                email: data.email,
            },
        });

    if (!user) {
        user = repository.create({
            ...data,
            status: UserStatus.ACTIVE,
            vipExpiredAt: null,
        });

        return repository.save(user);
    }

    user.name = data.name;
    user.role = data.role;
    user.status =
        UserStatus.ACTIVE;

    return repository.save(user);
}

async function findOrCreateArticle(
    repository: Repository<Article>,
    data: {
        authorId: number;
        categoryId: number;
        title: string;
        slug: string;
        sapo: string;
        content: string;
        type: ArticleType;
        status: ArticleStatus;
        isVisible: boolean;
        publishedAt: Date | null;
    },
): Promise<Article> {
    let article =
        await repository.findOne({
            where: {
                slug: data.slug,
            },
        });

    if (!article) {
        article = repository.create({
            ...data,
            coverImage: null,
            rejectionReason: null,
            viewCount: 0,
        });

        return repository.save(
            article,
        );
    }

    return article;
}

function daysAgo(
    days: number,
): Date {
    return new Date(
        Date.now() -
        days *
        24 *
        60 *
        60 *
        1000,
    );
}

bootstrap();