const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const passport = require("passport");
const cors = require("cors");

const users = require("./routes/api/users");
const messages = require("./routes/api/messages");


const app = express();

// Port that the webserver listens to
const port = process.env.PORT || 5000;

const server = app.listen(port, () =>
  console.log(`Server running on port ${port}`)
);


// code change start
require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_AI_KEY);
console.log(genAI)
// code change end

const io = require("socket.io")(server);
// console.log(io)



// Body Parser middleware to parse request bodies
app.use(
  bodyParser.urlencoded({
    extended: false,
  })
);
app.use(bodyParser.json());
// CORS middleware
app.use(cors());

// code change start
app.post("/gemini", async (req, res) => {
  try {
      console.log("trying")
      // console.log(req.body.message)
      // async function run() {
          // For text-only input, use the gemini-pro model
          const model = genAI.getGenerativeModel({ model: "gemini-pro"});
          // console.log("question - ", req.body)
          const prompt = req.body.message
          // console.log(typeof(prompt), prompt)
          const result = await model.generateContent(prompt);
          console.log("tried running")
          // result.then(()=>console.log("promise ended now"));
          const response = await result.response;
          const text = response.text();
          console.log("gemini ran")
          console.log("answer - ", text)
          res.send(text);
      // }
      
      // run();
  } catch (error) {
      // console.log(error)
      // console.log(error.response)
      // console.log(error.response.candidates)
      // console.log(error.response.candidates[0].safetyRatings)
      return res.status(400).json({
      success: false,
      error: error.response
          ? error.response.data
          : "There was an issue on the server",
      });
  }
  });
// code change end







// Database configuration
const db = require("./config/keys").mongoURI;




mongoose
  .connect(db, {

  })
  .then(() => console.log("MongoDB Successfully Connected"))
  .catch((err) => console.log(err));

// Passport middleware
app.use(passport.initialize());
// Passport config
require("./config/passport")(passport);

// Assign socket object to every request
app.use(function (req, res, next) {
  req.io = io;
  next();
});

// Routes
app.use("/api/users", users);
app.use("/api/messages", messages);
