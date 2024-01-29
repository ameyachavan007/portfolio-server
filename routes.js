const express = require("express");
const session = require("express-session");
const redis = require("redis");
require("dotenv").config();


const redisClient = redis.createClient({
  host: process.env.REDIS_HOSTNAME,
  port: parseInt(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD
});
const router = express.Router();
const User = require("./user");

// Configure express-session
const sessionOptions = {
  secret: "this is my session key axios@10144", // Replace with your secret key
  resave: false,
  saveUninitialized: false,
  // cookie: { secure: false } // Set to true if using https
};

router.use(session(sessionOptions));

// Redis cache middleware
const cache = (req, res, next) => {
  const { username } = req.params;
  redisClient.get(username, (err, data) => {
    if (err) {
      console.error("Redis Error:", err);
      next();
    } else if (data !== null) {
      console.log(`User data for ${username} retrieved from Redis cache`);
      res.status(200).json({ user: JSON.parse(data) });
    } else {
      console.log(`User data for ${username} not found in Redis cache`);
      next();
    }
  });
};

// Log Redis connection failures
redisClient.on('error', (err) => {
  console.error("Redis Connection Error:", err);
});

//Sign-up route
router.post("/signup", async (req, res) => {
  const { email, username } = req.body;

  try {
    let userByUsername = await User.findOne({ username });
    if (userByUsername) {
      return res.status(403).json({ error: "Username already exists" });
    }
    let userByEmail = await User.findOne({ email });
    if (userByEmail) {
      return res.status(403).json({ error: "User already exists" });
    }

    return res.status(200).json({
      // user: doc,
      message: "SignUp successful",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//Login route
router.post("/", async (req, res) => {
  const { email, hashedPassword } = req.body;

  try {
    const user = await User.findOne({ email: email });
    if (!user) {
      // Send a JSON response instead of redirecting
      return res.status(404).json({ error: "User not found" });
    }

    if (hashedPassword !== user.password) {
      return res.status(401).json({ error: "Invalid password" });
    }
    req.session.userId = user._id;
    res.json({ message: "Login successful", user: user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// career-details route
router.post("/career-details", async (req, res) => {
  const {
    email,
    password,
    firstName,
    lastName,
    about,
    experiences,
    username,
    projects,
    github,
    instagram,
    twitter,
    linkedin,
    tagLine,
  } = req.body.user;

  const parsedExperiences = JSON.stringify(experiences);
  const parsedProjects = JSON.stringify(projects);
  try {
    const updateData = {
      username: username,
      email: email,
      password: password,
      firstName: firstName,
      lastName: lastName,
      about: about,
      experiences: parsedExperiences,
      projects: parsedProjects,
      github: github,
      instagram: instagram,
      twitter: twitter,
      linkedin: linkedin,
      tagLine: tagLine,
    };
    const user = await User.findOneAndUpdate(
      { username: username },
      updateData,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.status(200).json({ user: user });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/api/check-session", (req, res) => {
  if (req.session.userId) {
    // The user is logged in, return a success status
    res.status(200).json({ message: "Authenticated" });
  } else {
    // The user is not logged in, return an error status
    res.status(401).json({ message: "Not Authenticated" });
  }
});

router.get("/:username", cache, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    redisClient.setex(req.params.username, 3600, JSON.stringify(user));
    res.status(200).json({ user: user });
  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).send("Internal Server Error");
  }
});
module.exports = router;
