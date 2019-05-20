/* eslint-disable no-console */
import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import { config } from "dotenv";
import cors from "cors";

// room imports
import RoomData from "./models/roomData";

import mysession from "./routes/api/mysession";
import users from "./routes/api/users";
import { errorLogger, logger } from "./loggers";
import User from "./models/User";

config({ path: "./deploy/.env" });

const app = express();
const router = express.Router();

const dbName = process.env.NODE_ENV === "dev" ? "database-test" : "database";
const db = `mongodb://${process.env.MONGO_INITDB_ROOT_USERNAME}:${
  process.env.MONGO_INITDB_ROOT_PASSWORD
}@database:27017/${dbName}?authMechanism=SCRAM-SHA-1&authSource=admin`;

if (db === undefined) {
  throw Error("No Mongo URI set");
}

app.use(logger);

app.use(
  bodyParser.urlencoded({
    extended: false
  })
);

app.use(
  cors({
    origin: process.env.ALLOW_ORIGIN
  })
);

app.options("*", cors());

app.use(bodyParser.json());

mongoose.connect(db, { useNewUrlParser: true });
mongoose.connection.on("error", error => console.log(error));
mongoose.Promise = global.Promise;

app.use(router);

// API Routes goes here
router.use("/api/users", users);

// Session Route
router.use("/api/my-sessions", mysession);

app.use(errorLogger);

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

// ----------------SOCKET.IO------------------------
// THIS SHOULD GO INTO A SEPARTE FILE FOR IMPORT
const socket = require("socket.io");

const io = socket(server);
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
            console.log("user does not exist: ", user);
            return done(null, false, "user does not exist!");
          }
          console.log("USER TYPE ADMIN");
          return done(null, user);
        });
      } else {
        console.log("USER TYPE GUEST");
        return done();
      }
      return done();
    }
  )
);

let roomArrays = [];
const roomParticipants = [];

// eslint-disable-next-line no-shadow
io.on("connection", socket => {
  const role = socket.request.user.logged_in ? "admin" : "guest";
  console.log("you are connected as a: ", role);

  // Connect to session - if authenticated via JWT as admin Create room
  // if not authenticated join room as guest, if room exists
  socket.on("connectToNewSession", roomId => {
    if (role === "admin") {
      console.log("Teacher created room");
      socket.join(roomId);

      roomParticipants.push({
        userId: socket.id,
        value: 5,
        room_id: roomId,
        role
      });
      const newRoom = {
        id: roomId,
        isActive: false,
        users: roomParticipants
      };
      roomArrays.push(newRoom);
      socket.emit("newSessionCreated");
    } else {
      roomArrays.forEach(room => {
        if (room.id === roomId) {
          socket.join(roomId);
          // console.log(io.nsps["/"].adapter.rooms[roomId]);

          room.users.push({
            userId: socket.id,
            value: 5,
            room_id: roomId,
            role
          });
          console.log(`${role} joined ${roomId}`);
          socket.emit("joinedRoom", socket.id);
        }
      });
    }
    return roomArrays;
  });

  socket.on("feedbackSessionLeave", inputUserId => {
    roomArrays = roomArrays.map(room => {
      return {
        ...room,
        users: room.users.filter(user => user.userId !== inputUserId)
      };
    });
  });

  // When admin starts session the room value is updated and emitted to
  // the Guest page via sessoinStatusChanged
  // socket.on("sessionStart", roomId => {
  //   roomArrays = roomArrays.map(room => {
  //     if (room.id === roomId) {
  //       socket.emit("sessionStatusChanged", true);
  //       return { ...room, isActive: true };
  //     }
  //   });
  //   return roomArrays;
  // });

  // When admin stops session the room value is updated and emitted to
  // the Guest page via sessoinStatusChanged
  // socket.on("sessionStop", roomId => {
  //   roomArrays = roomArrays.map(room => {
  //     if (room.id === roomId) {
  //       socket.emit("sessionStatusChanged", false);
  //       return { ...room, isActive: false };
  //     }
  //     return roomArrays;
  //   });
  // });

  const averageUserValue = roomId => {
    const arrayToSum = [];
    const matchingRoom = roomArrays.filter(room => room.id === roomId);
    const guests = matchingRoom[0].users.filter(user => user.role === "guest");
    guests.forEach(guest => arrayToSum.push(parseInt(guest.value, 10)));
    const userCount = guests.length;

    if (arrayToSum.length) {
      const reducer = (accumulator, currentValue) => accumulator + currentValue;
      const valueArrayTot = arrayToSum.reduce(reducer);
      const roomAverageValue = (valueArrayTot / userCount).toFixed(1);
      // io.in(roomId).emit("roomAverageValue", roomAverageValue);
      // io.emit("roomAverageValue", roomAverageValue); // fungerar
      io.to(roomId).emit("roomAverageValue", roomAverageValue);

      arrayToSum.splice(0);
    }
  };

  // When guest connected to room changes the slider users value property will updated
  socket.on("changeSlider", (sliderValue, roomId, userId) => {
    roomArrays = roomArrays.map(room => {
      if (room.id === roomId) {
        room.users.map(user => {
          if (user.userId === userId) {
            const loser = user;
            loser.value = sliderValue;
            return loser;
          }
          return user;
        });
      }
      return room;
    });
    averageUserValue(roomId);
  });

  socket.on("disconnect", () => console.log("user disconnected", socket.id));

  // Load all sessions
  socket.on("loadSessions", () => {
    const connection = db;

    // Connect to MongoDB
    mongoose
      .connect(connection, { useNewUrlParser: true })
      .then(() => console.log("MongoDB connected!"))
      .catch(err => console.log(err));

    const dbs = mongoose.connection;

    dbs.on("error", console.error.bind(console, "connection error:"));

    const getSessionData = async function(req, res) {
      try {
        const result = await RoomData.find({}, function(err, docs) {
          if (!err) {
            console.log(docs);
            process.exit();
          } else {
            throw err;
          }
        });

        return res
          .status(200)
          .json({ ok: true, data: result.data.toRegJSON() });
      } catch (error) {
        return res.json(error);
      }
    };

    socket.emit("sendData", getSessionData);
    console.log(getSessionData);
  });

  // Triggered by button in LiveSession, establishes connection to mongoDB
  // and saves room data for specicied room
  socket.on("sendToDB", data => {
    // DB Config¨¨

    // eslint-disable-next-line camelcase
    const { roomId, user_id } = data;
    const dbz = db;
    console.log("dbz: ", dbz, "data", data);

    // Connect to MongoDB
    mongoose
      .connect(dbz, { useNewUrlParser: true })
      .then(() => console.log("MongoDB connected!"))
      .catch(err => console.log(err));

    const dbs = mongoose.connection;

    dbs.on("error", console.error.bind(console, "connection error:"));
    dbs.once("open", function() {
      console.log(roomArrays);
      const sessionData = [];
      roomArrays.map(room => {
        if (room.id === roomId) {
          sessionData.push(room);
        }
        return room;
      });
      User.findByIdAndUpdate(
        {
          _id: user_id
        },
        { $push: { session_data: sessionData } },
        { upsert: true },
        function(err, test) {
          if (err) {
            console.log("error");
          } else {
            console.log(test);
          }
        }
      );
    });
  });
});
