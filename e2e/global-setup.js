require("./setup-env");

const { execSync } = require("child_process");

module.exports = async function () {
  execSync("npx prisma db push --force-reset", { stdio: "inherit" });
};
