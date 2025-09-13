import { createContext, useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
    const [chats, setChats] = useState([]);
    const [user, setUser] = useState(null);

    const navigate = useNavigate();
    useEffect(() => {
        try {
            const stored = localStorage.getItem('userInfo');
            if (stored) {
                const parsed = JSON.parse(stored);
                setUser(parsed);
            } else {
                navigate('/');
            }
        } catch {
            navigate('/');
        }
    }, [navigate]);

    return (
        <ChatContext.Provider value={{ chats, setChats, user, setUser }}>
            {children}
        </ChatContext.Provider>
    );
};

export const useChat = () => useContext(ChatContext);


