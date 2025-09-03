import mongoose from "mongoose";

const messageSchema=new mongoose.Schema({
    sender: { type: String, required: true },
    content: { type: String, required: true },
    roomId: { type: String, required: true, index: true },
}, {
    timestamps: true,
});


const Message = mongoose.model('Message', messageSchema);

export default Message;
