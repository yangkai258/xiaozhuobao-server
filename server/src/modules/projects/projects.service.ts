import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ApiException } from '../../common/filters/api.exception';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { ProjectPayload, ProjectQuery, ProjectUpdate } from './projects.schemas';

const projectSelect = {
  id: true,
  no: true,
  name: true,
  customerId: true,
  customer: { select: { name: true } },
  status: true,
  amtCents: true,
  version: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProjectSelect;

type ProjectResult = Prisma.ProjectGetPayload<{ select: typeof projectSelect }>;

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(query: ProjectQuery): Promise<unknown> {
    const where: Prisma.ProjectWhereInput = {
      isDeleted: false,
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.filter_status ? { status: query.filter_status } : {}),
      ...(query.keyword
        ? { OR: [{ no: { contains: query.keyword } }, { name: { contains: query.keyword } }] }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        select: projectSelect,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.size,
        take: query.size,
      }),
      this.prisma.project.count({ where }),
    ]);
    return {
      items: items.map(this.serialize),
      page: query.page,
      size: query.size,
      total,
      hasMore: query.page * query.size < total,
    };
  }

  async findOne(identifier: string): Promise<unknown> {
    const project = await this.prisma.project.findFirst({
      where: { OR: [{ id: identifier }, { no: identifier }], isDeleted: false },
      select: projectSelect,
    });
    if (!project) {
      throw new ApiException(10404, `项目 ${identifier} 不存在`, HttpStatus.NOT_FOUND);
    }
    return this.serialize(project);
  }

  async create(input: ProjectPayload): Promise<unknown> {
    await this.assertCustomer(input.customerId);
    const no = input.no ?? (await this.nextNumber());
    try {
      const project = await this.prisma.project.create({
        data: { ...input, no, amtCents: BigInt(input.amtCents), version: 1 },
        select: projectSelect,
      });
      return this.serialize(project);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ApiException(10422, `项目编号 ${no} 已存在`, HttpStatus.UNPROCESSABLE_ENTITY);
      }
      throw error;
    }
  }

  async update(identifier: string, version: number, input: ProjectUpdate): Promise<unknown> {
    if (input.customerId) {
      await this.assertCustomer(input.customerId);
    }
    const where = { OR: [{ id: identifier }, { no: identifier }], isDeleted: false };
    const { amtCents, ...rest } = input;
    const data: Prisma.ProjectUncheckedUpdateManyInput = {
      ...rest,
      ...(amtCents ? { amtCents: BigInt(amtCents) } : {}),
      version: { increment: 1 },
    };
    const updated = await this.prisma.project.updateMany({ where: { ...where, version }, data });
    if (updated.count === 0) {
      await this.throwMissingOrStale(where, identifier);
    }
    const project = await this.prisma.project.findFirst({ where, select: projectSelect });
    return this.serialize(project as ProjectResult);
  }

  private async assertCustomer(customerId: string): Promise<void> {
    const exists = await this.prisma.customer.count({ where: { id: customerId, isDeleted: false } });
    if (exists === 0) {
      throw new ApiException(10422, '关联客商不存在', HttpStatus.UNPROCESSABLE_ENTITY);
    }
  }

  private async throwMissingOrStale(where: Prisma.ProjectWhereInput, identifier: string): Promise<never> {
    const exists = await this.prisma.project.count({ where });
    if (exists === 0) {
      throw new ApiException(10404, `项目 ${identifier} 不存在`, HttpStatus.NOT_FOUND);
    }
    throw new ApiException(10009, 'version 不匹配，请刷新后重试', HttpStatus.CONFLICT);
  }

  private async nextNumber(): Promise<string> {
    const year = new Date().getUTCFullYear();
    const prefix = `PRJ-${year}-`;
    const latest = await this.prisma.project.findFirst({
      where: { no: { startsWith: prefix }, isDeleted: false },
      select: { no: true },
      orderBy: { no: 'desc' },
    });
    const sequence = latest ? Number(latest.no.slice(prefix.length)) + 1 : 1;
    return `${prefix}${String(sequence).padStart(3, '0')}`;
  }

  private readonly serialize = (project: ProjectResult): unknown => ({
    ...project,
    customerName: project.customer.name,
    customer: undefined,
    amtCents: project.amtCents.toString(),
  });
}
