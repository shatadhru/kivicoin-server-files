
const dotenv = require("dotenv");
require("dotenv").config();

const mongoDb = mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error(err));
