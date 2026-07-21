import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class DictsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByKind(kind: string): Promise<unknown> {
    const items = await this.prisma.dict.findMany({
      where: { kind, isActive: true },
      select: { code: true, label: true },
      orderBy: [{ sort: 'asc' }, { code: 'asc' }],
    });
    return { kind, items };
  }
}
