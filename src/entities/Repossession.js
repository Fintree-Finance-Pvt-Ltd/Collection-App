import { EntitySchema } from "typeorm";

export default new EntitySchema({
  name: "Repossession",
  tableName: "repossessions",

  columns: {
    id: { type: "int", primary: true, generated: true },
    userId: { type: "int", nullable: false },

    product: { type: "varchar", length: 64 },

    loanId: { type: "varchar", length: 64 },
    partnerLoanId: { type: "varchar", length: 128, nullable: true },

    customerName: { type: "varchar", length: 128, nullable: true },
    mobile: { type: "varchar", length: 20, nullable: false },
    panNumber: { type: "varchar", length: 50, nullable: true },

    vehicleNumber: { type: "varchar", length: 128, nullable: true },
    makeModel: { type: "varchar", length: 255, nullable: true },
    chassisNo: { type: "varchar", length: 128, nullable: true },
    engineNo: { type: "varchar", length: 128, nullable: true },
    batteryNo: { type: "varchar", length: 128, nullable: true },

    repoDate: { type: "datetime", nullable: true },
    repoReason: { type: "varchar", length: 64, nullable: true },
    agency: { type: "varchar", length: 255, nullable: true },
    fieldOfficer: { type: "varchar", length: 255, nullable: true },
    repoPlace: { type: "varchar", length: 255, nullable: true },
    vehicleCondition: { type: "varchar", length: 64, nullable: true },

    inventory: { type: "text", nullable: true },
    remarks: { type: "text", nullable: true },
    postRemarks: { type: "text", nullable: true },

    yardLocation: { type: "varchar", length: 255, nullable: true },
    yardIncharge: { type: "varchar", length: 255, nullable: true },
    yardContact: { type: "varchar", length: 20, nullable: true },
    yardReceipt: { type: "varchar", length: 128, nullable: true },

    latitude: { type: "decimal", precision: 10, scale: 7, nullable: true },
    longitude: { type: "decimal", precision: 10, scale: 7, nullable: true },

    createdAt: { type: "timestamp", createDate: true },
  },

  relations: {
    photos: {
      target: "RepossessionPhoto",
      type: "one-to-many",
      inverseSide: "repossession",
      cascade: true,
    },
  },
});
