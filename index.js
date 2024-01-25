const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const routes = require("./routes");
const connectDB = require("./db");

const server = express();
require("dotenv").config();

server.use(cors());
server.use(bodyParser.urlencoded({ extended: true }));
server.use(bodyParser.json());
server.use("/", routes);

connectDB();

const PORT = process.env.PORT;

server.listen(PORT, () => {
  console.log("Server is running on port" + PORT);
});

// server.listen(8080, () => {
//   console.log("Server is running!");
// });
