const mongoose = require("mongoose");
const Schema = mongoose.Schema;
var ObjectId = mongoose.Schema.Types.ObjectId;
const bcrypt = require("bcrypt");
const saltRounds = 10;
function hashPassword(plainText) {
  return new Promise((resolve, reject) => {
    bcrypt.hash(plainText, saltRounds, function (err, hash) {
      if (err) {
        reject(err);
      }
      resolve(hash);
    });
  });
}
const userSchema = new Schema(
  {
    username: {
      type: String,
      required: [true, "username is required"],
      unique: [true, "${VALUE} is already present"],
    },
    password: {
      type: String,
      validator: (v) => typeof v == "string" && v.length >= 6,
      message: () => `password is not valid`,
      required: [true, "password is required"],
    },
  },
  { timestamps: true, strict: false }
);
userSchema.pre("save", async function (next) {
  try {
    this.password = await hashPassword(this.password);
    next();
  } catch (err) {
    console.error("there was an error");
    next(err);
  }
});
const User = mongoose.model("user", userSchema);
module.exports = User;
