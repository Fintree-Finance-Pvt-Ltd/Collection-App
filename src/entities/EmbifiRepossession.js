// src/entities/Repossession.schema.js
import { EntitySchema } from 'typeorm';

export default new EntitySchema({
  name: 'EmbifiRepossession',
  tableName: 'embifi_repossessions',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    mobile: {
      type: 'varchar',
      length: 20,
      nullable: false,
    },
    customerName: {
      type: 'varchar',
      length: 20,
      nullable: true,
    },
    panNumber: {
      name: 'pan_number',
      type: 'varchar',
      length: 50,
      nullable: true,
    },
    partnerLoanId: {
      name: 'partner_loan_id',
      type: 'varchar',
      length: 128,
      nullable: true,
    },
    vehicleNumber: {
      name: 'vehicle_number',
      type: 'varchar',
      length: 128,
      nullable: true,
    },
    makeModel: {
      name: 'make_model',
      type: 'varchar',
      length: 255,
      nullable: true,
    },
    regNo: {
      name: 'reg_no',
      type: 'varchar',
      length: 128,
      nullable: true,
    },
    chassisNo: {
      name: 'chassis_no',
      type: 'varchar',
      length: 128,
      nullable: true,
    },
    engineNo: {
      name: 'engine_no',
      type: 'varchar',
      length: 128,
      nullable: true,
    },
    batteryNo: {
      name: 'battery_no',
      type: 'varchar',
      length: 128,
      nullable: true,
    },
    repoDate: {
      name: 'repo_date',
      type: 'datetime',
      nullable: true,
    },
    repoReason: {
      name: 'repo_reason',
      type: 'varchar',
      length: 64,
      nullable: true,
    },
    agency: {
      type: 'varchar',
      length: 255,
      nullable: true,
    },
    fieldOfficer: {
      name: 'field_officer',
      type: 'varchar',
      length: 255,
      nullable: true,
    },
    repoPlace: {
      name: 'repo_place',
      type: 'varchar',
      length: 64,
      nullable: true,
    },
    vehicleCondition: {
      name: 'vehicle_condition',
      type: 'varchar',
      length: 64,
      nullable: true,
    },
    inventory: {
      type: 'text',
      nullable: true,
    },
    remarks: {
      type: 'text',
      nullable: true,
    },
    postRemarks: {
      type: 'text',
      nullable: true,
    },
    yardLocation: {
      name: 'yard_location',
      type: 'varchar',
      length: 255,
      nullable: true,
    },
    yardIncharge: {
      name: 'yard_incharge',
      type: 'varchar',
      length: 255,
      nullable: true,
    },
    yardContact: {
      name: 'yard_contact',
      type: 'bigint',
      nullable: true,
    },
    yardReceipt: {
      name: 'yard_receipt',
      type: 'varchar',
      length: 128,
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
    createdAt: {
      name: 'created_at',
      type: 'timestamp',
      createDate: true,
    },
  },
  relations: {
    photos: {
      type: 'one-to-many',
      target: 'embifi_repo_photos', // must match the name in the photo schema
      inverseSide: 'repossession',
      cascade: true,
    },
  },
});
