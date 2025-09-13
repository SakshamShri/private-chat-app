const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const {chats} = require('./data/data.js');
const connectDB = require('./config/db.js');
const userRoutes = require('./routes/userRoutes.js');
const chatRoutes = require('./routes/chatRoutes.js');
const messageRoutes = require('./routes/messageRoutes.js');
const { notFound, errorHandler } = require('./middlewares/errorMiddlewares.js');
dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Connect to database
connectDB();
app.use('/api/user', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/message', messageRoutes);

//-----------------------deployment code-----------------------//
const __dirname1 = path.resolve();
if(process.env.NODE_ENV === 'production'){
    // Debug: Log current directory and available paths
    console.log('Current directory (__dirname1):', __dirname1);
    console.log('Process cwd:', process.cwd());
    
    // Try multiple possible paths
    const possiblePaths = [
        path.join(__dirname1, 'frontend', 'build'),
        path.join(__dirname1, '..', 'frontend', 'build'),
        path.join(process.cwd(), 'frontend', 'build'),
        path.join(__dirname1, 'build'),
        '/opt/render/project/src/frontend/build'
    ];
    
    let frontendPath = null;
    for (const testPath of possiblePaths) {
        console.log('Testing path:', testPath);
        try {
            const fs = require('fs');
            if (fs.existsSync(path.join(testPath, 'index.html'))) {
                frontendPath = testPath;
                console.log('Found frontend build at:', frontendPath);
                break;
            }
        } catch (err) {
            console.log('Path not accessible:', testPath);
        }
    }
    
    if (frontendPath) {
        app.use(express.static(frontendPath));
        app.get('*', (req, res) => {
            res.sendFile(path.join(frontendPath, 'index.html'));
        });
    } else {
        console.log('Frontend build not found, serving API only');
        app.get('*', (req, res) => {
            res.json({ message: 'API is running - Frontend build not found' });
        });
    }
}else{
    app.get('/',(req,res)=>{
        res.send("API is running");
    });
}

//-----------------------deployment code-----------------------//


// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});



app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, console.log(`Server started at port ${PORT}`));
const io = require("socket.io")(server, {
    pingTimeout: 60000,
    cors: {
        origin: process.env.NODE_ENV === 'production' 
            ? process.env.FRONTEND_URL || true 
            : "http://localhost:3000",
        credentials: true
    },
});

io.on("connection", (socket) => {
    console.log("User connected to socket.io");

    socket.on("setup", (userData) => {
        socket.join(userData._id);
        socket.userId = userData._id;
        socket.userName = userData.name;
        console.log(userData._id);
        socket.emit("connected");
    });

    socket.on('join chat', (room)=>{
        // Leave previous room if exists and clear typing indicators
        if (socket.currentRoom) {
            // Clear typing indicator from previous room before leaving
            socket.in(socket.currentRoom).emit('stop typing', socket.userId);
            socket.leave(socket.currentRoom);
            console.log(`user left room ${socket.currentRoom} and cleared typing indicator`);
        }
        
        // Join new room
        socket.join(room);
        socket.currentRoom = room;
        console.log("user joined room "+room);
    });

    socket.on('new message', (newMessageReceived)=>{
        console.log('📨 Received new message:', newMessageReceived.content);
        var chat = newMessageReceived.chat;
        if(!chat.users) {
            return console.log('chat.users not defined');
        }
        
        console.log('📤 Broadcasting to room:', chat._id);
        // Send message to OTHER users in the chat room (exclude sender)
        socket.in(chat._id).emit("message received", newMessageReceived);
    });

    socket.on('typing', (room) => {
        console.log(`User ${socket.userId} typing in room ${room}, currentRoom: ${socket.currentRoom}`);
        // Only emit typing if user is currently in this room
        if (socket.currentRoom === room) {
            socket.in(room).emit('typing', socket.userId, socket.userName);
            console.log(`Emitted typing to room ${room}`);
        } else {
            console.log(`Blocked typing event - user not in room ${room}`);
        }
    });

    socket.on('stop typing', (room) => {
        console.log(`User ${socket.userId} stop typing in room ${room}, currentRoom: ${socket.currentRoom}`);
        // Only emit stop typing if user is currently in this room
        if (socket.currentRoom === room) {
            socket.in(room).emit('stop typing', socket.userId);
            console.log(`Emitted stop typing to room ${room}`);
        } else {
            console.log(`Blocked stop typing event - user not in room ${room}`);
        }
    });

    socket.on('disconnect', () => {
        console.log(`User ${socket.userId} disconnected`);
        // Clean up any ongoing typing indicators for this user
        if (socket.currentRoom) {
            socket.in(socket.currentRoom).emit('stop typing', socket.userId);
        }
    });
});


