const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const noteSchema = new mongoose.Schema ({
    title: { type: String, required: true },
    content: { type: String, required: true },
    tags: { type: [String], default: []},
    isPinned: { type: Boolean, default: false }, 
    userId: { type: String, required: true }, 
    createdOn: { type: Date, default: new Date().getTime(),},
    image: { type: String, default: "" }
});
module.exports = mongoose.model("Note", noteSchema);