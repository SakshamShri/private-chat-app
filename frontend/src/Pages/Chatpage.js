import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import SingleChat from "../components/singlechat";

const Chatpage = () => {
    const [chats, setChats] = useState([]);
    const [search, setSearch] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [groupResults, setGroupResults] = useState([]);
    const [showSearchPanel, setShowSearchPanel] = useState(false);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [photoPreview, setPhotoPreview] = useState({ open: false, url: "", title: "", subtitle: "" });
    const [selectedChat, setSelectedChat] = useState(null);
    const [chatFilter, setChatFilter] = useState("all"); // all | direct | groups
    const [lastMessages, setLastMessages] = useState({}); // Store last message for each chat
    const [sidebarWidth, setSidebarWidth] = useState(320);
    const [isResizing, setIsResizing] = useState(false);
    const [isGroupMode, setIsGroupMode] = useState(false);
    const [groupName, setGroupName] = useState("");
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [memberSearch, setMemberSearch] = useState("");
    const [memberSuggestions, setMemberSuggestions] = useState([]);
    const [isMobile, setIsMobile] = useState(false);
    const [showChatList, setShowChatList] = useState(true);
    const navigate = useNavigate();

    // Check for mobile screen size
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Handle chat selection for mobile
    const handleChatSelect = (chat) => {
        setSelectedChat(chat);
        if (isMobile) {
            setShowChatList(false);
        }
    };

    // Handle back to chat list on mobile
    const handleBackToChatList = () => {
        if (isMobile) {
            setShowChatList(true);
            setSelectedChat(null);
        }
    };

    // Handle browser back button
    useEffect(() => {
        const handlePopState = (event) => {
            event.preventDefault();
            if (selectedChat && isMobile) {
                // If in chat view on mobile, go back to chat list
                handleBackToChatList();
                // Push state back to prevent actual navigation
                window.history.pushState(null, '', window.location.pathname);
            }
        };

        // Push initial state
        window.history.pushState(null, '', window.location.pathname);
        
        window.addEventListener('popstate', handlePopState);
        
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [selectedChat, isMobile]);

    const { token, currentUserId, currentUserPic, currentUserName, currentUserEmail } = useMemo(() => {
        try {
            const info = JSON.parse(localStorage.getItem("userInfo"));
            return {
                token: info?.token || "",
                currentUserId: info?._id || info?.id || "",
                currentUserPic: info?.pic || "",
                currentUserName: info?.name || "",
                currentUserEmail: info?.email || "",
            };
        } catch {
            return { token: "", currentUserId: "", currentUserPic: "", currentUserName: "", currentUserEmail: "" };
        }
    }, []);

    const [userPic, setUserPic] = useState(() => {
        try {
            const key = currentUserId ? `userPic:${currentUserId}` : null;
            if (key) {
                const stored = localStorage.getItem(key);
                if (stored) return stored;
            }
        } catch {}
        return currentUserPic;
    });
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

    useEffect(() => {
        const fetchChats = async () => {
            if (!token) {
                navigate('/');
                return;
            }
            try {
                const { data } = await axios.get("/api/chat", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setChats(data || []);
                
                // Fetch last message for each chat
                if (data && data.length > 0) {
                    const lastMessagesData = {};
                    for (const chat of data) {
                        try {
                            const messageResponse = await axios.get(`/api/message/${chat._id}`, {
                                headers: { Authorization: `Bearer ${token}` }
                            });
                            const messages = messageResponse.data || [];
                            if (messages.length > 0) {
                                lastMessagesData[chat._id] = messages[messages.length - 1];
                            }
                        } catch (e) {
                            // Silent fail for individual chat messages
                        }
                    }
                    setLastMessages(lastMessagesData);
                }
            } catch (e) {
                // silent
            }
        };
        fetchChats();
    }, [token, navigate]);

    const handleSearch = async () => {
        if (!search?.trim()) return;
        if (!token) { navigate('/'); return; }
        setLoadingSearch(true);
        try {
            const { data } = await axios.get(`/api/user?search=${encodeURIComponent(search)}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setSearchResults(data || []);
            // Also search groups locally by group name
            const groups = (chats || []).filter((c) => c.isGroupChat && (c.chatName || "").toLowerCase().includes(search.toLowerCase()));
            setGroupResults(groups);
            setShowSearchPanel(true);
            setHighlightedIndex(0);
        } catch (e) {
            setSearchResults([]);
            setGroupResults([]);
            window.alert('Search failed. Please ensure you are logged in.');
        } finally {
            setLoadingSearch(false);
        }
    };

    // Debounced suggestions when typing
    useEffect(() => {
        if (!search.trim()) { setShowSearchPanel(false); setHighlightedIndex(-1); return; }
        const t = setTimeout(() => { handleSearch(); }, 250);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    // Flatten results for keyboard navigation
    const flatResults = useMemo(() => {
        const directChats = (chats || []).filter(c => !c.isGroupChat && (
            (c.users||[]).some(u => (u.name||'').toLowerCase().includes(search.toLowerCase())) ||
            ((c.users||[]).length===2 && (((c.users||[]).find(u=>u._id!==currentUserId)?.name)||'').toLowerCase().includes(search.toLowerCase()))
        )).map(c => ({ kind: 'chat', id: c._id, data: c }));
        const groups = (groupResults || []).map(g => ({ kind: 'group', id: g._id, data: g }));
        const users = (searchResults || []).map(u => ({ kind: 'user', id: u._id, data: u }));
        return [...directChats, ...groups, ...users];
    }, [chats, groupResults, searchResults, search, currentUserId]);

    const directMatchesCount = useMemo(() => (
        (chats || []).filter(c => !c.isGroupChat && (
            (c.users||[]).some(u => (u.name||'').toLowerCase().includes(search.toLowerCase())) ||
            ((c.users||[]).length===2 && (((c.users||[]).find(u=>u._id!==currentUserId)?.name)||'').toLowerCase().includes(search.toLowerCase()))
        )).length
    ), [chats, search, currentUserId]);

    const openOrCreateDirectChat = async (userId) => {
        try {
            // Try to find an existing direct chat with this user
            const existing = (chats || []).find(c => !c.isGroupChat && (c.users || []).some(u => u._id === userId));
            if (existing) {
                setSelectedChat(existing);
                setShowSearchPanel(false);
                return;
            }
            // Otherwise, create/access via API
            const { data } = await axios.post('/api/chat', { userId }, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            // Prepend if not present
            setChats(prev => {
                if (prev.find(c => c._id === data._id)) return prev;
                return [data, ...prev];
            });
            setSelectedChat(data);
            setShowSearchPanel(false);
        } catch (e) {
            // ignore
        }
    };







    const handleLogout = () => {
        const confirmed = window.confirm("Are you sure you want to logout?");
        if (!confirmed) return;
        try {
            // Preserve chatPhotos and userPic across logout
            const preservedChatPhotos = localStorage.getItem('chatPhotos');
            const preservedUserPic = localStorage.getItem('userPic');
            localStorage.removeItem("userInfo");
            if (preservedChatPhotos !== null) localStorage.setItem('chatPhotos', preservedChatPhotos);
            if (preservedUserPic !== null) localStorage.setItem('userPic', preservedUserPic);
        } catch {}
        navigate("/");
    };

    const getChatTitle = (chat) => {
        if (chat.isGroupChat) return chat.chatName;
        const others = (chat.users || []).filter((u) => u._id !== currentUserId);
        return others[0]?.name || "Direct Message";
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

    const getLastMessageText = (chat) => {
        const lastMessage = lastMessages[chat._id];
        if (!lastMessage) return "No messages yet";
        
        const isOwnMessage = lastMessage.sender && lastMessage.sender._id === currentUserId;
        const messageText = lastMessage.content || "";
        
        if (isOwnMessage) {
            return `You: ${messageText}`;
        } else {
            if (chat.isGroupChat) {
                return `${lastMessage.sender?.name || 'Unknown'}: ${messageText}`;
            } else {
                return messageText;
            }
        }
    };

    const handleMessageSent = (newMessage) => {
        if (newMessage && newMessage.chat) {
            const chatId = newMessage.chat._id;
            
            // Update last message for the chat
            setLastMessages(prev => ({
                ...prev,
                [chatId]: newMessage
            }));
            
            // Move chat with new message to top of list
            setChats(prevChats => {
                const chatIndex = prevChats.findIndex(c => c._id === chatId);
                if (chatIndex > 0) {
                    const updatedChats = [...prevChats];
                    const [movedChat] = updatedChats.splice(chatIndex, 1);
                    return [movedChat, ...updatedChats];
                }
                return prevChats;
            });
        }
    };

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

    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const profileRef = useRef(null);

    const searchRef = useRef(null);

    useEffect(() => {
        const handleOutside = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target)) {
                setShowProfileMenu(false);
            }
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setShowSearchPanel(false);
            }
        };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, []);

    // Resize functionality
    const handleMouseDown = (e) => {
        setIsResizing(true);
        e.preventDefault();
    };

    const handleMouseMove = (e) => {
        if (!isResizing) return;
        
        const newWidth = e.clientX;
        const minWidth = 250;
        const maxWidth = 500;
        
        if (newWidth >= minWidth && newWidth <= maxWidth) {
            setSidebarWidth(newWidth);
        }
    };

    const handleMouseUp = () => {
        setIsResizing(false);
    };

    // Add event listeners for resize
    useEffect(() => {
        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        } else {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isResizing]);

    return (
        <div style={{ position: "relative", overflow: "hidden", width: "100%", height: "100vh", display: "flex", flexDirection: "column", gap: 0, padding: 0, boxSizing: "border-box", background: "#1a1a1a", color: "#ffffff", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
                
                @keyframes floatSlow { 0% { transform: translateY(0px) translateX(0px) rotate(0deg); } 33% { transform: translateY(-15px) translateX(10px) rotate(1deg); } 66% { transform: translateY(-5px) translateX(-8px) rotate(-1deg); } 100% { transform: translateY(0px) translateX(0px) rotate(0deg); } }
                @keyframes glowPulse { 0%, 100% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.3), 0 0 40px rgba(139, 92, 246, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1); } 50% { box-shadow: 0 0 30px rgba(139, 92, 246, 0.4), 0 0 60px rgba(139, 92, 246, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2); } }
                @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
                @keyframes slideInUp { 0% { transform: translateY(20px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
                @keyframes fadeInScale { 0% { transform: scale(0.95); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
                @keyframes ripple { 0% { transform: scale(0); opacity: 1; } 100% { transform: scale(4); opacity: 0; } }
                @keyframes fadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }
                
                /* Mobile Responsive Styles */
                @media (max-width: 768px) {
                    .mobile-hidden { display: none !important; }
                    .mobile-full-width { width: 100% !important; }
                    .mobile-stack { flex-direction: column !important; }
                    .mobile-no-gap { gap: 0 !important; }
                    .mobile-padding { padding: 12px !important; }
                    .mobile-small-text { font-size: 12px !important; }
                    .mobile-compact { padding: 8px 12px !important; }
                }
                
                @media (max-width: 480px) {
                    .mobile-xs-hidden { display: none !important; }
                    .mobile-xs-padding { padding: 8px !important; }
                    .mobile-xs-text { font-size: 11px !important; }
                }
                
                * { box-sizing: border-box; }
                body { margin: 0; padding: 0; overflow: hidden; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
                #root { height: 100vh; overflow: hidden; }
                
                /* Mobile viewport fix */
                @media (max-width: 768px) {
                    body { height: 100vh; height: -webkit-fill-available; }
                    #root { height: 100vh; height: -webkit-fill-available; }
                    
                    /* Ensure mobile input is always visible */
                    .mobile-input-fix {
                        position: fixed !important;
                        bottom: 0 !important;
                        left: 0 !important;
                        right: 0 !important;
                        z-index: 9999 !important;
                        background: #2a2a2a !important;
                        border-top: 2px solid #3a3a3a !important;
                        padding: 12px 16px !important;
                        min-height: 70px !important;
                        box-sizing: border-box !important;
                    }
                    
                    /* Increase message container bottom padding on mobile when keyboard might be open */
                    @media (max-width: 768px) {
                        .messages-container-mobile {
                            padding-bottom: 160px !important;
                        }
                    }
                }
                
                .glass-morphism {
                    background: #2a2a2a;
                    border: 1px solid #3a3a3a;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                }
                
                .hover-lift {
                    transition: background-color 0.2s ease;
                }
                
                .hover-lift:hover {
                    background-color: rgba(255, 255, 255, 0.05) !important;
                }
                
                .premium-button:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
                }
                .premium-button:active {
                    transform: translateY(0);
                }
            `}</style>
            
            {/* Header */}
            <div style={{ padding: "12px 20px", background: "#2a2a2a", borderBottom: "1px solid #3a3a3a", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    {/* Mobile back button */}
                    {isMobile && !showChatList && (
                        <button
                            onClick={handleBackToChatList}
                            style={{
                                background: "transparent",
                                border: "none",
                                color: "#ffffff",
                                fontSize: 18,
                                cursor: "pointer",
                                padding: "4px 8px",
                                borderRadius: 4,
                                display: "flex",
                                alignItems: "center",
                                gap: 8
                            }}
                        >
                            ← Back
                        </button>
                    )}
                    <div style={{ fontWeight: 700, fontSize: 20, color: "#ffffff" }}>
                        {isMobile && !showChatList && selectedChat 
                            ? (selectedChat.isGroupChat ? selectedChat.chatName : getChatTitle(selectedChat))
                            : "Messages"
                        }
                    </div>
                    {(!isMobile || showChatList) && (
                        <div style={{ position: "relative", flex: isMobile ? 1 : "none", maxWidth: isMobile ? "none" : 250 }}>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onFocus={() => setShowSearchPanel(!!search.trim())}
                                placeholder="Search users and chats..."
                                style={{ 
                                    width: "100%", 
                                    minWidth: isMobile ? "120px" : "200px",
                                    maxWidth: isMobile ? "100%" : "250px",
                                    padding: isMobile ? "6px 10px" : "8px 12px", 
                                    borderRadius: 20, 
                                    border: "none", 
                                    outline: "none", 
                                    background: "#3a3a3a", 
                                    color: "#ffffff", 
                                    fontSize: isMobile ? 12 : 14 
                                }}
                            />
                        </div>
                    )}
                </div>

                <div style={{ position: "relative" }}>
                    <div 
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                        style={{ 
                            width: 40, 
                            height: 40, 
                            borderRadius: "50%", 
                            overflow: "hidden", 
                            background: "#4a4a4a", 
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "center", 
                            cursor: "pointer",
                            border: "2px solid transparent",
                            transition: "border-color 0.2s ease"
                        }}
                        onMouseEnter={(e) => e.target.style.borderColor = "#4f46e5"}
                        onMouseLeave={(e) => e.target.style.borderColor = "transparent"}
                    >
                        {currentUserPic && currentUserPic !== "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg" ? (
                            <img src={currentUserPic} alt="profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                            <span style={{ fontWeight: 600, color: "#ffffff", fontSize: 14 }}>{(currentUserName || "U").slice(0,1).toUpperCase()}</span>
                        )}
                    </div>
                    
                    {/* Profile Menu Dropdown */}
                    {showProfileMenu && (
                        <div style={{
                            position: "absolute",
                            top: 45,
                            right: 0,
                            width: 200,
                            background: "#2a2a2a",
                            border: "1px solid #3a3a3a",
                            borderRadius: 8,
                            boxShadow: "0 8px 20px rgba(0, 0, 0, 0.4)",
                            zIndex: 1000,
                            overflow: "hidden"
                        }}>
                            {/* Profile Info */}
                            <div style={{ padding: "12px 16px", borderBottom: "1px solid #3a3a3a" }}>
                                <div style={{ fontWeight: 600, color: "#ffffff", fontSize: 14, marginBottom: 2 }}>
                                    {currentUserName}
                                </div>
                                <div style={{ fontSize: 12, color: "#9ca3af" }}>
                                    {currentUserEmail}
                                </div>
                            </div>
                            
                            {/* Menu Options */}
                            <div style={{ padding: "8px 0" }}>
                                <div 
                                    onClick={() => {
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.accept = 'image/*';
                                        input.onchange = async (e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                try {
                                                    const uploadedUrl = await uploadToCloudinary(file);
                                                    if (uploadedUrl) {
                                                        console.log('Cloudinary URL:', uploadedUrl);
                                                        // Update user pic via backend API
                                                        const response = await axios.put('/api/user/pic', 
                                                            { pic: uploadedUrl },
                                                            { 
                                                                headers: { 
                                                                    Authorization: `Bearer ${token}`,
                                                                    'Content-Type': 'application/json'
                                                                } 
                                                            }
                                                        );
                                                        
                                                        console.log('Backend response:', response.data);
                                                        
                                                        if (response.data && response.data.pic) {
                                                            const newPicUrl = response.data.pic;
                                                            setUserPic(newPicUrl);
                                                            localStorage.setItem('userPic', newPicUrl);
                                                            // Update user info in localStorage with the response data
                                                            localStorage.setItem('userInfo', JSON.stringify(response.data));
                                                        }
                                                    }
                                                } catch (error) {
                                                    console.error('Upload or update failed:', error);
                                                    if (error.response) {
                                                        console.error('Error response:', error.response.data);
                                                    }
                                                }
                                            }
                                        };
                                        input.click();
                                        setShowProfileMenu(false);
                                    }}
                                    style={{
                                        padding: "10px 16px",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 10,
                                        color: "#e5e7eb",
                                        fontSize: 13,
                                        transition: "background 0.2s ease"
                                    }}
                                    onMouseEnter={(e) => e.target.style.background = "#3a3a3a"}
                                    onMouseLeave={(e) => e.target.style.background = "transparent"}
                                >
                                    <span style={{ fontSize: 16 }}>📷</span>
                                    Change Photo
                                </div>
                                
                                <div 
                                    onClick={() => {
                                        localStorage.removeItem("userInfo");
                                        navigate("/");
                                        setShowProfileMenu(false);
                                    }}
                                    style={{
                                        padding: "10px 16px",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 10,
                                        color: "#ef4444",
                                        fontSize: 13,
                                        transition: "background 0.2s ease"
                                    }}
                                    onMouseEnter={(e) => e.target.style.background = "#3a3a3a"}
                                    onMouseLeave={(e) => e.target.style.background = "transparent"}
                                >
                                    <span style={{ fontSize: 16 }}>🚪</span>
                                    Logout
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
                        

            {/* Search Dropdown */}
            {showSearchPanel && (
                <div ref={searchRef} style={{ 
                    position: "absolute", 
                    top: 70, 
                    left: isMobile ? 10 : 20, 
                    right: isMobile ? 10 : "auto",
                    width: isMobile ? "auto" : 400, 
                    maxWidth: isMobile ? "calc(100vw - 20px)" : 400,
                    maxHeight: isMobile ? "60vh" : 500, 
                    background: "#2a2a2a",
                    border: "1px solid #3a3a3a", 
                    borderRadius: 12, 
                    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.5)",
                    zIndex: 1000,
                    overflow: "hidden",
                    animation: "slideInUp 0.2s ease-out"
                }}>
                    {/* Header */}
                    <div style={{ 
                        padding: isMobile ? "12px 16px 8px" : "16px 20px 12px", 
                        borderBottom: "1px solid #3a3a3a",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between"
                    }}>
                        <div>
                            <h4 style={{ 
                                margin: 0, 
                                color: "#ffffff", 
                                fontSize: 16, 
                                fontWeight: 600
                            }}>
                                Search Results
                            </h4>
                            <p style={{ 
                                margin: "4px 0 0 0", 
                                color: "#9ca3af", 
                                fontSize: 12 
                            }}>
                                "{search}"
                            </p>
                        </div>
                        <button
                            onClick={() => setShowSearchPanel(false)}
                            style={{
                                background: "transparent",
                                border: "none",
                                color: "#9ca3af",
                                cursor: "pointer",
                                fontSize: 16,
                                padding: "4px",
                                borderRadius: 4,
                                transition: "color 0.2s ease"
                            }}
                            onMouseEnter={(e) => e.target.style.color = "#ffffff"}
                            onMouseLeave={(e) => e.target.style.color = "#9ca3af"}
                        >
                            ✕
                        </button>
                    </div>
                    
                    {/* Content */}
                    <div style={{ 
                        maxHeight: 400, 
                        overflowY: "auto", 
                        padding: "12px 16px 16px"
                    }}>
                    {/* Direct chats that match search */}
                    {chats.filter(c => !c.isGroupChat && ( (c.users||[]).some(u => (u.name||'').toLowerCase().includes(search.toLowerCase())) || ( (c.users||[]).length===2 && ( (c.users||[]).find(u=>u._id!==currentUserId)?.name||'' ).toLowerCase().includes(search.toLowerCase()) ) )).length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 8, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase" }}>💬 Chats</div>
                            {chats.filter(c => !c.isGroupChat && ( (c.users||[]).some(u => (u.name||'').toLowerCase().includes(search.toLowerCase())) || ( (c.users||[]).length===2 && ( (c.users||[]).find(u=>u._id!==currentUserId)?.name||'' ).toLowerCase().includes(search.toLowerCase()) ) ))
                              .map((c, idx) => (
                                <div key={c._id} onMouseEnter={() => setHighlightedIndex(idx)} onClick={() => { handleChatSelect(c); setShowSearchPanel(false); }} className="hover-lift" style={{ padding: 10, border: "1px solid #3a3a3a", borderRadius: 8, cursor: "pointer", background: highlightedIndex===idx ? "#3a3a3a" : "transparent", transition: "all 0.2s ease", marginBottom: 4 }}>
                                    <div style={{ fontWeight: 600, color: "#ffffff", fontSize: 14 }}>{getChatTitle(c)}</div>
                                    <div style={{ fontSize: 12, color: "#9ca3af", opacity: 0.8 }}>{(c.users||[]).map(u=>u.name).join(', ')}</div>
                                </div>
                              ))}
                        </div>
                    )}
                    {groupResults.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 8, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase" }}>👥 Groups</div>
                            {groupResults.map((g, idx) => (
                                <div key={g._id} onMouseEnter={() => setHighlightedIndex(directMatchesCount + idx)} onClick={() => { handleChatSelect(g); setShowSearchPanel(false); }} className="hover-lift" style={{ padding: 10, border: "1px solid #3a3a3a", borderRadius: 8, cursor: "pointer", background: (highlightedIndex === directMatchesCount + idx) ? "#3a3a3a" : "transparent", transition: "all 0.2s ease", marginBottom: 4 }}>
                                    <div style={{ fontWeight: 600, color: "#ffffff", fontSize: 14 }}>{g.chatName}</div>
                                    <div style={{ fontSize: 12, color: "#9ca3af", opacity: 0.8 }}>{(g.users || []).map(u => u.name).join(", ")}</div>
                                </div>
                            ))}
                        </div>
                    )}
                    {searchResults.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                            <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 8, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase" }}>👤 Users</div>
                        </div>
                    )}
                    {searchResults.map((u, idx) => (
                        <div key={u._id} onMouseEnter={() => setHighlightedIndex(flatResults.length - searchResults.length + idx)} onClick={() => openOrCreateDirectChat(u._id)} className="hover-lift" style={{ padding: 10, border: "1px solid #3a3a3a", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: flatResults[highlightedIndex]?.id===u._id ? "#3a3a3a" : "transparent", cursor: "pointer", transition: "all 0.2s ease", marginBottom: 4 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 600, fontSize: 12 }}>
                                    {u.name?.[0]?.toUpperCase() || "U"}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, color: "#ffffff", fontSize: 14 }}>{u.name}</div>
                                    <div style={{ fontSize: 12, color: "#9ca3af", opacity: 0.8 }}>{u.email}</div>
                                </div>
                            </div>
                            <div style={{ padding: "4px 8px", borderRadius: 6, background: "#4f46e5", color: "#ffffff", fontSize: 11, fontWeight: 500 }}>Chat</div>
                        </div>
                    ))}
                    {(!loadingSearch && searchResults.length === 0 && search.trim()) && (
                        <div style={{ fontSize: 14, color: "#94a3b8", textAlign: "center", padding: 20, opacity: 0.7 }}>
                            <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                            <div>No users found</div>
                        </div>
                    )}
                    </div>
                </div>
            )}
            {photoPreview.open && (
                <div onMouseDown={() => setPhotoPreview({ open: false, url: "", title: "" })} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 90, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div onMouseDown={(e) => e.stopPropagation()} style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: 12, maxWidth: "90%", maxHeight: "90%" }}>
                        <div style={{ color: "#e5e7eb", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <div>{photoPreview.title}</div>
                                {photoPreview.subtitle ? (<div style={{ fontSize: 12, color: "#9ca3af" }}>{photoPreview.subtitle}</div>) : null}
                            </div>
                            <button onClick={() => setPhotoPreview({ open: false, url: "", title: "" })} style={{ border: "1px solid #374151", background: "#0f172a", color: "#e5e7eb", borderRadius: 8, padding: "6px 10px" }}>Close</button>
                        </div>
                        <img src={photoPreview.url} alt="preview" style={{ maxWidth: "80vw", maxHeight: "70vh", display: "block", borderRadius: 8 }} />
                    </div>
                </div>
            )}



            <div style={{ width: "100%", display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
            {/* Sidebar */}
            <div style={{ 
                width: isMobile ? (showChatList ? "100%" : "0") : sidebarWidth,
                background: "#2a2a2a", 
                borderRight: "1px solid #3a3a3a", 
                display: isMobile && !showChatList ? "none" : "flex", 
                flexDirection: "column", 
                overflow: "hidden", 
                position: "relative",
                minWidth: isMobile ? "100%" : 280,
                maxWidth: isMobile ? "100%" : 500,
                transition: isMobile ? "none" : "width 0.3s ease"
            }}>
                
                {/* New Group button and Filter buttons */}
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #3a3a3a" }}>
                    {/* New Group Button */}
                    <button
                        onClick={() => setIsGroupMode(true)}
                        style={{
                            width: "80%",
                            padding: "8px 14px",
                            borderRadius: 10,
                            border: "none",
                            background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #06b6d4 100%)",
                            color: "#ffffff",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                            boxShadow: "0 3px 12px rgba(79, 70, 229, 0.4), 0 1px 3px rgba(0, 0, 0, 0.1)",
                            position: "relative",
                            overflow: "hidden",
                            backdropFilter: "blur(10px)",
                            letterSpacing: "0.025em",
                            margin: "0 auto 12px auto"
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.transform = "translateY(-1px) scale(1.02)";
                            e.target.style.boxShadow = "0 6px 20px rgba(79, 70, 229, 0.5), 0 3px 10px rgba(0, 0, 0, 0.15)";
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = "translateY(0) scale(1)";
                            e.target.style.boxShadow = "0 3px 12px rgba(79, 70, 229, 0.4), 0 1px 3px rgba(0, 0, 0, 0.1)";
                        }}
                        onMouseDown={(e) => {
                            e.target.style.transform = "translateY(0) scale(0.98)";
                        }}
                        onMouseUp={(e) => {
                            e.target.style.transform = "translateY(-1px) scale(1.02)";
                        }}
                    >
                        <div style={{
                            position: "absolute",
                            inset: 0,
                            background: "linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)",
                            animation: "shimmer 3s infinite",
                            pointerEvents: "none"
                        }} />
                        <div style={{
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            background: "rgba(255, 255, 255, 0.2)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 10,
                            zIndex: 1
                        }}>
                            👥
                        </div>
                        <span style={{ zIndex: 1, fontWeight: 700 }}>Create New Group</span>
                    </button>
                    
                    <div style={{ display: "flex", gap: 8 }}>
                        {["all", "direct", "groups"].map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setChatFilter(filter)}
                                style={{
                                    padding: "6px 12px",
                                    borderRadius: 6,
                                    border: "1px solid #3a3a3a",
                                    background: chatFilter === filter ? "#4f46e5" : "transparent",
                                    color: chatFilter === filter ? "#ffffff" : "#9ca3af",
                                    fontSize: 12,
                                    fontWeight: 500,
                                    cursor: "pointer",
                                    transition: "all 0.2s ease",
                                    textTransform: "capitalize"
                                }}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
                    {chats
                        .filter((c) => chatFilter === "all" ? true : chatFilter === "direct" ? !c.isGroupChat : c.isGroupChat)
                        .map((c) => (
                        <div
                            key={c._id}
                            onClick={() => handleChatSelect(c)}
                            className="hover-lift"
                            style={{ padding: "16px 20px", cursor: "pointer", background: selectedChat?._id === c._id ? "#3a3a3a" : "transparent", borderBottom: "1px solid #3a3a3a", transition: "all 0.2s ease" }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                {(() => { const a = getChatAvatar(c); return (
                                    <div style={{ position: "relative" }}>
                                        <div style={{ width: 48, height: 48, borderRadius: "50%", overflow: "hidden", background: "#4a4a4a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                            {a.pic && a.pic !== "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg" ? (
                                                <img src={a.pic} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                            ) : (
                                                <span style={{ color: "white", fontWeight: 600, fontSize: 18 }}>
                                                    {a.name.slice(0,1).toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ position: "absolute", bottom: 2, right: 2, width: 12, height: 12, borderRadius: "50%", background: "#00d4aa", border: "2px solid #2a2a2a" }} />
                                    </div>
                                ); })()}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                                        <div style={{ fontWeight: 600, color: "#ffffff", fontSize: 16 }}>
                                            {getChatTitle(c)}
                                        </div>
                                        <div style={{ fontSize: 11, color: "#888888" }}>
                                            {lastMessages[c._id] ? new Date(lastMessages[c._id].createdAt).toLocaleTimeString([], { 
                                                hour: '2-digit', 
                                                minute: '2-digit',
                                                hour12: true 
                                            }) : (c.latestMessage ? new Date(c.latestMessage.createdAt).toLocaleTimeString([], { 
                                                hour: '2-digit', 
                                                minute: '2-digit',
                                                hour12: true 
                                            }) : '')}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 13, color: "#888888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {getLastMessageText(c)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {chats.length === 0 && (
                        <div style={{ fontSize: 14, color: "#94a3b8", textAlign: "center", padding: 32, opacity: 0.7 }}>
                            <div style={{ fontSize: 48, marginBottom: 12 }}>💭</div>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>No conversations yet</div>
                            <div style={{ fontSize: 12, opacity: 0.8 }}>Start by searching for users above</div>
                        </div>
                    )}
                </div>
                
                {/* Resize handle */}
                <div
                    onMouseDown={handleMouseDown}
                    style={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        width: 4,
                        height: "100%",
                        cursor: "col-resize",
                        background: "transparent",
                        zIndex: 10,
                        transition: "background-color 0.2s ease"
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = "rgba(79, 70, 229, 0.5)"}
                    onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                />
            </div>

            {/* Chat window */}
            <div style={{ 
                flex: 1, 
                display: isMobile && showChatList ? "none" : "flex",
                flexDirection: "column"
            }}>
                <SingleChat 
                    selectedChat={selectedChat}
                    token={token}
                    currentUserId={currentUserId}
                    currentUserName={currentUserName}
                    currentUserPic={currentUserPic}
                    onMessageSent={handleMessageSent}
                    chats={chats}
                    setChats={setChats}
                    setSelectedChat={setSelectedChat}
                    onChatSelect={handleChatSelect}
                    onBackToChatList={handleBackToChatList}
                    isMobile={isMobile}
                />
            </div>
            </div>

            {/* Create Group Modal */}
            {isGroupMode && (
                <div 
                    onMouseDown={() => setIsGroupMode(false)} 
                    style={{ 
                        position: "fixed", 
                        inset: 0, 
                        background: "rgba(0,0,0,0.6)", 
                        backdropFilter: "blur(8px)",
                        zIndex: 70, 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center",
                        animation: "fadeIn 0.2s ease-out"
                    }}
                >
                    <div 
                        onMouseDown={(e) => e.stopPropagation()} 
                        style={{ 
                            width: 480, 
                            maxWidth: "90%", 
                            maxHeight: "85vh",
                            background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", 
                            border: "1px solid rgba(148, 163, 184, 0.1)", 
                            borderRadius: 16, 
                            padding: 0,
                            boxShadow: "0 20px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)",
                            animation: "fadeInScale 0.3s ease-out",
                            overflow: "hidden",
                            overflowY: "auto"
                        }}
                    >
                        {/* Header */}
                        <div style={{ 
                            padding: "16px 20px 12px", 
                            borderBottom: "1px solid rgba(148, 163, 184, 0.1)",
                            background: "rgba(255,255,255,0.02)"
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <h2 style={{ 
                                        margin: 0, 
                                        fontWeight: 700, 
                                        color: "#f8fafc", 
                                        fontSize: 20,
                                        background: "linear-gradient(135deg, #f8fafc 0%, #cbd5e1 100%)",
                                        backgroundClip: "text",
                                        WebkitBackgroundClip: "text",
                                        WebkitTextFillColor: "transparent"
                                    }}>
                                        Create New Group
                                    </h2>
                                    <p style={{ 
                                        margin: "2px 0 0 0", 
                                        color: "#94a3b8", 
                                        fontSize: 12,
                                        fontWeight: 400
                                    }}>
                                        Start a conversation with multiple people
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setIsGroupMode(false)} 
                                    style={{ 
                                        width: 32,
                                        height: 32,
                                        border: "none", 
                                        background: "rgba(148, 163, 184, 0.1)", 
                                        color: "#94a3b8", 
                                        borderRadius: "50%", 
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: 14,
                                        transition: "all 0.2s ease",
                                        backdropFilter: "blur(10px)"
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.background = "rgba(239, 68, 68, 0.2)";
                                        e.target.style.color = "#ef4444";
                                        e.target.style.transform = "scale(1.1)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.background = "rgba(148, 163, 184, 0.1)";
                                        e.target.style.color = "#94a3b8";
                                        e.target.style.transform = "scale(1)";
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div style={{ padding: "20px", position: "relative" }}>
                            {/* Group Avatar Section */}
                            <div style={{ 
                                display: "flex", 
                                alignItems: "center", 
                                gap: 12, 
                                marginBottom: 16,
                                padding: "16px",
                                background: "rgba(255,255,255,0.02)",
                                borderRadius: 12,
                                border: "1px solid rgba(148, 163, 184, 0.1)"
                            }}>
                                <div style={{ 
                                    width: 48, 
                                    height: 48, 
                                    borderRadius: "50%", 
                                    background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)", 
                                    display: "flex", 
                                    alignItems: "center", 
                                    justifyContent: "center",
                                    boxShadow: "0 6px 20px rgba(79, 70, 229, 0.3)",
                                    position: "relative",
                                    overflow: "hidden"
                                }}>
                                    <span style={{ fontSize: 20, color: "white" }}>👥</span>
                                    <div style={{
                                        position: "absolute",
                                        inset: 0,
                                        background: "linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)",
                                        animation: "shimmer 2s infinite"
                                    }} />
                                </div>
                                <div>
                                    <h3 style={{ 
                                        margin: 0, 
                                        color: "#f8fafc", 
                                        fontSize: 15, 
                                        fontWeight: 600,
                                        marginBottom: 2
                                    }}>
                                        Group Photo
                                    </h3>
                                    <p style={{ 
                                        margin: 0, 
                                        color: "#64748b", 
                                        fontSize: 11,
                                        fontStyle: "italic"
                                    }}>
                                        Custom photos coming soon
                                    </p>
                                </div>
                            </div>

                            {/* Group Name Input */}
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ 
                                    display: "block", 
                                    color: "#e2e8f0", 
                                    fontSize: 14, 
                                    fontWeight: 600, 
                                    marginBottom: 8,
                                    letterSpacing: "0.025em"
                                }}>
                                    Group Name
                                </label>
                                <input
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                    placeholder="Enter a name for your group..."
                                    style={{ 
                                        width: "100%",
                                        padding: "14px 16px", 
                                        borderRadius: 12, 
                                        border: "1px solid rgba(148, 163, 184, 0.2)", 
                                        outline: "none", 
                                        background: "rgba(15, 23, 42, 0.8)", 
                                        color: "#f8fafc",
                                        fontSize: 15,
                                        fontWeight: 400,
                                        transition: "all 0.2s ease",
                                        backdropFilter: "blur(10px)",
                                        boxSizing: "border-box"
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = "#4f46e5";
                                        e.target.style.boxShadow = "0 0 0 3px rgba(79, 70, 229, 0.1)";
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = "rgba(148, 163, 184, 0.2)";
                                        e.target.style.boxShadow = "none";
                                    }}
                                />
                            </div>

                            {/* Add Members Section */}
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ 
                                    display: "block", 
                                    color: "#e2e8f0", 
                                    fontSize: 14, 
                                    fontWeight: 600, 
                                    marginBottom: 8,
                                    letterSpacing: "0.025em"
                                }}>
                                    Add Members
                                </label>
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
                                            // Exclude users already selected for the group
                                            const isAlreadySelected = selectedUsers.some(selected => selected._id === u._id);
                                            if (!seen.has(u._id) && !isAlreadySelected && (u.name||'').toLowerCase().includes(val.toLowerCase())) {
                                                seen.set(u._id, true);
                                                suggestions.push(u);
                                            }
                                        }
                                        setMemberSuggestions(suggestions.slice(0,8));
                                    }}
                                    placeholder="Search people from your conversations..."
                                    style={{ 
                                        width: "100%",
                                        padding: "14px 16px", 
                                        borderRadius: 12, 
                                        border: "1px solid rgba(148, 163, 184, 0.2)", 
                                        outline: "none", 
                                        background: "rgba(15, 23, 42, 0.8)", 
                                        color: "#f8fafc",
                                        fontSize: 15,
                                        fontWeight: 400,
                                        transition: "all 0.2s ease",
                                        backdropFilter: "blur(10px)",
                                        boxSizing: "border-box"
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = "#4f46e5";
                                        e.target.style.boxShadow = "0 0 0 3px rgba(79, 70, 229, 0.1)";
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = "rgba(148, 163, 184, 0.2)";
                                        e.target.style.boxShadow = "none";
                                    }}
                                />
                                
                                {/* Search Suggestions */}
                                {memberSuggestions.length > 0 && (
                                    <div style={{ 
                                        position: "absolute", 
                                        left: 20, 
                                        right: 20,
                                        top: "auto",
                                        marginTop: 4,
                                        background: "rgba(15, 23, 42, 0.95)", 
                                        border: "1px solid rgba(148, 163, 184, 0.2)", 
                                        borderRadius: 8, 
                                        maxHeight: 180, 
                                        overflowY: "auto",
                                        backdropFilter: "blur(20px)",
                                        boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
                                        zIndex: 10
                                    }}>
                                        {memberSuggestions.map(u => (
                                            <div 
                                                key={u._id} 
                                                onClick={() => { 
                                                    if (!selectedUsers.find(x=>x._id===u._id)) setSelectedUsers(prev=>[...prev, u]); 
                                                    setMemberSearch(""); 
                                                    setMemberSuggestions([]); 
                                                }} 
                                                style={{ 
                                                    padding: "8px 12px", 
                                                    cursor: "pointer", 
                                                    display: "flex", 
                                                    alignItems: "center", 
                                                    gap: 8,
                                                    transition: "all 0.2s ease",
                                                    borderBottom: "1px solid rgba(148, 163, 184, 0.05)"
                                                }}
                                                onMouseEnter={(e) => e.target.style.background = "rgba(79, 70, 229, 0.1)"}
                                                onMouseLeave={(e) => e.target.style.background = "transparent"}
                                            >
                                                <div style={{ 
                                                    width: 28, 
                                                    height: 28, 
                                                    borderRadius: "50%", 
                                                    overflow: "hidden", 
                                                    background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)", 
                                                    display: "flex", 
                                                    alignItems: "center", 
                                                    justifyContent: "center",
                                                    boxShadow: "0 2px 8px rgba(79, 70, 229, 0.2)"
                                                }}>
                                                    {u.pic ? (
                                                        <img src={u.pic} alt="u" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                    ) : (
                                                        <span style={{ fontSize: 12, color: "white", fontWeight: 600 }}>
                                                            {(u.name||'U').slice(0,1).toUpperCase()}
                                                        </span>
                                                    )}
                                                </div>
                                                <div>
                                                    <div style={{ color: "#f8fafc", fontSize: 13, fontWeight: 500 }}>{u.name}</div>
                                                    <div style={{ color: "#64748b", fontSize: 11 }}>{u.email}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Selected Members */}
                            {selectedUsers.length > 0 && (
                                <div style={{ marginBottom: 20 }}>
                                    <label style={{ 
                                        display: "block", 
                                        color: "#e2e8f0", 
                                        fontSize: 13, 
                                        fontWeight: 600, 
                                        marginBottom: 8,
                                        letterSpacing: "0.025em"
                                    }}>
                                        Selected Members ({selectedUsers.length})
                                    </label>
                                    <div style={{ 
                                        display: "flex", 
                                        flexWrap: "wrap", 
                                        gap: 6,
                                        padding: "12px",
                                        background: "rgba(255,255,255,0.02)",
                                        borderRadius: 8,
                                        border: "1px solid rgba(148, 163, 184, 0.1)",
                                        minHeight: 48
                                    }}>
                                        {selectedUsers.map((u) => (
                                            <span 
                                                key={u._id} 
                                                style={{ 
                                                    display: "inline-flex", 
                                                    alignItems: "center", 
                                                    gap: 8, 
                                                    padding: "6px 10px", 
                                                    background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)", 
                                                    color: "white", 
                                                    borderRadius: 16,
                                                    fontSize: 12,
                                                    fontWeight: 500,
                                                    boxShadow: "0 2px 8px rgba(79, 70, 229, 0.3)",
                                                    animation: "slideInUp 0.2s ease-out"
                                                }}
                                            >
                                                {u.name}
                                                <button 
                                                    onClick={() => toggleUserSelect(u)} 
                                                    style={{ 
                                                        border: "none", 
                                                        background: "rgba(255,255,255,0.2)", 
                                                        cursor: "pointer", 
                                                        color: "white",
                                                        borderRadius: "50%",
                                                        width: 16,
                                                        height: 16,
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        fontSize: 10,
                                                        transition: "all 0.2s ease"
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.target.style.background = "rgba(239, 68, 68, 0.8)";
                                                        e.target.style.transform = "scale(1.1)";
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.target.style.background = "rgba(255,255,255,0.2)";
                                                        e.target.style.transform = "scale(1)";
                                                    }}
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div style={{ 
                                display: "flex", 
                                justifyContent: "flex-end", 
                                gap: 8,
                                paddingTop: 16,
                                borderTop: "1px solid rgba(148, 163, 184, 0.1)"
                            }}>
                                <button 
                                    onClick={() => setIsGroupMode(false)} 
                                    style={{ 
                                        padding: "10px 20px", 
                                        borderRadius: 8, 
                                        border: "1px solid rgba(148, 163, 184, 0.2)", 
                                        background: "rgba(15, 23, 42, 0.8)", 
                                        color: "#e2e8f0", 
                                        cursor: "pointer",
                                        fontSize: 13,
                                        fontWeight: 500,
                                        transition: "all 0.2s ease",
                                        backdropFilter: "blur(10px)"
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.background = "rgba(148, 163, 184, 0.1)";
                                        e.target.style.transform = "translateY(-1px)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.background = "rgba(15, 23, 42, 0.8)";
                                        e.target.style.transform = "translateY(0)";
                                    }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleCreateGroup}
                                    disabled={!groupName.trim() || selectedUsers.length < 2}
                                    style={{ 
                                        padding: "10px 20px", 
                                        borderRadius: 8, 
                                        border: "none", 
                                        background: (!groupName.trim() || selectedUsers.length < 2) 
                                            ? "rgba(148, 163, 184, 0.2)" 
                                            : "linear-gradient(135deg, #10b981 0%, #059669 100%)", 
                                        color: (!groupName.trim() || selectedUsers.length < 2) ? "#64748b" : "white", 
                                        cursor: (!groupName.trim() || selectedUsers.length < 2) ? "not-allowed" : "pointer",
                                        fontSize: 13,
                                        fontWeight: 600,
                                        transition: "all 0.2s ease",
                                        boxShadow: (!groupName.trim() || selectedUsers.length < 2) 
                                            ? "none" 
                                            : "0 2px 8px rgba(16, 185, 129, 0.3)"
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!e.target.disabled) {
                                            e.target.style.transform = "translateY(-2px)";
                                            e.target.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.4)";
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!e.target.disabled) {
                                            e.target.style.transform = "translateY(0)";
                                            e.target.style.boxShadow = "0 2px 8px rgba(16, 185, 129, 0.3)";
                                        }
                                    }}
                                >
                                    Create Group
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chatpage;
