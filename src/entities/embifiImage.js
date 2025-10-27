import { EntitySchema } from 'typeorm';

export default new EntitySchema({
  name: 'embifiImage',
  tableName: 'embifi_images',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    paymentId: {
      type: 'int',
      nullable: false,
    },
    image1: {
      type: 'longblob',
      nullable: false,
    },
    image2: {
      type: 'longblob',
      nullable: true,
    },
      selfie: {
      type: 'longblob',
      nullable: true,
    },
    createdAt: {
      type: 'timestamp',
      createDate: true,
    },
  },
  relations: {
    payment: {
      target: 'embifiReceipt',
      type: 'many-to-one',
      joinColumn: {
        name: 'paymentId',
        referencedColumnName: 'id',
      },
      onDelete: 'CASCADE', // Deletes image if associated payment is deleted
    },
  },
});