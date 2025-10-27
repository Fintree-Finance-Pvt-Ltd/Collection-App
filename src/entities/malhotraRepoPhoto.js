// src/entities/RepossessionPhoto.schema.js
import { EntitySchema } from 'typeorm';

export default new EntitySchema({
  name: 'MalhotraRepoPhoto',
  tableName: 'malhotra_repo_photos',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    fileData: {
      name: 'file_data',
      type: 'mediumblob', // Use BLOB to store binary data
      nullable: false,
    },
    originalName: {
      name: 'original_name',
      type: 'varchar',
      length: 255,
      nullable: true,
    },
    mimeType: {
      name: 'mime_type',
      type: 'varchar',
      length: 100,
      nullable: true,
    },
    photoType: {
      name: 'photo_type',
      type: 'varchar',
      length: 20,
      nullable: false, // 'PRE' or 'POST' to indicate pre- or post-repossession
    },
    label: {
      type: 'varchar',
      length: 255,
      nullable: true,
    },
    orderIndex: {
      name: 'order_index',
      type: 'int',
      default: 0,
    },
    createdAt: {
      name: 'created_at',
      type: 'timestamp',
      createDate: true,
    },
  },
  relations: {
    repossession: {
      type: 'many-to-one',
      target: 'MalhotraRepossession',
      joinColumn: {
        name: 'repossession_id',
      },
      onDelete: 'CASCADE',
    },
  },
});