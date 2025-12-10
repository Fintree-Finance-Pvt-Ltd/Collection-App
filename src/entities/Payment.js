import { EntitySchema } from "typeorm";

export default new EntitySchema({
  name: "Payment",
  tableName: "payments",
  columns: {
    id: {
      primary: true,
      type: "int",
      generated: true,
    },

    product: {
      type: "varchar",
      length: 64,
    },

    loanId: {
      type: "varchar",
      length: 64,
    },

    partnerLoanId: {
      type: "varchar",
      length: 64,
    },

    customerName: {
      type: "varchar",
      length: 128,
    },

    vehicleNumber: {
      type: "varchar",
      length: 32,
      nullable: true,
    },

    contactNumber: {
      type: "varchar",
      length: 32,
    },

    panNumber: {
      type: "varchar",
      length: 64,
    },

    paymentDate: {
      type: "date",
    },

    paymentMode: {
      type: "varchar",
      length: 32,
      nullable: true,
    },

    paymentRef: {
      type: "varchar",
      length: 64,
      nullable: true,
    },

    collectedBy: {
      type: "varchar",
      length: 128,
      nullable: true,
    },

    amount: {
      type: "decimal",
      precision: 12,
      scale: 2,
    },

    approved: {
      type: "boolean",
      default: false,
    },

    approved_by: {
      type: "varchar",
      length: 255,
      nullable: true,
    },

    remark: {
      type: "varchar",
      length: 256,
      nullable: true,
    },

    latitude: {
      type: "varchar",
      length: 256,
      nullable: true,
    },

    longitude: {
      type: "varchar",
      length: 256,
      nullable: true,
    },

    createdAt: {
      type: "timestamp",
      createDate: true,
    },
  },

  relations: {
    images: {
      target: "PaymentImage",
      type: "one-to-many",
      inverseSide: "payment",
      cascade: true,
    },
  },
});
