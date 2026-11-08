require("dotenv").config();

const app = require("./src/app");
const {
  validateAuthenticationConfiguration,
} = require("./src/config/auth");
const { connectToDatabase } = require("./src/config/database");
const {
  validateVerificationConfiguration,
} = require("./src/config/verification");

const port = Number(process.env.PORT) || 5000;

async function startServer() {
  validateAuthenticationConfiguration();
  validateVerificationConfiguration();
  await connectToDatabase();

  app.listen(port, () => {
    console.log(`Futurion backend listening on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error(`Unable to start Futurion backend: ${error.message}`);
  process.exit(1);
});
