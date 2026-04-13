import { EntitySchema } from 'typeorm';

const DigitalPaymentLogs = new EntitySchema({
  name: 'DigitalPaymentLogs',
  tableName: 'digital_payment_logs',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },

    provider: {
      type: 'varchar',
      length: 100,
      nullable: false,
    },

    module: {
      type: 'varchar',
      length: 100,
      nullable: true,
    },

    eventType: {
      type: 'varchar',
      length: 100,
      nullable: true,
    },

    direction: {
      type: 'varchar',
      length: 100,
      nullable: true,
    },

    status: {
      type: 'varchar',
      length: 100,
      nullable: true,
    },

    referenceId: {
      type: 'varchar',
      length: 150,
      nullable: true,
    },

    externalReferenceId: {
      type: 'varchar',
      length: 150,
      nullable: true,
    },

    lan: {
      type: 'varchar',
      length: 150,
      nullable: true,
    },

    emiId: {
      type: 'varchar',
      length: 150,
      nullable: true,
    },

    customerId: {
      type: 'varchar',
      length: 150,
      nullable: true,
    },

    customerName: {
      type: 'varchar',
      length: 150,
      nullable: true,
    },

    email: {
      type: 'varchar',
      length: 150,
      nullable: true,
    },

    phone: {
      type: 'varchar',
      length: 20,
      nullable: true,
    },

    amount: {
      type: 'decimal',
      precision: 12,
      scale: 2,
      nullable: true,
    },

    currency: {
      type: 'varchar',
      length: 20,
      nullable: true,
    },

    message: {
      type: 'varchar',
      length: 255,
      nullable: true,
    },

    errorMessage: {
      type: 'varchar',
      length: 255,
      nullable: true,
    },

    source: {
      type: 'varchar',
      length: 255,
      nullable: true,
    },

    httpMethod: {
      type: 'varchar',
      length: 100,
      nullable: true,
    },

    endpoint: {
      type: 'varchar',
      length: 500,
      nullable: true,
    },

    httpStatusCode: {
      type: 'int',
      nullable: true,
    },

    requestHeaders: {
      type: 'json',
      nullable: true,
    },

    requestPayload: {
      type: 'json',
      nullable: true,
    },

    responsePayload: {
      type: 'json',
      nullable: true,
    },

    meta: {
      type: 'json',
      nullable: true,
    },

    notes: {
      type: 'text',
      nullable: true,
    },

    createdAt: {
      type: 'timestamp',
      createDate: true,
    },

    updatedAt: {
      type: 'timestamp',
      updateDate: true,
    },
  },

  indices: [
    {
      name: 'IDX_DIGITAL_PAYMENT_LOGS_PROVIDER',
      columns: ['provider'],
    },
    {
      name: 'IDX_DIGITAL_PAYMENT_LOGS_MODULE',
      columns: ['module'],
    },
    {
      name: 'IDX_DIGITAL_PAYMENT_LOGS_EVENT_TYPE',
      columns: ['eventType'],
    },
    {
      name: 'IDX_DIGITAL_PAYMENT_LOGS_DIRECTION',
      columns: ['direction'],
    },
    {
      name: 'IDX_DIGITAL_PAYMENT_LOGS_STATUS',
      columns: ['status'],
    },
    {
      name: 'IDX_DIGITAL_PAYMENT_LOGS_REFERENCE_ID',
      columns: ['referenceId'],
    },
    {
      name: 'IDX_DIGITAL_PAYMENT_LOGS_EXTERNAL_REFERENCE_ID',
      columns: ['externalReferenceId'],
    },
  ],
});

export default DigitalPaymentLogs;