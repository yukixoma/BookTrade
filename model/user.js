var mongoose    = require("mongoose");
var Schema      = mongoose.Schema;

var userSchema =  new Schema ({
    username:   String,
    password:   String,
    book:       Array,
    trade:      Array
})

var ModelClass = mongoose.model("user",userSchema);

module.exports = ModelClass;