// src/entity/user_sesssion.ts
import { EntitySchema } from "typeorm";

export default new EntitySchema({
  name: "userSessions",
  tableName: "user_sessions",
  columns: {
    id: {
      type: "int",
      primary: true,
      generated: true,
    },
    userId:{
        type:"int",
        nullable:false,
    },
     sessionId: {
      type: "varchar",
      length: 24,        // 36 is enough for UUID; 64 gives headroom
      nullable: false,
      name: "session_id",
    },
       action: {
      type: "varchar",
      length: 50,    
       nullable: true,    // 36 is enough for UUID; 64 gives headroom
     
      name: "action",
    },

    latitude: {
      type: "double precision",
      nullable: true,
    },
    longitude: {
      type: "double precision",
      nullable: true,
    },
    timestamp: {
      type: "timestamp",
      default: () => "CURRENT_TIMESTAMP",
      nullable: false,
    },
  },
});