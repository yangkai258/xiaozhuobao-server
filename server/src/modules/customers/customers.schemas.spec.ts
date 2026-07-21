import { customerQuerySchema, customerUpdateSchema } from './customers.schemas';

describe('customer schemas', () => {
  it('coerces pagination and applies defaults', () => {
    expect(customerQuerySchema.parse({ page: '2', size: '10' })).toMatchObject({
      page: 2,
      size: 10,
      sort: 'createdAt',
      order: 'desc',
    });
  });

  it('rejects an empty update', () => {
    expect(customerUpdateSchema.safeParse({}).success).toBe(false);
  });
});
