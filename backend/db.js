const { Pool } = require("pg")

const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_dp2uJeCoijD0@ep-misty-dust-aip756d9-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"})

module.exports = pool