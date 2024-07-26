require('dotenv').config();
const config = require("./config.json");
const mongoose=require("mongoose");
const express=require(`express`);
const app=express();
const cors=require('cors');
const path = require("path");
//jwt
const jwt=require('jsonwebtoken');
const {authenticateToken} = require("./utilities");
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
//middlewares
app.use(express.json());
app.use(cors({
    origin:"*",
}));


//connect mongo db
mongoose.connect(config.connectionString);
//user.models
const User = require('./models/user.model');

//creating note model
const Note= require("./models/note.model");
const multer = require("multer");

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Directory to save uploaded files
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Filename with timestamp
    }
});

const upload = multer({ storage: storage });
//functions in notes
//add note
app.post("/add-note", authenticateToken,upload.single('image'), async (req, res) => {
    const { title, content, tags } = req.body;
    const { user } = req.user;
    const image = req.file ? req.file.path : ""; // Path to the uploaded file
    //debug statements
    console.log(req.body); // Add this to debug
    console.log(req.file);  // Add this to debug
    if (!title) {
        return res.status(400).json({ error: true, message: "Title is required" });
    }
    if (!content) {
        return res.status(400).json({ error: true, message: "Content is required" });
    }

    try {
        const note = new Note({
            title,
            content,
            tags: tags ? JSON.parse(tags) : [], // Convert string to array
            userId: user._id,
            image: image || "", // Save the file path
        });
        await note.save();
        return res.json({
            error: false,
            note,
            message: "Note added successfully",
        });
    } catch (error) {
        return res.status(500).json({
            error: true,
            message: "Internal Server Error",
        });
    }
});

//edit note
app.put("/edit-note/:noteId",authenticateToken, upload.single('image'),async(req,res)=>{
    const noteId = req.params.noteId;
    const { title, content, tags, isPinned} = req.body;
    const {user} = req.user;
    console.log("Heloo",{user})
    if (!title && !content && !tags && !req.file) {
        return res.status(400).json({ error: true, message: "No changes provided" }); }
    try {
        const note = await Note.findOne({_id: noteId, userId: user._id});
        if(!note){
            return res.status(404).json({error: true, message: "Note not found"});
        }
        if(title) note.title=title;
        if(content) note.content = content;
        if(tags) note.tags = tags;
        if(isPinned) note.isPinned = isPinned;
        if (req.file) note.image = req.file.path;
        await note.save();
        return res.json({
        error: false,
        note,
        message: "Note Updated successfully",
        } );
    }catch (error){
        return res.status(500).json({
        error: true,
        message: "Internal Server Error",
        });
    }
});
//get all notes
app.get("/get-all-notes/",authenticateToken,async(req,res)=>{
    const {user} = req.user;
    try {
        const notes = await Note.find({ userId: user._id}).sort({isPinned:-1});
        return res.json({
            error: false,
            notes,
            message:"All notes are retrieved successfully",
        });
    }catch (error){
        return res.status(500).json({
        error: true,
        message: "Internal Server Error",
        });
    }
});
// delete note
app.delete("/delete-note/:noteId",authenticateToken,async(req,res)=>{
    const noteId = req.params.noteId;
    const {user} = req.user;
    try {
        const note = await Note.findOne({_id: noteId, userId: user._id});
        if(!note){
            return res.status(404).json({error: true, message: "Note not found"});
        }
        await Note.deleteOne({_id: noteId, userId: user._id});
        return res.json({
            error: false,
            message:"Note deleted successfully",
        });
    }catch (error){
        return res.status(500).json({
        error: true,
        message: "Internal Server Error",
        });
    }
});
app.get("/",(req,res)=>{
    res.json({data: "hello"});
});
//update-pinned-note
app.put("/update-note-pinned/:noteId",authenticateToken,async(req,res)=>{
    const noteId = req.params.noteId;
    const { isPinned} = req.body;
    const {user} = req.user;
    try {
        const note = await Note.findOne({_id: noteId, userId: user._id});
        if(!note){
            return res.status(404).json({error: true, message: "Note not found"});
        }
        note.isPinned = isPinned;
        await note.save();
        return res.json({
        error: false,
        note,
        message: "Note Updated successfully",
        } );
    }catch (error){
        return res.status(500).json({
        error: true,
        message: "Internal Server Error",
        });
    }
});
///account sigin functions
//create account
app.post('/create-account', async(req,res)=>{
    const{firstName, lastName, email,password } = req.body;
    if(!firstName){
        return res.status(400).json({error:true, messages: "First Name is Required"});
    }
    if(!lastName){
        return res.status(400).json({error:true, messages: "Last Name is Required"});
    }
    if(!email){
        return res.status(400).json({error:true, messages: "Email is Required"});
    }
    if(!password){
        return res.status(400).json({error:true, messages: "Password is Required"});
    }
    const isUser=await User.findOne({email:email});
    if(isUser){
        return res.json({
            error:true,
            message: "User already exists",
        });
    }
    const user=new User({
        firstName,
        lastName,
        email,
        password,
    });
    await user.save();
    const accessToken=jwt.sign({user},process.env.ACCESS_TOKEN_SECRET,{
        expiresIn: "36000m"
    });
    return res.json({
        errors: false,
        user,
        accessToken,
        message: "Registration Successful"
    });
});
//login into account 
app.post('/login', async(req,res)=>{
    const{email,password } = req.body;
    
    if(!email){
        return res.status(400).json({error:true, messages: "Email is Required"});
    }
    if(!password){
        return res.status(400).json({error:true, messages: "Password is Required"});
    }
    const userInfo=await User.findOne({email:email});
    if(!userInfo){
        return res.status(400).json({
            message: "User not found",
        });
    }
    if(userInfo.email==email && userInfo.password==password){
        const user={user: userInfo}
        const accessToken=jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{
        expiresIn: "36000m"
    });
    return res.json({
        error: false,
        user,
        accessToken,
        message: "Login Successful"
    });
}else{
    return res.status(400).json({
        error: true,
        message: "Invalid Credentials",
    })
}
});
//get user
app.get('/get-user', authenticateToken, async(req,res)=>{
    const{ user } = req.user;
    const isUser= await User.findOne({_id:user._id});

    if(!isUser){
        return res.status(401);
    }
    return res.json({
        error: false,
        user:{firstName: isUser.firstName,lastName: isUser.lastName,email: isUser.email,"_id": isUser._id, createdOn: isUser.createOne},
        message: ""
    });
});
app.listen(3000);
module.exports=app;