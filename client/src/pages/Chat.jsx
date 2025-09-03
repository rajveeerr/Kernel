import { useState,useRef } from "react";
import {io} from "socket.io-client"

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";


export default function Chat(){
    const [chat, setChat] = useState([{}]);
    const chatMsg=useRef(null);
    const socket = io(BACKEND_URL);

    socket.on("connect", () => {
        console.log(`Connected to server with id: ${socket.id}`);
        console.log(`Socket connected? : ${socket.connected}`);

    });

    socket.on("disconnect", () => {
        console.log(`Disconnected from server with id: ${socket.id}`);
    });

    function handleSubmit(e){
        e.preventDefault();
        socket.emit("message", {user: "User1", message: chatMsg.current.value});
        chatMsg.current.value = "";
    }

    socket.on("message", (data) => {
        setChat((prevChat) => [
            ...prevChat,
            { id: prevChat.length + 1, message: data.message, user: data.user }
        ]);
    });

    return (
        <>
            <h1>Chat</h1>
            <p>This is the chat page.</p>
            <ul>
                {Object.values(chat).map((msg) => (
                    <li key={msg.id}>
                        <strong>{msg.user}:</strong> {msg.message}
                    </li>
                ))}
            </ul>
            <form onSubmit={handleSubmit}>
                <input type="text" ref={chatMsg} placeholder="Type a message..." />
                <button>Send</button>
            </form>
        </>
    )
}