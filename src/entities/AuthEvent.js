import { EntitySchema } from 'typeorm';
import User from './User.js'; // Reference to your User entity

export default new EntitySchema({
  name: 'AuthEvent',
  tableName: 'auth_events',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: 'increment',
      name: 'Id',
    },
    createdAt: {
      type: 'date',
      nullable: true,
      name: 'Created At',
    },
    userId: {
      type: 'int',
      nullable: false,
      name: 'User Id',
    },
    action: {
      type: 'varchar',
      length: 10,
      nullable: false,
      name: 'Action',
    },
    latitude: {
      type: 'decimal',
      precision: 9,
      scale: 6,
      nullable: true,
      name: 'Latitude',
    },
    longitude: {
      type: 'decimal',
      precision: 9,
      scale: 6,
      nullable: true,
      name: 'Longitude',
    },
    timestamp: {
      type: 'timestamp',
      nullable: true,
      name: 'Timestamp',
    },
  },
  relations: {
    user: {
      target: User, // Link to User entity
      type: 'many-to-one',
      joinColumn: { name: 'User Id' }, // Matches column name
      nullable: false,
    },
  },
  indices: [
    { name: 'IDX_AUTH_EVENT_USER', columns: ['userId'] }, // Use property name 'userId', not DB name 'User Id'
    { name: 'IDX_AUTH_EVENT_ACTION', columns: ['action'] }, // Use property name 'action', not DB name 'Action'
  ],
});