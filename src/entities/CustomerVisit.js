import { EntitySchema } from 'typeorm';

export default new EntitySchema({
  name: 'CustomerVisit',
  tableName: 'customer_visits',

  columns: {
    id: {
      type: 'bigint',
      unsigned: true,
      primary: true,
      generated: true,
    },

    rmId: {
      name: 'rm_id',
      type: 'bigint',
      unsigned: true,
      nullable: false,
    },

    loanId: {
      name: 'loan_id',
      type: 'varchar',
      length: 50,
      nullable: false,
    },

    customerName: {
      name: 'customer_name',
      type: 'varchar',
      length: 100,
      nullable: true,
    },

    mobileNumber: {
      name: 'mobile_number',
      type: 'varchar',
      length: 15,
      nullable: true,
    },

    lender: {
      type: 'varchar',
      length: 50,
      nullable: true,
    },

    visitType: {
      name: 'visit_type',
      type: 'varchar',
      length: 30,
      nullable: false,
    },

    notPaidReason: {
      name: 'not_paid_reason',
      type: 'varchar',
      length: 50,
      nullable: true,
    },

    latitude: {
      type: 'decimal',
      precision: 10,
      scale: 7,
      nullable: true,
    },

    longitude: {
      type: 'decimal',
      precision: 10,
      scale: 7,
      nullable: true,
    },

    selfieUri: {
      name: 'selfie_uri',
      type: 'text',
      nullable: false,
    },

    visitAt: {
      name: 'visit_at',
      type: 'datetime',
      nullable: false,
    },

    createdAt: {
      name: 'created_at',
      type: 'timestamp',
      createDate: true,
    },
  },
});
