import { EntitySchema } from 'typeorm';

export default new EntitySchema({
  name: 'malhotraReceipt',
  tableName: 'malhotra_receipt',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    loanId: {
      type: 'varchar',
      length: 64,
    },
    partnerLoanId: {
      type: 'varchar',
      length: 64,
    },
    customerName: {
      type: 'varchar',
      length: 128,
    },
    vehicleNumber: {
      type: 'varchar',
      length: 32,
      nullable: true
    },
    contactNumber: {
      type: 'varchar',
      length: 32,
    },
    panNumber: {
      type: 'varchar',
      length: 64,
    },
    paymentDate: {
      type: 'date',
    },
    paymentMode: {
      type: 'varchar',
      length: 32,
      nullable: true,
    },
    paymentRef: {
      type: 'varchar',
      length: 64,
      nullable: true,
    },
    collectedBy: {
      type: 'varchar',
      length: 128,
      nullable: true,
    },
    amount: {
      type: 'decimal',
      precision: 12,
      scale: 2,
    },
    remark: {
      type: 'varchar',
      length: 256,
      nullable: true,
    },
    approved: {
      type: 'boolean',
      default: false,
      notNull: true,
    },
    approved_by: {
      type: 'varchar',
      length: 255,
      nullable: true,
    },
    latitude: {
      type: 'varchar',
      length: 256,
      nullable: false,
    },
    longitude: {
      type: 'varchar',
      length: 256,
      nullable: false,
    },
    createdAt: {
      type: 'timestamp',
      createDate: true,
    },
  },
});
