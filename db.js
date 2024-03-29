const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL).then(() => {
      console.log("Connected to DB!!");
    });
  } catch (error) {
    console.error("Error connecting to the database", error);
    process.exit(1);
  }
};

module.exports = connectDB;
