import { EntitySchema } from 'typeorm';

export default new EntitySchema({
  name: 'User',
  tableName: 'users',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    name: {
      type: 'varchar',
      length: 100,
    },
    email: {
      type: 'varchar',
      length: 100,
      unique: true,
    },
    password: {
      type: 'varchar',
      length: 255,
    },
    role: {
      type: 'enum',
      enum: ['RM', 'ADMIN'],
      default: 'RM',
    },
    permissions: {
      type: 'longtext',
      charset: 'utf8mb4',
      collation: 'utf8mb4_bin',
      nullable: true,
      comment: 'List or JSON of permissions like ["embifi","malhotra"]',
    },
    dealer: {
      name: "dealer",
      type: String,
      nullable: true,
      default: null,
    },
    createdAt: {
      type: 'timestamp',
      createDate: true,
    },
  },
});
