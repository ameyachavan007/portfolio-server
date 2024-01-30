const express = require("express");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const bodyParser = require("body-parser");
const routes = require("./routes");
const connectDB = require("./db");

const server = express();
require("dotenv").config();

server.use(cors());
server.use(bodyParser.urlencoded({ extended: true }));
server.use(bodyParser.json());
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, 
  message: "Too many requests from this IP, please try again later",
});
server.use(limiter);
server.use("/", routes);

connectDB();

const PORT = process.env.PORT;

server.listen(PORT, () => {
  console.log("Server is running on port " + PORT);
});

