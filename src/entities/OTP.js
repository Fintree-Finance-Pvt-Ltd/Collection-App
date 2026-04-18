import { EntitySchema } from 'typeorm';

export default new EntitySchema({
  name: 'OTP',
  tableName: 'otps',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    mobile: {
      type: 'varchar',
      length: 10,
    },
    otp: {
      type: 'varchar',
      length: 6,
    },
    product: {
      type: 'varchar',
      length: 50,
      nullable: true,
    },
    expiresAt: {
      type: 'timestamp',
    },
    createdAt: {
      type: 'timestamp',
      createDate: true,
    },
  },
});
