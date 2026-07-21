import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { AuthenticatedUser } from '../../common/types';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { ReportQuery } from './me.schemas';

@Injectable()
export class MeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  profile(user: AuthenticatedUser): unknown {
    return this.authService.me(user);
  }

  async reports(userId: string, query: ReportQuery): Promise<unknown> {
    const start = this.periodStart(query.period);
    const orders = await this.prisma.order.findMany({
      where: {
        createdById: userId,
        isDeleted: false,
        status: { not: OrderStatus.CANCELLED },
        orderDate: { gte: start },
      },
      select: { amtCents: true, orderDate: true },
      orderBy: { orderDate: 'asc' },
    });
    const aftersaleCount = await this.prisma.aftersale.count({
      where: { createdById: userId, isDeleted: false, occurredAt: { gte: start } },
    });
    const byWeek = new Map<string, bigint>();
    // ponytail: in-memory weekly grouping is fine for one user's bounded period; move it to SQL for multi-year reports.
    for (const order of orders) {
      const week = this.isoWeek(order.orderDate);
      byWeek.set(week, (byWeek.get(week) ?? 0n) + order.amtCents);
    }
    return {
      period: query.period,
      gmvCents: orders.reduce((sum, order) => sum + order.amtCents, 0n).toString(),
      orderCount: String(orders.length),
      aftersaleCount: String(aftersaleCount),
      completion: 0,
      byWeek: [...byWeek].map(([week, gmvCents]) => ({ week, gmvCents: gmvCents.toString() })),
    };
  }

  utilities(): unknown[] {
    return [
      { id: 'profile', name: '个人资料', desc: '姓名 / 职务 / 手机', color: '#0E1419' },
      { id: 'approval', name: '我的审批', desc: '待审批 · 已审批 · 我发起', color: '#E8542C' },
      { id: 'reports', name: '个人业绩', desc: '订单 / 销售额 / 售后', color: '#2E5A88' },
    ];
  }

  private periodStart(period: ReportQuery['period']): Date {
    const now = new Date();
    if (period === 'WEEK') {
      const day = now.getUTCDay() || 7;
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day + 1));
    }
    if (period === 'QUARTER') {
      const quarterMonth = Math.floor(now.getUTCMonth() / 3) * 3;
      return new Date(Date.UTC(now.getUTCFullYear(), quarterMonth, 1));
    }
    if (period === 'YEAR') {
      return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    }
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }

  private isoWeek(value: Date): string {
    const date = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - day);
    const year = date.getUTCFullYear();
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${year}-W${String(week).padStart(2, '0')}`;
  }
}
