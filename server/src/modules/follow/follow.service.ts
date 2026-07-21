import { HttpStatus, Injectable } from '@nestjs/common';
import { FollowStatus } from '@prisma/client';
import { ApiException } from '../../common/filters/api.exception';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { FollowQuery } from './follow.schemas';

@Injectable()
export class FollowService {
  constructor(private readonly prisma: PrismaService) {}

  async findTodos(userId: string, query: FollowQuery): Promise<unknown> {
    const where = {
      userId,
      isDeleted: false,
      ...(query.filter ? { status: query.filter } : {}),
    };
    const [items, grouped] = await Promise.all([
      this.prisma.followTask.findMany({
        where,
        select: {
          id: true,
          kind: true,
          title: true,
          subtitle: true,
          node: true,
          dueAt: true,
          status: true,
          version: true,
        },
        orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.followTask.groupBy({
        by: ['status'],
        where: { userId, isDeleted: false },
        _count: true,
      }),
    ]);
    const counts = new Map(grouped.map((entry) => [entry.status, entry._count]));
    return {
      items,
      summary: {
        total: String(grouped.reduce((sum, entry) => sum + entry._count, 0)),
        pending: String(counts.get(FollowStatus.PENDING) ?? 0),
        inProgress: String(counts.get(FollowStatus.IN_PROGRESS) ?? 0),
        done: String(counts.get(FollowStatus.DONE) ?? 0),
      },
    };
  }

  complete(id: string, userId: string): Promise<void> {
    return this.updateStatus(id, userId, FollowStatus.DONE);
  }

  cancel(id: string, userId: string): Promise<void> {
    return this.updateStatus(id, userId, FollowStatus.CANCELLED);
  }

  private async updateStatus(id: string, userId: string, status: FollowStatus): Promise<void> {
    const result = await this.prisma.followTask.updateMany({
      where: {
        id,
        userId,
        isDeleted: false,
        status: { notIn: [FollowStatus.DONE, FollowStatus.CANCELLED] },
      },
      data: { status, version: { increment: 1 } },
    });
    if (result.count !== 1) {
      throw new ApiException(10404, `待办 ${id} 不存在或已结束`, HttpStatus.NOT_FOUND);
    }
  }
}
