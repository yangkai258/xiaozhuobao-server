import {
  AftersaleReason,
  AftersaleStatus,
  FollowKind,
  OrderStatus,
  PrismaClient,
  Role,
} from '@prisma/client';
import { hashPassword } from '../src/modules/auth/password';

const prisma = new PrismaClient();

const dictionaries = {
  customer_status: [
    ['ACTIVE', '已生效'],
    ['PENDING', '审批中'],
    ['REJECTED', '已驳回'],
  ],
  order_status: [
    ['DRAFT', '草稿'],
    ['PENDING_CONFIRM', '待确认'],
    ['CONFIRMED', '已确认'],
    ['SHIPPED', '已发货'],
    ['COMPLETED', '已完成'],
    ['CANCELLED', '已取消'],
  ],
  product_cat: [
    ['WATERPROOF', '防水材料'],
    ['ENERGY_SAVING', '节能材料'],
    ['AUXILIARY', '辅材'],
  ],
  biz_kind: [
    ['MEETING', '会议推广'],
    ['STOCKING', '涂无忧备货'],
    ['SHIPMENT', '无订单发货'],
    ['ADVERT', '广告申请'],
    ['STORE', '建店核销'],
    ['SUBSIDY', '仓储补贴'],
    ['RENTAL', '设备租赁'],
    ['COMPLAINT', '外部投诉'],
  ],
  region: [
    ['SHANGHAI', '上海'],
    ['JIANGSU', '江苏'],
    ['ZHEJIANG', '浙江'],
    ['ANHUI', '安徽'],
  ],
} as const;

async function main(): Promise<void> {
  for (const [kind, items] of Object.entries(dictionaries)) {
    await Promise.all(
      items.map(([code, label], sort) =>
        prisma.dict.upsert({
          where: { kind_code: { kind, code } },
          update: { label, sort, isActive: true },
          create: { kind, code, label, sort },
        }),
      ),
    );
  }

  const user = await prisma.user.upsert({
    where: { username: 'zhangming' },
    update: {},
    create: {
      username: 'zhangming',
      passwordHash: await hashPassword('Xzb@2026!'),
      mobile: '15938000123',
      displayName: '张明',
      role: Role.SALES,
      region: '上海',
      version: 1,
    },
  });

  const customer = await prisma.customer.upsert({
    where: { bp: 'BP100001' },
    update: {},
    create: {
      bp: 'BP100001',
      code: 'C-2026-001',
      name: '上海建工建材有限公司',
      cat: '客户',
      status: '已生效',
      contact: '张工 · 15938000123',
      addr: '上海浦东新区',
      createdById: user.id,
      updatedById: user.id,
      version: 1,
    },
  });

  const project = await prisma.project.upsert({
    where: { no: 'PRJ-2026-012' },
    update: {},
    create: {
      no: 'PRJ-2026-012',
      name: '浦东新区防水改造工程',
      customerId: customer.id,
      status: '已生效',
      amtCents: 14820000n,
      version: 1,
    },
  });

  await prisma.contract.upsert({
    where: { no: 'HT-2026-012' },
    update: {},
    create: {
      no: 'HT-2026-012',
      name: '浦东新区防水材料采购合同',
      projectId: project.id,
      customerId: customer.id,
      signedBy: '上海建工建材有限公司',
      status: '已生效',
      amtCents: 14820000n,
      version: 1,
    },
  });

  const product = await prisma.product.upsert({
    where: { no: '3001-005-01' },
    update: {},
    create: {
      no: '3001-005-01',
      name: 'K11 通用型防水涂料 20kg',
      spec: '通用型',
      cat: '防水材料',
      stock: 320,
      priceCents: 24480,
      unit: '桶',
      version: 1,
    },
  });

  const order = await prisma.order.upsert({
    where: { no: 'SO20260716-001' },
    update: {},
    create: {
      no: 'SO20260716-001',
      customerId: customer.id,
      amtCents: 367200n,
      status: OrderStatus.SHIPPED,
      qty: '1 行 · 15 件',
      orderDate: new Date('2026-07-14T00:00:00.000Z'),
      expectedShipDate: new Date('2026-07-18T00:00:00.000Z'),
      address: '上海浦东新区 xx 路 xx 号',
      createdById: user.id,
      version: 1,
      items: { create: { productId: product.id, qty: 15, priceCents: 24480 } },
      logs: { create: { action: '创建订单', actor: user.displayName } },
    },
  });

  await prisma.aftersale.upsert({
    where: { no: 'AF20260716-005' },
    update: {},
    create: {
      no: 'AF20260716-005',
      orderId: order.id,
      customerId: customer.id,
      material: 'K11 防水涂料 · 10 桶',
      reason: AftersaleReason.QUALITY,
      status: AftersaleStatus.PENDING_OA,
      occurredAt: new Date('2026-07-16T09:41:23.000Z'),
      images: [],
      createdById: user.id,
      version: 1,
    },
  });

  const existingTask = await prisma.followTask.findFirst({
    where: { userId: user.id, title: '上海建工订单确认', isDeleted: false },
  });
  if (!existingTask) {
    await prisma.followTask.create({
      data: {
        userId: user.id,
        customerId: customer.id,
        kind: FollowKind.APPROVAL,
        title: '上海建工订单确认',
        subtitle: '申请人：张明',
        node: '销售负责人审批',
        dueAt: new Date('2026-07-22T10:00:00.000Z'),
        version: 1,
      },
    });
  }
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
