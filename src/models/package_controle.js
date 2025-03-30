const mongoose = require("mongoose");

const packages_schema = new mongoose.Schema({
  name: { type: String, required: true },
  package_genarative_secret: {type: String , required: true },
  user_id: {type : String , required : true},
  username: {type: String , required : true}
  
});

module.exports = mongoose.model("Packages", packages_schema);
