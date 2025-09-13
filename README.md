# Private Chat App

A real-time chat application built with React, Node.js, Express, MongoDB, and Socket.io.

## Features

- **Real-time messaging** with Socket.io
- **User authentication** with JWT tokens
- **1:1 Direct Messages** - Start chats with just an email
- **Group Chats** - Create groups, manage members, rename, and set custom photos
- **Unified Search** - Find users, direct chats, and groups with keyboard navigation
- **Avatar & Photo Preview** - Click avatars to preview photos and details
- **Modern Dark UI** - Elegant dark design with Chakra UI
- **Responsive Design** - Works on desktop and mobile devices
- **Typing Indicators** - See when other users are typing in real-time
- **Room-based Chat System** - Users join specific chat rooms for organized messaging
- **Auto-disconnect Cleanup** - Proper cleanup of typing indicators on user disconnect

## Tech Stack

### Frontend
- React 18.3.1 (Hooks)
- React Router DOM 6.30.1
- Chakra UI 3.26.0
- Axios 1.11.0
- Socket.io Client 4.8.1
- React Icons
- Tailwind CSS (for additional styling)

### Backend
- Node.js + Express 4.18.2
- MongoDB with Mongoose 7.5.0
- JWT Authentication (jsonwebtoken 9.0.2)
- bcrypt 6.0.0 for password hashing
- Socket.io 4.x for real-time communication
- CORS 2.8.5 for cross-origin requests
- dotenv 16.3.1 for environment variables

## Project Structure

```
chatapp/
├── backend/
│   ├── config/
│   │   ├── db.js
│   │   └── generateToken.js
│   ├── controllers/
│   │   ├── chatControllers.js
│   │   ├── messageControllers.js
│   │   └── userControllers.js
│   ├── middlewares/
│   │   ├── authMiddleware.js
│   │   └── errorMiddlewares.js
│   ├── models/
│   │   ├── chatModel.js
│   │   ├── messageModel.js
│   │   └── userModel.js
│   ├── routes/
│   │   ├── chatRoutes.js
│   │   ├── messageRoutes.js
│   │   └── userRoutes.js
│   ├── .env
│   ├── package.json
│   └── server.js
└── frontend/
    ├── public/
    ├── src/
    │   ├── Pages/
    │   │   ├── Homepage.js
    │   │   └── Chatpage.js
    │   ├── components/
    │   │   ├── component/
    │   │   │   ├── LoginPage.js
    │   │   │   └── SignupPage.js
    │   │   ├── ui/
    │   │   └── singlechat.js
    │   ├── context/
    │   ├── App.js
    │   └── index.js
    ├── package.json
    └── build/
```

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with the following variables:
```env
JWT_SECRET=your_jwt_secret_key_here
PORT=5000
MONGO_URI=mongodb://localhost:27017/chatapp
NODE_ENV=development
```

> **Note**: Make sure MongoDB is running on your system before starting the backend server.

4. Start the backend server:
```bash
npm start
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the frontend directory (optional):
```env
REACT_APP_API_URL=http://localhost:5000
```

4. Start the frontend development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000` and the backend on `http://localhost:5000`.

## API Endpoints

### Authentication
- `POST /api/user/login` - User login
- `POST /api/user/` - User registration
- `GET /api/user?search=` - Search users

### Chats
- `POST /api/chat` - Access/create 1:1 chat
- `GET /api/chat` - Fetch user's chats
- `POST /api/chat/group` - Create group chat
- `PUT /api/chat/rename` - Rename group
- `PUT /api/chat/groupadd` - Add user to group
- `PUT /api/chat/groupremove` - Remove user from group

### Messages
- `POST /api/message` - Send message
- `GET /api/message/:chatId` - Get messages for a chat

## Socket.io Events

### Client to Server
- `setup` - Initialize user connection with user data
- `join chat` - Join a specific chat room
- `new message` - Send a new message to a chat
- `typing` - Indicate user is typing in a chat
- `stop typing` - Stop typing indicator

### Server to Client
- `connected` - Confirmation of successful connection
- `message received` - New message broadcast to chat participants
- `typing` - Another user started typing
- `stop typing` - Another user stopped typing

## Deployment

### Production Build

1. Build the frontend:
```bash
cd frontend
npm run build
```

2. Set environment to production:
```env
NODE_ENV=production
```

3. Start the backend server:
```bash
cd backend
npm start
```

The app will serve the built frontend files from the backend server.

## Security Features

- JWT token-based authentication
- Password hashing with bcrypt
- Protected routes with middleware
- Input validation and sanitization
- CORS configuration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Author

**Saksham Shrivastava**  
JECRC University, Final Year

## License

This project is for educational purposes.

---

Made with ❤️ by Saksham Shrivastava
