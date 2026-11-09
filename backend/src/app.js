const cookieParser = require("cookie-parser");
const cors = require("cors");
const express = require("express");
const apiRouter = require("./routes");

const {
  errorHandler,
  notFoundHandler,
} = require("./middleware/errorMiddleware");
const {
  configuredOrigins,
  requireTrustedOrigin,
} = require("./middleware/trustedOrigin");

const app = express();
app.set("trust proxy", 1);

app.disable("x-powered-by");

app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || configuredOrigins().includes(origin)) {
        return callback(null, true);
      }
      const error = new Error("Origin is not allowed by CORS");
      error.status = 403;
      return callback(error);
    },
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: "100kb" }));
app.use(requireTrustedOrigin);

app.use("/api", apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
