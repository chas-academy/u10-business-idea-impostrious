/* eslint-disable no-console */
import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import { config } from "dotenv";
import cors from "cors";

import users from "./routes/api/users";
import mysession from "./routes/api/mysession";
import { errorLogger, logger } from "./loggers";
import User from "./models/User";
import ioInit from "./SocketManager";

config({ path: "./deploy/.env" });

const app = express();
const router = express.Router();

const dbName = process.env.NODE_ENV === "test" ? "database-test" : "database";
const db = `mongodb://${process.env.MONGO_INITDB_ROOT_USERNAME}:${
  process.env.MONGO_INITDB_ROOT_PASSWORD
}@database:27017/${dbName}?authMechanism=SCRAM-SHA-1&authSource=admin`;

if (db === undefined) {
  throw Error("No Mongo URI set");
}

// Loggers and bodyparser
app.use(logger);
app.use(errorLogger);
app.use(
  bodyParser.urlencoded({
    extended: false
  })
);
app.use(bodyParser.json());

// CORS settings
app.use(
  cors({
    origin: process.env.ALLOW_ORIGIN,
    credentials: true,
    allowedHeaders:
      "X-Requested-With, Content-Type, Authorization, If-None-Match",
    methods: "GET, POST, PATCH, PUT, DELETE, OPTIONS"
  })
);
app.options("*", cors());

// Router settings
app.use(router);
// API Routes
router.use("/api/users", users);
router.use("/api/my-sessions", mysession);

// eslint-disable-next-line no-unused-vars
app.use(function(err, req, res, next) {
  console.error(err); // Log error message in our server's console
  // eslint-disable-next-line no-param-reassign
  if (!err.statusCode) err.statusCode = 500; // If err has no specified error code, set error code to 'Internal Server Error (500)'
  res.status(err.statusCode).send(err.message); // All HTTP requests must have a response, so let's send back an error with its status code and message
});

const port = process.env.PORT || 5005;

const server = app.listen(port, () =>
  console.log(`Server up and running on port ${port} test!`)
);

// Database connection: it is going to retry on fail, up to five times
(function connectingToDB(count) {
  if (count <= 5) {
    mongoose.connect(db, { useNewUrlParser: true });
    mongoose.connection.on("connected", () => {
      console.info("Connected to MongoDB!");
    });
    mongoose.connection.on("error", error => {
      console.log(error);
      connectingToDB(count + 1);
    });
    mongoose.Promise = global.Promise;
  } else {
    console.log(
      count,
      `tries have been made to connect to MongoDB without success`
    );
  }
})(1);

// ----------------SOCKET.IO------------------------

const io = require("socket.io")(server);

io.origins("*:*");

const jwtAuth = require("socketio-jwt-auth");

io.use(
  jwtAuth.authenticate(
    {
      secret: process.env.JWT_SECRET,
      succeedWithoutToken: true
    },
    function(payload, done) {
      if (payload && payload._id) {
        User.findOne({ _id: payload._id }, function(err, user) {
          if (err) {
            console.log("error: ", err);
            return done(err);
          }
          if (!user) {
            // NO USER FOUND socket.request.user.logged_in = false
            return done(null, false, "user does not exist!");
          }
          // USER LOGGED IN AS ADMIN socket.request.user.logged_in = true
          return done(null, user);
        });
      } else {
        // USER IDENTIFIED AS GUEST socket.request.user.logged_in = false
        return done();
      }
      return done();
    }
  )
);

io.on("connection", socket => {
  const role = socket.request.user.logged_in ? "admin" : "guest";
  ioInit(io, socket, role);
});

// Export server for backend tests
module.exports = server;
