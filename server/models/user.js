import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, minlength:3,trim:true},
  email: { type: String, unique: true, trim: true, required: true },
  password: {type: String, minlength: 6, trim: true,required:true},
});

const User=mongoose.model("User", userSchema);

export default User;