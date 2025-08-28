const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'Image',
  tableName: 'payments_images',
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
    image: {
      type: 'longblob',
      nullable: false,
    },
    createdAt: {
      type: 'timestamp',
      createDate: true,
    },
  },
  relations: {
    payment: {
      target: 'paymentsDetails',
      type: 'many-to-one',
      joinColumn: {
        name: 'paymentId',
        referencedColumnName: 'id',
      },
      onDelete: 'CASCADE', // Deletes image if associated payment is deleted
    },
  },
});