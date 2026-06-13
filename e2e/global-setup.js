require("./setup-env");

const { execSync } = require("child_process");

module.exports = async function () {
  const connStr = process.env.DATABASE_URL;
  const baseUrl = connStr.substring(0, connStr.lastIndexOf("/"));

  const { Client } = require("pg");
  const admin = new Client({ connectionString: `${baseUrl}/postgres` });
  await admin.connect();
  await admin.query("CREATE DATABASE authdb_test").catch(() => {});
  await admin.end();

  execSync("npx prisma db push --force-reset", { stdio: "inherit" });
};
