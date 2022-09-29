const { json } = require("body-parser");
const mongoose = require("mongoose");
const User = require("./userSchema");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const authCookie = "jwt";
const secret = "mysecret";
const dbName = "samudra";
const express = require("express");
const rfc6902 = require("rfc6902");
const https = require("https");
const fs = require("fs");
const app = express();
const jimp = require("jimp");
const jwt = require("jsonwebtoken");
const morgan = require("morgan")
app.use(morgan("dev"))
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(json());
app.use(express.static("./static"));
async function dbConnect() {
  try {
    // default port : 27017
    const res11 = await mongoose.connect(`mongodb://localhost:27017/${dbName}`);
    return { status: 1 };
  } catch (err) {
    console.log(err);
    return { status: 0, err };
  }
}
function jwtCookie(id) {
  return jwt.sign({ id }, secret, {
    expiresIn: 3 * 24 * 60 * 60,
  });
}
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.removeHeader("X-powered-by");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "PATCH,POST"
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  if (req.method == "OPTIONS") {
    res.status(200);
    res.end();
  } else {
    next();
  }
});
app.post("/signup", async (req, res) => {
  try {
    const user = new User(req.body);
    const result = await user.save();
    res.status(201).send({
      message: "successful",
    });
  } catch (err) {
    res.status(400).send({
      status: 400,
      code: err.code,
      keyPattern: err.keyPattern,
      keyValue: err.keyValue,
      name: err.name,
      properties: err.properties,
      kind: err.kind,
      value: err.value,
    });
    console.log(err);
  }
});
app.post("/login", async (req, res) => {
  const cookies = req.cookies;
  let flag = true;
  if (authCookie in cookies) {
    try {
      const id = jwt.verify(cookies[authCookie], secret);
      let user = await User.findOne(
        { _id: id.id },
        {
          username: 1,
          _id: 1,
        }
      );
      if (user) {
        user = user.toObject();
        delete user.password;
        res.status(200).send({ user });
      } else {
        res.clearCookie(authCookie);
        res.status(400).send({
          message: "invalid cookie data.Need to relogin",
        });
      }
      flag = false;
    } catch (err) {
      flag = true;
    }
  }
  if (flag) {
    const uname = req.body.username;
    const pass = req.body.password;
    let user = await User.findOne(
      { username: uname },
      {
        username: 1,
        password: 1,
        _id: 1,
      }
    );
    if (user) {
      user = user.toObject();
      const result = await bcrypt.compare(pass, user.password);
      if (result) {
        res.cookie(authCookie, jwtCookie(user._id), {
          httpOnly: true,
          maxAge: 1000 * 3 * 24 * 60 * 60,
        });
        delete user.password;
        res.status(200)
        res.send({ user });
      } else {
        res.status(400)
        res.send({
          message: "email or password is incorrect ",
        });
      }
    } else {
      res.status(403)
      res.send({
        message: "invalid email id or password !!",
      });
    }
  }
  // res.send(200);
});
app.patch("/patch", async (req, res) => {
  const cookies = req.cookies;
  let flag = true;
  if (authCookie in cookies) {
    try {
      const id = jwt.verify(cookies[authCookie], secret);
      let user = await User.findOne(
        { _id: id.id },
        {
          username: 1,
          _id: 1,
        }
      );
      if (user) {
        user = user.toObject();
        delete user.password;
      } else {
        res.clearCookie(authCookie);
        res.status(400).send({
          message: "invalid cookie data.Need to relogin",
        });
      }
      flag = false;
    } catch (err) {
      flag = true;
    }
  }
  if (flag) {
    res.status(400).send({
      message: "invalid user ",
    });
    return;
  }
  let doc = req.body.doc;
  rfc6902.applyPatch(doc, req.body.patch);
  res.status(201)
  res.send({ doc });
});

async function resizeImage(file, type) {
  const image = await jimp.read(file);
  image.resize(50, 50).write(`resize.` + type);
}
app.post("/thumbnail", async (req, res) => {
  const cookies = req.cookies;
  let flag = true;
  if (authCookie in cookies) {
    try {
      const id = jwt.verify(cookies[authCookie], secret);
      let user = await User.findOne(
        { _id: id.id },
        {
          username: 1,
          _id: 1,
        }
      );
      if (user) {
        user = user.toObject();
        delete user.password;
      } else {
        res.clearCookie(authCookie);
        res.status(400).send({
          message: "invalid cookie data.Need to relogin",
        });
      }
      flag = false;
    } catch (err) {
      flag = true;
    }
  }
  if (flag) {
    res.status(400).send({
      message: "invalid user ",
    });
    return;
  }
  const file = fs.createWriteStream(`file.` + req.body.type);
  flag = true;
  https
    .get(req.body.url, function (response) {
      response.pipe(file);
      file.on("finish", function () {
        file.close(async () => {
          let res1 = await resizeImage(`file.` + req.body.type, req.body.type);
          res.status(200);
          res.sendFile(__dirname+`/resize.` + req.body.type);
        });
      });
      flag = true;
    })
    .on("error", function (err) {
      // Handle errors
      fs.unlink(`file.` + req.body.type); // Delete the file async. (But we don't check the result)
      res.status(400).send({
        message: "there seems to a problem with the image",
      });
      flag = false;
    });
});
app.post("/address", async (req, res) => {
  const cookies = req.cookies;
  let flag = true;
  if (authCookie in cookies) {
    try {
      const id = jwt.verify(cookies[authCookie], secret);
      var user = await User.findOneAndUpdate(
        { _id: id.id },
        {
          address: req.body.address,
        },
        {
          returnNewDocument: true,
          new: true,
          strict: false,
        }
      );
      if (user) {
        user = user.toObject();
        delete user.password;
        flag = false;
        res.status(201);
        res.end();
      } else {
        res.clearCookie(authCookie);
        flag = true;
      }
    } catch (err) {
      flag = true;
    }
  }
  if (flag) {
    res.status(400).send({
      message: "invalid user ",
    });
    return;
  }
});
let res = dbConnect();
if (res.status == 0) {
  console.error("db not connected exiting ---");
  process.exit(1);
}
app.listen(3000, () => {
  console.log("listening on http://localhost:3000");
});
