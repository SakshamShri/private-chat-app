import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
const ENDPOINT = process.env.NODE_ENV === 'production' ? window.location.origin : "http://localhost:5000";
var socket, selectedChatCompare;

const SingleChat = ({ 
    selectedChat, 
    token, 
    currentUserId, 
    currentUserName, 
    currentUserPic, 
    onMessageSent,
    chats,
    setChats,
    setSelectedChat
}) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [isUserScrolling, setIsUserScrolling] = useState(false);
    const [showNewMessageButton, setShowNewMessageButton] = useState(false);
    const [showScrollToBottomButton, setShowScrollToBottomButton] = useState(false);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [isTyping, setIsTyping] = useState(false);
    const [typingUsers, setTypingUsers] = useState([]);
    const [keyboardOpen, setKeyboardOpen] = useState(false);
    const [socketConnected, setSocketConnected] = useState(false);
    const typingTimeoutRef = useRef(null);
    
    // Chat management states
    const [manageMembersOpen, setManageMembersOpen] = useState(false);
    const [memberSearch2, setMemberSearch2] = useState("");
    const [memberSuggestions2, setMemberSuggestions2] = useState([]);
    const [isGroupMode, setIsGroupMode] = useState(false);
    const [groupName, setGroupName] = useState("");
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [memberSearch, setMemberSearch] = useState("");
    const [memberSuggestions, setMemberSuggestions] = useState([]);
    
    // Group photo management
    const [chatPhotos, setChatPhotos] = useState(() => {
        try { return JSON.parse(localStorage.getItem('chatPhotos') || '{}'); } catch { return {}; }
    });
    
    const persistChatPhotos = (next) => {
        setChatPhotos(next);
        try { localStorage.setItem('chatPhotos', JSON.stringify(next)); } catch {}
    };
    
    const uploadToCloudinary = (file) => {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error("No file provided"));
                return;
            }
            
            // Check file type
            if (file.type !== "image/jpeg" && file.type !== "image/png") {
                reject(new Error("Please select a JPEG or PNG image"));
                return;
            }
            
            // Check file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                reject(new Error("Image size too large. Please select an image smaller than 10MB"));
                return;
            }
            
            const data = new FormData();
            data.append("file", file);
            data.append("upload_preset", process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET);
            
            const uploadUrl = `https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}/image/upload`;
            
            fetch(uploadUrl, {
                method: "post",
                body: data,
            })
            .then((res) => {
                if (!res.ok) {
                    return res.json().then(errorData => {
                        throw new Error(`Upload failed: ${errorData.error?.message || 'Unknown error'}`);
                    });
                }
                return res.json();
            })
            .then((responseData) => {
                const imageUrl = responseData.secure_url || responseData.url;
                if (imageUrl) {
                    resolve(imageUrl);
                } else {
                    reject(new Error("No valid image URL returned from Cloudinary"));
                }
            })
            .catch(reject);
        });
    };
    
    const getChatAvatar = (chat) => {
        if (chat.isGroupChat) {
            const override = chatPhotos[chat._id];
            const defaultGroupPic = "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg";
            return { pic: override || defaultGroupPic, name: chat.chatName?.[0] || "G" };
        }
        const other = (chat.users || []).find((u) => u._id !== currentUserId);
        const defaultUserPic = "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg";
        return { pic: other?.pic || defaultUserPic, name: other?.name || "U" };
    };
    
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const scrollTimeoutRef = useRef(null);

    // Auto-scroll to bottom when new messages arrive
    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ 
                behavior: "smooth", 
                block: "end",
                inline: "nearest"
            });
        }
    };
    // Socket setup
    useEffect(() => {
        socket = io(ENDPOINT);
        const currentUser = {
            _id: currentUserId,
            name: currentUserName,
            pic: currentUserPic
        };
        socket.emit("setup", currentUser);
        socket.on('connected', () => setSocketConnected(true));
        
        return () => {
            socket.disconnect();
        };
    }, [currentUserId, currentUserName, currentUserPic]);

    // Check if user is at bottom of chat
    const checkIfAtBottom = () => {
        const messagesContainer = messagesContainerRef.current;
        if (messagesContainer) {
            // Increase threshold to account for typing indicator height
            const isNearBottom = messagesContainer.scrollTop + messagesContainer.clientHeight >= messagesContainer.scrollHeight - 150;
            setIsAtBottom(isNearBottom);
            
            // Show scroll to bottom button if scrolled up significantly (more than ~10 messages worth)
            const scrolledUpDistance = messagesContainer.scrollHeight - (messagesContainer.scrollTop + messagesContainer.clientHeight);
            setShowScrollToBottomButton(scrolledUpDistance > 600); // ~10 messages * 60px average height
            
            return isNearBottom;
        }
        return true;
    };

    // Handle scroll events
    const handleScroll = () => {
        setIsUserScrolling(true);
        const isCurrentlyAtBottom = checkIfAtBottom();
        
        // Hide new message button if user manually scrolls to bottom
        if (isCurrentlyAtBottom && showNewMessageButton) {
            setShowNewMessageButton(false);
        }
        
        // Clear timeout and set new one
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }
        scrollTimeoutRef.current = setTimeout(() => {
            setIsUserScrolling(false);
        }, 1000);
    };

    // Auto-scroll to bottom only when chat is first loaded
    useEffect(() => {
        if (messages.length > 0) {
            const messagesContainer = messagesContainerRef.current;
            if (messagesContainer) {
                // Only auto-scroll if user hasn't manually scrolled and is at bottom
                if (!isUserScrolling && isAtBottom) {
                    const currentScrollHeight = messagesContainer.scrollHeight;
                    const currentScrollTop = messagesContainer.scrollTop;
                    const clientHeight = messagesContainer.clientHeight;
                    
                    // Only scroll if we're actually near the bottom
                    if (currentScrollTop + clientHeight >= currentScrollHeight - 50) {
                        scrollToBottom();
                    }
                }
            }
        }
    }, [messages.length]); // Only trigger when message count changes, not on every render

    // Fetch messages when a chat is selected
    useEffect(() => {
        const fetchMessages = async () => {
            if (!selectedChat || !token) return;
            
            setLoading(true); // Show loading state
            
            try {
                const config = {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                };
                const { data } = await axios.get(`/api/message/${selectedChat._id}`, config);
                
                // Reset user scrolling state when switching chats so auto-scroll works
                setIsUserScrolling(false);
                setIsAtBottom(true);
                
                // Set messages and immediately scroll to bottom before showing
                setMessages(data);
                
                // Join the chat room for real-time updates
                if (socket && socketConnected) {
                    socket.emit('join chat', selectedChat._id);
                }
                
                // Instantly position at bottom before rendering
                requestAnimationFrame(() => {
                    const messagesContainer = messagesContainerRef.current;
                    if (messagesContainer) {
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    }
                    setLoading(false); // Hide loading after positioning
                });
                
            } catch (error) {
                // Handle error silently
                setLoading(false);
            }
        };

        fetchMessages();
        selectedChatCompare = selectedChat;
    }, [selectedChat, token]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, []);

    // Send message function
    const sendMessage = async () => {
        if (!newMessage.trim() || !selectedChat || !token || sending) return;

        const messageData = {
            content: newMessage.trim(),
            chatId: selectedChat._id
        };

        // Don't show loading spinner for optimistic UI
        // setSending(true);
        
        // Optimistic UI update - show message immediately
        const optimisticMessage = {
            _id: Date.now().toString(), // Temporary ID
            content: messageData.content,
            sender: { _id: currentUserId, name: currentUserName },
            chat: selectedChat,
            createdAt: new Date().toISOString(),
            isOptimistic: true
        };
        
        setMessages(prev => [...prev, optimisticMessage]);
        setNewMessage('');
        setIsUserScrolling(false);
        
        try {
            const { data } = await axios.post('/api/message', messageData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            // Replace optimistic message with real message
            setMessages(prev => prev.map(msg => 
                msg.isOptimistic && msg.content === data.content ? data : msg
            ));
            
            // Emit message to socket for real-time delivery to other users
            if (socket) {
                socket.emit('new message', data);
            }
            
            // Notify parent component about the new message
            if (onMessageSent) {
                onMessageSent(data);
            }
            
            // Don't auto-focus back to input to prevent keyboard flickering
            // User can tap input to bring keyboard back when needed
        } catch (error) {
            console.error('Error sending message:', error);
            // Remove failed optimistic message
            setMessages(prev => prev.filter(msg => !msg.isOptimistic));
            // Restore message text for retry
            setNewMessage(messageData.content);
            alert('Failed to send message. Please try again.');
        }
    };


    // Message listener - setup once when socket connects
    useEffect(() => {
        if (!socket || !socketConnected) return;

        const handleMessageReceived = (newMessageReceived) => {
            console.log('📨 Frontend received message:', newMessageReceived.content);
            if (!selectedChatCompare || selectedChatCompare._id !== newMessageReceived.chat._id) {
                console.log('❌ Message not for current chat');
                // give notification
            } else {
                console.log('✅ Adding message to current chat');
                setMessages(prev => [...prev, newMessageReceived]);
                
                // Update parent component's last message and move chat to top
                if (onMessageSent) {
                    onMessageSent(newMessageReceived);
                }
                
                // Check if user is at bottom before deciding to auto-scroll
                const isCurrentlyAtBottom = checkIfAtBottom();
                if (isCurrentlyAtBottom) {
                    // Auto-scroll if user is at bottom
                    setTimeout(() => {
                        scrollToBottom();
                    }, 100);
                } else {
                    // Show new message button if user is scrolled up
                    setShowNewMessageButton(true);
                }
            }
        };

        const handleTyping = (userId, userName) => {
            if (userId !== currentUserId) {
                setTypingUsers(prev => {
                    if (!prev.find(user => user.id === userId)) {
                        const newUsers = [...prev, { id: userId, name: userName }];
                        
                        // Only auto-scroll if user is already at bottom
                        const isCurrentlyAtBottom = checkIfAtBottom();
                        if (isCurrentlyAtBottom) {
                            setTimeout(() => {
                                scrollToBottom();
                            }, 100);
                        }
                        
                        return newUsers;
                    }
                    return prev;
                });
            }
        };

        const handleStopTyping = (userId) => {
            setTypingUsers(prev => prev.filter(user => user.id !== userId));
        };

        socket.on("message received", handleMessageReceived);
        socket.on('typing', handleTyping);
        socket.on('stop typing', handleStopTyping);

        return () => {
            socket.off("message received", handleMessageReceived);
            socket.off('typing', handleTyping);
            socket.off('stop typing', handleStopTyping);
        };
    }, [socketConnected, currentUserId]);



    // Handle typing events
    const handleTyping = () => {
        if (!isTyping && socket && selectedChat) {
            setIsTyping(true);
            socket.emit('typing', selectedChat._id);
            
            // Prevent auto-scroll when current user starts typing
            setIsUserScrolling(true);
        }
        
        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        
        // Set new timeout to stop typing after 3 seconds of inactivity
        typingTimeoutRef.current = setTimeout(() => {
            if (socket && selectedChat) {
                socket.emit('stop typing', selectedChat._id);
                setIsTyping(false);
                setIsUserScrolling(false);
            }
        }, 3000);
    };

    // Handle Enter key press
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            // Stop typing when sending message
            if (socket && selectedChat) {
                socket.emit('stop typing', selectedChat._id);
                setIsTyping(false);
            }
            sendMessage();
        }
    };

    // Format time for message display
    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInHours = (now - date) / (1000 * 60 * 60);
        
        if (diffInHours < 24) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffInHours < 48) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString();
        }
    };

    // Check if message is from current user
    const isOwnMessage = (message) => {
        return message.sender && message.sender._id === currentUserId;
    };

    // Get other user in direct chat
    const getOtherUser = () => {
        if (!selectedChat || selectedChat.isGroupChat) return null;
        return selectedChat.users?.find(u => u._id !== currentUserId);
    };

    // Check if current user is group admin
    const isGroupAdmin = selectedChat?.groupAdmin?._id === currentUserId;

    // Chat management functions
    const toggleUserSelect = (user) => {
        const exists = selectedUsers.find((u) => u._id === user._id);
        if (exists) {
            setSelectedUsers((prev) => prev.filter((u) => u._id !== user._id));
        } else {
            setSelectedUsers((prev) => [...prev, user]);
        }
    };

    const handleCreateGroup = async () => {
        if (!token) return;
        if (!groupName.trim()) {
            window.alert("Please enter a group name");
            return;
        }
        if (selectedUsers.length < 2) {
            window.alert("Please select at least 2 users for a group");
            return;
        }
        try {
            const payload = {
                name: groupName.trim(),
                users: JSON.stringify(selectedUsers.map((u) => u._id)),
            };
            const { data } = await axios.post("/api/chat/group", payload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });
            setChats((prev) => [data, ...prev]);
            setSelectedChat(data);
            // reset group creator
            setIsGroupMode(false);
            setGroupName("");
            setSelectedUsers([]);
            setMemberSearch("");
            setMemberSuggestions([]);
        } catch (e) {
            window.alert("Failed to create group. Please try again.");
        }
    };

    const updateChatInList = (updated) => {
        setChats(prev => prev.map(c => (c._id === updated._id ? updated : c)));
        setSelectedChat(updated);
    };

    const addMemberToGroup = async (userId) => {
        if (!selectedChat?.isGroupChat) return;
        try {
            const { data } = await axios.put('/api/chat/groupadd', { chatId: selectedChat._id, userId }, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            });
            updateChatInList(data);
            // Clear search after successful addition
            setMemberSearch2("");
            setMemberSuggestions2([]);
        } catch (e) {}
    };

    const removeMemberFromGroup = async (userId) => {
        if (!selectedChat?.isGroupChat) return;
        try {
            const { data } = await axios.put('/api/chat/groupremove', { chatId: selectedChat._id, userId }, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            });
            updateChatInList(data);
        } catch (e) {}
    };

    const leaveGroup = async () => {
        if (!selectedChat?.isGroupChat) return;
        
        // Check if current user is admin
        if (selectedChat.groupAdmin && selectedChat.groupAdmin._id === currentUserId) {
            alert("Group admin cannot leave the group");
            return;
        }
        
        const confirmed = window.confirm("Are you sure you want to leave this group?");
        if (!confirmed) return;
        
        try {
            const { data } = await axios.put('/api/chat/leavegroup', { chatId: selectedChat._id }, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            });
            
            // Remove the chat from the chats list
            setChats(prev => prev.filter(c => c._id !== selectedChat._id));
            setSelectedChat(null);
        } catch (e) {
            console.error('Error leaving group:', e);
            alert('Failed to leave group. Please try again.');
        }
    };

    if (!selectedChat) {
        return (
            <div style={{ 
                flex: 1, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.06)', 
                backdropFilter: 'blur(8px)', 
                border: '1px solid #334155', 
                borderRadius: 12,
                color: '#6b7280',
                fontSize: 16
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
                    <div>Select a chat to start messaging</div>
                </div>
            </div>
        );
    }

    return (
        <div 
            onClick={(e) => {
                // Close keyboard if clicking outside input area
                if (e.target !== inputRef.current && !e.target.closest('.mobile-input-fix')) {
                    setKeyboardOpen(false);
                    inputRef.current?.blur();
                }
            }}
            style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column", background: "#1a1a1a", overflow: "hidden" }}
        >
            {/* Chat Header */}
            <div style={{ 
                padding: '2px 16px', 
                borderBottom: '2px solid #3a3a3a',
                border: '1px solid #3a3a3a', 
                background: '#2a2a2a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                        onClick={selectedChat.isGroupChat && isGroupAdmin ? () => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/jpeg,image/png';
                            input.onchange = async (e) => {
                                const file = e.target.files[0];
                                if (file) {
                                    try {
                                        const url = await uploadToCloudinary(file);
                                        persistChatPhotos({ ...chatPhotos, [selectedChat._id]: url });
                                    } catch (error) {
                                        alert(`Upload failed: ${error.message}`);
                                    }
                                }
                            };
                            input.click();
                        } : undefined}
                        title={selectedChat.isGroupChat && isGroupAdmin ? 'Click to change group photo' : undefined}
                        style={{
                            width: 40, 
                            height: 40, 
                            borderRadius: '50%', 
                            overflow: 'hidden', 
                            background: '#4a4a4a', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            cursor: selectedChat.isGroupChat && isGroupAdmin ? 'pointer' : 'default',
                            position: 'relative'
                        }}>
                        {(() => {
                            const avatar = getChatAvatar(selectedChat);
                            return avatar.pic && avatar.pic !== "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg" ? (
                                <img 
                                    src={avatar.pic} 
                                    alt="avatar" 
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            ) : (
                                <span style={{ color: 'white', fontWeight: 600, fontSize: 16 }}>
                                    {avatar.name.slice(0,1).toUpperCase()}
                                </span>
                            );
                        })()}
                    </div>
                    <div>
                        <div style={{ 
                            fontWeight: 600, 
                            color: '#ffffff', 
                            fontSize: 18,
                            marginBottom: 4
                        }}>
                            {selectedChat.isGroupChat ? selectedChat.chatName : getOtherUser()?.name || 'Unknown User'}
                        </div>
                        <div style={{ 
                            fontSize: 14, 
                            color: '#888888',
                            fontWeight: 500
                        }}>
                            {selectedChat.isGroupChat 
                                ? `👥 ${selectedChat.users?.length || 0} members`
                                : `📧 ${getOtherUser()?.email || ''}`
                            }
                        </div>
                    </div>
                </div>
                {selectedChat.isGroupChat && (
                    <button
                        onClick={() => setManageMembersOpen(true)}
                        style={{
                            padding: '8px 16px',
                            borderRadius: 20,
                            border: '1px solid #555',
                            background: '#3a3a3a',
                            color: '#fff',
                            fontWeight: 500,
                            fontSize: 14,
                            cursor: 'pointer'
                        }}>
                        Manage
                    </button>
                )}
            </div>

            {/* Messages */}
            {messages.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888888' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
                        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8, color: '#f8fafc' }}>No messages yet</div>
                        <div style={{ fontSize: 14, opacity: 0.8 }}>Start the conversation!</div>
                    </div>
                </div>
            ) : (
                <div 
                    ref={messagesContainerRef}
                    onScroll={handleScroll}
                    className="messages-container-mobile"
                    style={{ flex: 1, overflowY: 'auto', padding: '12px', paddingBottom: '90px', display: 'flex', flexDirection: 'column', gap: 8, background: '#1a1a1a' }}>
                    {messages.map((message, index) => {
                        const isOwn = isOwnMessage(message);
                        const prevMessage = messages[index - 1];
                        const nextMessage = messages[index + 1];
                        
                        // Check if we should show timestamp 
                        // Show on: first message, after 5+ min gap, or last message in a group (next message is 5+ min away or doesn't exist)
                        const shouldShowTime = !prevMessage || 
                            (new Date(message.createdAt) - new Date(prevMessage.createdAt)) > 5 * 60 * 1000 ||
                            !nextMessage ||
                            (new Date(nextMessage.createdAt) - new Date(message.createdAt)) > 5 * 60 * 1000;
                        
                        // Check if this message is close to the previous one (within 5 minutes)
                        const isCloseToNext = nextMessage && 
                            (new Date(nextMessage.createdAt) - new Date(message.createdAt)) <= 5 * 60 * 1000;
                        
                        return (
                            <div key={message._id} style={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 8, marginBottom: isCloseToNext ? 1 : 8 }}>
                                {!isOwn && (
                                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#4a4a4a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 600 }}>
                                        {message.sender?.name?.slice(0,1).toUpperCase() || 'U'}
                                    </div>
                                )}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start', maxWidth: '65%' }}>
                                    <div style={{ 
                                        padding: '8px 12px', 
                                        borderRadius: 16, 
                                        background: isOwn ? '#007bff' : '#3a3a3a', 
                                        color: 'white',
                                        fontSize: 13,
                                        lineHeight: 1.3,
                                        wordBreak: 'break-word'
                                    }}>
                                        {message.content}
                                    </div>
                                    {shouldShowTime && (
                                        <div style={{ 
                                            fontSize: 10, 
                                            color: '#9ca3af', 
                                            marginTop: 2,
                                            opacity: 0.7
                                        }}>
                                            {new Date(message.createdAt).toLocaleTimeString([], { 
                                                hour: '2-digit', 
                                                minute: '2-digit',
                                                hour12: true 
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    
                    {/* Typing Indicator */}
                    {typingUsers.length > 0 && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '8px 12px',
                            marginTop: 8,
                            marginBottom: 100,
                            position: 'relative',
                            zIndex: 999
                        }}>
                            <div style={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                background: '#4a4a4a',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: 11,
                                fontWeight: 600
                            }}>
                                {typingUsers[0].name?.slice(0,1).toUpperCase() || 'U'}
                            </div>
                            <div style={{
                                background: '#3a3a3a',
                                borderRadius: 16,
                                padding: '8px 12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4
                            }}>
                                <div style={{
                                    display: 'flex',
                                    gap: 2
                                }}>
                                    <div style={{
                                        width: 6,
                                        height: 6,
                                        borderRadius: '50%',
                                        background: '#9ca3af',
                                        animation: 'typing-dot 1.4s infinite ease-in-out'
                                    }}></div>
                                    <div style={{
                                        width: 6,
                                        height: 6,
                                        borderRadius: '50%',
                                        background: '#9ca3af',
                                        animation: 'typing-dot 1.4s infinite ease-in-out 0.2s'
                                    }}></div>
                                    <div style={{
                                        width: 6,
                                        height: 6,
                                        borderRadius: '50%',
                                        background: '#9ca3af',
                                        animation: 'typing-dot 1.4s infinite ease-in-out 0.4s'
                                    }}></div>
                                </div>
                                <span style={{
                                    color: '#9ca3af',
                                    fontSize: 12,
                                    marginLeft: 4
                                }}>
                                    {typingUsers.length === 1 
                                        ? `${typingUsers[0].name} is typing...`
                                        : `${typingUsers.length} people are typing...`
                                    }
                                </span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            )}

            {/* New Message Notification Button */}
            {showNewMessageButton && (
                <div style={{
                    position: 'absolute',
                    bottom: '80px',
                    right: '20px',
                    zIndex: 10
                }}>
                    <button
                        onClick={() => {
                            scrollToBottom();
                            setShowNewMessageButton(false);
                        }}
                        style={{
                            background: '#4f46e5',
                            color: 'white',
                            border: 'none',
                            borderRadius: '20px',
                            padding: '8px 16px',
                            fontSize: '12px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.background = '#4338ca';
                            e.target.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = '#4f46e5';
                            e.target.style.transform = 'translateY(0)';
                        }}
                    >
                        New message ↓
                    </button>
                </div>
            )}

            {/* Scroll to Bottom Button */}
            {showScrollToBottomButton && !showNewMessageButton && (
                <div style={{
                    position: 'absolute',
                    bottom: '80px',
                    right: '20px',
                    zIndex: 10
                }}>
                    <button
                        onClick={() => {
                            scrollToBottom();
                        }}
                        style={{
                            background: '#374151',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '40px',
                            height: '40px',
                            fontSize: '16px',
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.background = '#4b5563';
                            e.target.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = '#374151';
                            e.target.style.transform = 'translateY(0)';
                        }}
                    >
                        ↓
                    </button>
                </div>
            )}

            {/* Message Input */}
            <div className="mobile-input-fix" style={{ 
                padding: '12px 16px', 
                borderTop: '2px solid #3a3a3a',
                border: '1px solid #3a3a3a',
                background: '#2a2a2a',
                minHeight: '70px',
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 1000,
                width: '100%',
                boxSizing: 'border-box'
            }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <textarea
                            ref={inputRef}
                            value={newMessage}
                            onChange={(e) => {
                                setNewMessage(e.target.value);
                                if (e.target.value.trim()) {
                                    handleTyping();
                                }
                            }}
                            onKeyDown={handleKeyDown}
                            onFocus={() => setKeyboardOpen(true)}
                            onBlur={(e) => {
                                // Only allow blur if keyboard should close (clicked outside)
                                if (!keyboardOpen) {
                                    return;
                                }
                                e.preventDefault();
                                e.target.focus();
                            }}
                            placeholder="Type a message..."
                            style={{
                                width: '100%',
                                minHeight: 20,
                                maxHeight: 40,
                                padding: '4px 8px',
                                borderRadius: 20,
                                border: 'none',
                                outline: 'none',
                                background: '#3a3a3a',
                                color: '#ffffff',
                                fontSize: 13,
                                fontWeight: 400,
                                lineHeight: 1.2,
                                resize: 'none',
                                fontFamily: 'inherit',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            sendMessage();
                        }}
                        disabled={!newMessage.trim() || sending}
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            border: 'none',
                            background: sending 
                                ? '#555' 
                                : newMessage.trim() 
                                    ? '#007bff' 
                                    : '#555',
                            color: '#fff',
                            cursor: sending || !newMessage.trim() ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 16
                        }}>
                        {sending ? (
                            <div style={{ 
                                width: 16, 
                                height: 16, 
                                border: '2px solid rgba(255, 255, 255, 0.3)', 
                                borderTop: '2px solid #fff', 
                                borderRadius: '50%', 
                                animation: 'spin 1s linear infinite'
                            }}></div>
                        ) : (
                            '→'
                        )}
                    </button>
                </div>
            </div>

            {/* Manage Members Modal */}
            {manageMembersOpen && selectedChat?.isGroupChat && (
                <div onMouseDown={() => setManageMembersOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div onMouseDown={(e) => e.stopPropagation()} style={{ width: 520, maxWidth: "90%", background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                            <div style={{ fontWeight: 700, color: "#f3f4f6" }}>Manage Members</div>
                            <button onClick={() => {
                                setManageMembersOpen(false);
                                setMemberSearch2("");
                                setMemberSuggestions2([]);
                            }} style={{ border: "1px solid #374151", background: "#0f172a", color: "#e5e7eb", borderRadius: 8, padding: "6px 10px" }}>Close</button>
                        </div>
                        <div style={{ marginBottom: 8, color: "#9ca3af" }}>Current Members</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                            {(selectedChat.users || []).map(u => (
                                <span key={u._id} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 8px", background: "#0b1220", border: "1px solid #374151", color: "#c7d2fe", borderRadius: 999 }}>
                                    {u.name}
                                    <button onClick={() => removeMemberFromGroup(u._id)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9ca3af" }}>×</button>
                                </span>
                            ))}
                        </div>
                        <input
                            value={memberSearch2}
                            onChange={(e) => {
                                const val = e.target.value; setMemberSearch2(val);
                                if (!val.trim()) { setMemberSuggestions2([]); return; }
                                const directUsers = (chats || []).filter(c => !c.isGroupChat).flatMap(c => (c.users || [])).filter(u => u._id !== currentUserId);
                                const currentMemberIds = new Set((selectedChat.users || []).map(u => u._id));
                                const seen = new Map(); const suggestions = [];
                                for (const u of directUsers) {
                                    if (!seen.has(u._id) && !currentMemberIds.has(u._id) && (u.name||'').toLowerCase().includes(val.toLowerCase())) { 
                                        seen.set(u._id, true); 
                                        suggestions.push(u); 
                                    }
                                }
                                setMemberSuggestions2(suggestions.slice(0,8));
                            }}
                            placeholder="Add people from your DMs"
                            style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #374151", outline: "none", background: "#0f172a", color: "#e5e7eb", width: "100%" }}
                        />
                        {memberSuggestions2.length > 0 && (
                            <div style={{ marginTop: 8, maxHeight: 200, overflowY: "auto", border: "1px solid #1f2937", borderRadius: 8 }}>
                                {memberSuggestions2.map(u => (
                                    <div key={u._id} onClick={() => addMemberToGroup(u._id)} style={{ padding: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                                        <div style={{ width: 24, height: 24, borderRadius: "50%", overflow: "hidden", background: "#0b1220", border: "1px solid #1f2937", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                            {u.pic ? (<img src={u.pic} alt="u" style={{ width: "100%", height: "100%", objectFit: "cover" }} />) : (<span style={{ fontSize: 11, color: "#e5e7eb" }}>{(u.name||'U').slice(0,1).toUpperCase()}</span>)}
                                        </div>
                                        <div style={{ color: "#e5e7eb", fontSize: 13 }}>{u.name}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {/* Leave Group Button */}
                        <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #1f2937" }}>
                            <button 
                                onClick={leaveGroup}
                                disabled={selectedChat?.groupAdmin && selectedChat.groupAdmin._id === currentUserId}
                                style={{ 
                                    width: "100%", 
                                    padding: "8px 12px", 
                                    borderRadius: 8, 
                                    border: "1px solid #dc2626", 
                                    background: selectedChat?.groupAdmin && selectedChat.groupAdmin._id === currentUserId ? "#374151" : "#dc2626", 
                                    color: selectedChat?.groupAdmin && selectedChat.groupAdmin._id === currentUserId ? "#9ca3af" : "#fff", 
                                    cursor: selectedChat?.groupAdmin && selectedChat.groupAdmin._id === currentUserId ? "not-allowed" : "pointer",
                                    fontSize: 14,
                                    fontWeight: 500
                                }}
                            >
                                {selectedChat?.groupAdmin && selectedChat.groupAdmin._id === currentUserId ? "Admin cannot leave group" : "Leave Group"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Group Modal */}
            {isGroupMode && (
                <div onMouseDown={() => setIsGroupMode(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div onMouseDown={(e) => e.stopPropagation()} style={{ width: 520, maxWidth: "90%", background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: 16, boxShadow: "0 18px 50px rgba(0,0,0,0.45)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                            <div style={{ fontWeight: 700, color: "#f3f4f6" }}>Create Group</div>
                            <button onClick={() => setIsGroupMode(false)} style={{ border: "1px solid #374151", background: "#0f172a", color: "#e5e7eb", borderRadius: 8, padding: "6px 10px" }}>Close</button>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, position: "relative" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{ width: 48, height: 48, borderRadius: "50%", overflow: "hidden", background: "#0b1220", border: "1px solid #1f2937", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <img src="https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg" alt="group" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                </div>
                                <div style={{ color: "#9ca3af", fontSize: 12 }}>Group photo (coming soon)</div>
                            </div>
                            <input
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                placeholder="Group name"
                                style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #374151", outline: "none", background: "#0f172a", color: "#e5e7eb" }}
                            />
                            <input
                                value={memberSearch}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setMemberSearch(val);
                                    if (!val.trim()) { setMemberSuggestions([]); return; }
                                    const directUsers = (chats || []).filter(c => !c.isGroupChat).flatMap(c => (c.users || [])).filter(u => u._id !== currentUserId);
                                    const seen = new Map();
                                    const suggestions = [];
                                    for (const u of directUsers) {
                                        if (!seen.has(u._id) && (u.name||'').toLowerCase().includes(val.toLowerCase())) {
                                            seen.set(u._id, true);
                                            suggestions.push(u);
                                        }
                                    }
                                    setMemberSuggestions(suggestions.slice(0,8));
                                }}
                                placeholder="Search people from your DMs"
                                style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #374151", outline: "none", background: "#0f172a", color: "#e5e7eb" }}
                            />
                            {memberSuggestions.length > 0 && (
                                <div style={{ position: "absolute", left: 0, top: 92, width: "100%", background: "#0f172a", border: "1px solid #1f2937", borderRadius: 8, maxHeight: 200, overflowY: "auto" }}>
                                    {memberSuggestions.map(u => (
                                        <div key={u._id} onClick={() => { if (!selectedUsers.find(x=>x._id===u._id)) setSelectedUsers(prev=>[...prev, u]); setMemberSearch(""); setMemberSuggestions([]); }} style={{ padding: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                                            <div style={{ width: 24, height: 24, borderRadius: "50%", overflow: "hidden", background: "#0b1220", border: "1px solid #1f2937", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                {u.pic ? (<img src={u.pic} alt="u" style={{ width: "100%", height: "100%", objectFit: "cover" }} />) : (<span style={{ fontSize: 11, color: "#e5e7eb" }}>{(u.name||'U').slice(0,1).toUpperCase()}</span>)}
                                            </div>
                                            <div style={{ color: "#e5e7eb", fontSize: 13 }}>{u.name}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {selectedUsers.length > 0 && (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                    {selectedUsers.map((u) => (
                                        <span key={u._id} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 8px", background: "#0b1220", border: "1px solid #1d4ed8", color: "#c7d2fe", borderRadius: 999 }}>
                                            {u.name}
                                            <button onClick={() => toggleUserSelect(u)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9ca3af" }}>×</button>
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                                <button onClick={() => setIsGroupMode(false)} style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #374151", background: "#0f172a", color: "#e5e7eb", cursor: "pointer" }}>Cancel</button>
                                <button onClick={handleCreateGroup} style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #10b981", background: "#10b981", color: "#fff", cursor: "pointer" }}>Create Group</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CSS for animations */}
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes typing-dot {
                    0%, 60%, 100% {
                        transform: translateY(0);
                        opacity: 0.4;
                    }
                    30% {
                        transform: translateY(-10px);
                        opacity: 1;
                    }
                }
            `}</style>
        </div>
    );
};

export default SingleChat;
