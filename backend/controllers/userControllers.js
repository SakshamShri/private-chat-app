const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const generateToken = require("../config/generateToken");

const registerUser = asyncHandler(async (req, res) => {
    const { name, email, password, pic } = req.body;
    
    if (!name || !email || !password) {
        res.status(400).json({ message: "Please fill all the fields" });
        return;
    }
    
    const userExists = await User.findOne({ email });
    if (userExists) {
        res.status(400).json({ message: "User already exists" });
        return;
    }
    
    const userData = { name, email, password };
    if (pic && pic.trim() !== '') {
        userData.pic = pic;
    }
    const user = await User.create(userData);
    if (user) {
        res.status(201).json({ 
            _id: user._id, 
            name: user.name, 
            email: user.email, 
            pic: user.pic, 
            token: generateToken(user._id) 
        });
    } else {
        res.status(400).json({ message: "Failed to create user" });
    }
});

const authUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        res.status(400).json({ message: "Please fill all the fields" });
        return;
    }
    
    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
        res.status(200).json({ 
            _id: user._id, 
            name: user.name, 
            email: user.email, 
            pic: user.pic, 
            token: generateToken(user._id) 
        });
    } else {
        res.status(401).json({ message: "Invalid email or password" });
    }
});

const allUsers = asyncHandler(async (req, res) => {
    const keyword = req.query.search ? {
        $or: [
            { name: { $regex: req.query.search, $options: "i" } },
            { email: { $regex: req.query.search, $options: "i" } }
        ]
    } : {};
    
    const users = await User.find(keyword).find({ _id: { $ne: req.user._id } });
    res.send(users);
});

const updateUserPic = asyncHandler(async (req, res) => {
    const { pic } = req.body;
    console.log('updateUserPic called with:', { pic, userId: req.user._id });
    
    if (!pic) {
        return res.status(400).json({ message: "pic is required" });
    }
    try {
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { pic },
            { new: true }
        );
        console.log('User updated:', user);
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        return res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            pic: user.pic,
            token: generateToken(user._id)
        });
    } catch (e) {
        console.error('Error updating user pic:', e);
        return res.status(500).json({ message: e.message || "Failed to update pic" });
    }
});

module.exports = { registerUser, authUser, allUsers, updateUserPic };
