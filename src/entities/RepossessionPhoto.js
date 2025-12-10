import { EntitySchema } from "typeorm";

export default new EntitySchema({
  name: "RepossessionPhoto",
  tableName: "repossession_photos",

  columns: {
    id: { primary: true, type: "int", generated: true },
    photoType: { type: "varchar", length: 50, nullable: true },
    photo: { type: "longblob" },
    createdAt: { type: "timestamp", createDate: true },
  },

  relations: {
    repossession: {
      type: "many-to-one",
      target: "Repossession",
      joinColumn: { name: "repossessionId" },
      onDelete: "CASCADE",
    },
  },
});
