import { EntitySchema } from "typeorm";

export default new EntitySchema({
  name: "PaymentImage",
  tableName: "payment_images",
  columns: {
    id: {
      primary: true,
      type: "int",
      generated: true,
    },

    paymentId: {
      type: "int",
    },

    image1: {
      type: "longblob",
      nullable: false,
    },

    image2: {
      type: "longblob",
      nullable: true,
    },

    selfie: {
      type: "longblob",
      nullable: true,
    },

    createdAt: {
      type: "timestamp",
      createDate: true,
    },
  },

  relations: {
    payment: {
      target: "Payment",
      type: "many-to-one",
      joinColumn: {
        name: "paymentId",
        referencedColumnName: "id",
      },
      onDelete: "CASCADE",
    },
  },
});
