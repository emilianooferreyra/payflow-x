require("./setup-env");

const { execSync } = require("child_process");

module.exports = async function () {
  try {
    const connStr = process.env.DATABASE_URL;
    const baseUrl = connStr.substring(0, connStr.lastIndexOf("/"));
    const { Client } = require("pg");
    const admin = new Client({ connectionString: `${baseUrl}/postgres` });
    await admin.connect();
    await admin.query("CREATE DATABASE authdb_test").catch(() => {});
    await admin.end();
  } catch {
    // Admin connection not available (CI, restricted perms, etc.)
    // Assume database already exists or prisma will handle it
  }

  execSync("npx prisma db push --force-reset", { stdio: "inherit" });
};
