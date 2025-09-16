const mongoose = require('mongoose');

const VideoSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    stream_url: { type: String, required: true },
    uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Video', VideoSchema);
