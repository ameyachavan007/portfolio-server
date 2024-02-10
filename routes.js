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
      req.userData = JSON.parse(data);
      next();
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

router.post("/home", async (req, res) => {
  const {username} = req.body;
  try{
    let user = await User.findOne({username});
    if(user){
      return res.status(200).json({message: "Username exists"});
    }
    else{
      return res.status(404).json({error: "Username not found"});
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
})

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

router.post("/forgot-password", async (req, res) => {
  const {email, username, password} = req.body;
  try {
    let user = await User.findOne({ username, email });
    if (user) {
      user.password = password;
      await user.save();
      res.status(200).json({ message: "Password updated successfully" });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  }catch (error) {
    console.error("Error updating password:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
})

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
    console.log("===career-details===",updateData);
    const user = await User.findOneAndUpdate(
      { username: username },
      updateData,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    // Store the updated user data in Redis cache
    redisClient.setex(username, 300, JSON.stringify(user));

    res.status(200).json({ updatedUser: user });
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
    const { username } = req.params;
    if (req.userData) {
      res.status(200).json({ user: req.userData });
    } else {
      const user = await User.findOne({ username: username });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      redisClient.setex(req.params.username, 300, JSON.stringify(user));
      res.status(200).json({ user: user });
    }
  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/:username/about", cache, async (req, res) => {
  try {
    if (req.userData && req.userData.about) {
      res.status(200).json({ about: req.userData.about });
    } else {
      // Implement database call if Redis fails after 3 retries
      console.log("Redis cache for 'about' data not available, performing database call...");
      const user = await User.findOne({ username: req.params.username });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      // Update Redis cache with fetched data
      redisClient.setex(req.params.username, 300, JSON.stringify(user));
      res.status(200).json({ about: user.about });
    }
  } catch (error) {
    console.error("Error retrieving about data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/:username/projects", cache, async (req, res) => {
  try {
    if (req.userData && req.userData.projects) {
      res.status(200).json({ projects: req.userData.projects });
    } else {
      // Implement database call if Redis fails after 3 retries
      console.log("Redis cache for 'projects' data not available, performing database call...");
      const user = await User.findOne({ username: req.params.username });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      // Update Redis cache with fetched data
      redisClient.setex(req.params.username, 300, JSON.stringify(user));
      res.status(200).json({ projects: user.projects });
    }
  } catch (error) {
    console.error("Error retrieving projects data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/:username/experiences", cache, async (req, res) => {
  try {
    if (req.userData && req.userData.experiences) {
      res.status(200).json({ experiences: req.userData.experiences });
    } else {
      // Implement database call if Redis fails after 3 retries
      console.log("Redis cache for 'experiences' data not available, performing database call...");
      const user = await User.findOne({ username: req.params.username });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      // Update Redis cache with fetched data
      redisClient.setex(req.params.username, 300, JSON.stringify(user));
      res.status(200).json({ experiences: user.experiences });
    }
  } catch (error) {
    console.error("Error retrieving experiences data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/:username/career-details", cache, async (req, res) => {
  try {
    let user;
    if (req.userData) {
      let userdata = req.userData;
      user = {
        firstName: userdata.firstName,
        lastName: userdata.lastName,
        about: userdata.about,
        experiences: userdata.experiences,
        projects: userdata.projects,
        github: userdata.github,
        twitter: userdata.twitter,
        linkedin: userdata.linkedin,
        instagram: userdata.instagram,
        tagLine: userdata.tagLine,
      }
      res.status(200).json({user: user});
    } else {
      res.status(404).json({ error: "Data not found for the user" });
    }
  } catch (error) {
    console.error("Error retrieving user data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
})

router.get("/:username/social-links", cache, async (req, res) => {
  try {
    let socialLinks;
    if (req.userData) {
      socialLinks = {
        github: req.userData.github,
        twitter: req.userData.twitter,
        linkedin: req.userData.linkedin,
        instagram: req.userData.instagram,
      };
      res.status(200).json({ socialLinks: socialLinks });
    } else {
      // Implement database call if Redis fails after 3 retries
      console.log("Redis cache for 'social-links' data not available, performing database call...");
      const user = await User.findOne({ username: req.params.username });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      // Update Redis cache with fetched data
      redisClient.setex(req.params.username, 300, JSON.stringify(user));
      
      socialLinks = {
        github: user.github,
        twitter: user.twitter,
        linkedin: user.linkedin,
        instagram: user.instagram,
      };
      res.status(200).json({ socialLinks: socialLinks });
    }
  } catch (error) {
    console.error("Error retrieving social-links data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


module.exports = router;
