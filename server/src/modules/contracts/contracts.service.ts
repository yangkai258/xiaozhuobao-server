import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ApiException } from '../../common/filters/api.exception';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { ContractPayload, ContractQuery, ContractUpdate } from './contracts.schemas';

const contractSelect = {
  id: true,
  no: true,
  name: true,
  customerId: true,
  customer: { select: { name: true } },
  projectId: true,
  project: { select: { name: true } },
  signedBy: true,
  status: true,
  amtCents: true,
  fileUrl: true,
  version: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ContractSelect;

type ContractResult = Prisma.ContractGetPayload<{ select: typeof contractSelect }>;

@Injectable()
export class ContractsService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(query: ContractQuery): Promise<unknown> {
    const where: Prisma.ContractWhereInput = {
      isDeleted: false,
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.filter_status ? { status: query.filter_status } : {}),
      ...(query.keyword
        ? { OR: [{ no: { contains: query.keyword } }, { name: { contains: query.keyword } }] }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.contract.findMany({
        where,
        select: contractSelect,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.size,
        take: query.size,
      }),
      this.prisma.contract.count({ where }),
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
    const contract = await this.prisma.contract.findFirst({
      where: { OR: [{ id: identifier }, { no: identifier }], isDeleted: false },
      select: contractSelect,
    });
    if (!contract) {
      throw new ApiException(10404, `合同 ${identifier} 不存在`, HttpStatus.NOT_FOUND);
    }
    return this.serialize(contract);
  }

  async create(input: ContractPayload): Promise<unknown> {
    await this.assertRelations(input.customerId, input.projectId);
    const no = input.no ?? (await this.nextNumber());
    try {
      const contract = await this.prisma.contract.create({
        data: { ...input, no, amtCents: BigInt(input.amtCents), version: 1 },
        select: contractSelect,
      });
      return this.serialize(contract);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ApiException(10422, `合同编号 ${no} 已存在`, HttpStatus.UNPROCESSABLE_ENTITY);
      }
      throw error;
    }
  }

  async update(identifier: string, version: number, input: ContractUpdate): Promise<unknown> {
    if (input.customerId || input.projectId) {
      const current = await this.prisma.contract.findFirst({
        where: { OR: [{ id: identifier }, { no: identifier }], isDeleted: false },
        select: { customerId: true, projectId: true },
      });
      if (!current) {
        throw new ApiException(10404, `合同 ${identifier} 不存在`, HttpStatus.NOT_FOUND);
      }
      await this.assertRelations(
        input.customerId ?? current.customerId,
        input.projectId ?? current.projectId ?? undefined,
      );
    }

    const where = { OR: [{ id: identifier }, { no: identifier }], isDeleted: false };
    const { amtCents, ...rest } = input;
    const data: Prisma.ContractUncheckedUpdateManyInput = {
      ...rest,
      ...(amtCents ? { amtCents: BigInt(amtCents) } : {}),
      version: { increment: 1 },
    };
    const updated = await this.prisma.contract.updateMany({
      where: { ...where, version },
      data,
    });
    if (updated.count === 0) {
      const exists = await this.prisma.contract.count({ where });
      if (exists === 0) {
        throw new ApiException(10404, `合同 ${identifier} 不存在`, HttpStatus.NOT_FOUND);
      }
      throw new ApiException(10009, 'version 不匹配，请刷新后重试', HttpStatus.CONFLICT);
    }
    const contract = await this.prisma.contract.findFirst({ where, select: contractSelect });
    return this.serialize(contract as ContractResult);
  }

  private async assertRelations(customerId: string, projectId?: string): Promise<void> {
    const customerExists = await this.prisma.customer.count({
      where: { id: customerId, isDeleted: false },
    });
    if (customerExists === 0) {
      throw new ApiException(10422, '关联客商不存在', HttpStatus.UNPROCESSABLE_ENTITY);
    }
    if (projectId) {
      const projectExists = await this.prisma.project.count({
        where: { id: projectId, customerId, isDeleted: false },
      });
      if (projectExists === 0) {
        throw new ApiException(10422, '关联合同项目不存在或不属于该客商', HttpStatus.UNPROCESSABLE_ENTITY);
      }
    }
  }

  private async nextNumber(): Promise<string> {
    const year = new Date().getUTCFullYear();
    const prefix = `HT-${year}-`;
    const latest = await this.prisma.contract.findFirst({
      where: { no: { startsWith: prefix }, isDeleted: false },
      select: { no: true },
      orderBy: { no: 'desc' },
    });
    const sequence = latest ? Number(latest.no.slice(prefix.length)) + 1 : 1;
    return `${prefix}${String(sequence).padStart(3, '0')}`;
  }

  private readonly serialize = (contract: ContractResult): unknown => {
    const { customer, project, ...rest } = contract;
    return {
      ...rest,
      customerName: customer.name,
      projectName: project?.name ?? null,
      amtCents: contract.amtCents.toString(),
    };
  };
}
