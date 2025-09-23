// --- 1. Importaciones y Configuración Inicial ---
const express = require('express');
const multer = require('multer');
const db = require('./db/database');
const apiroutes = require('./Routes/api.routes');
const authMiddleware = require('./Middleware/auth.middleware')
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
//const uuidv4 = require('uuid');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8000;
const JWT_SECRET = 'tu_super_secreto_para_jwt'; // ¡Cámbialo en producción!
const MONGO_URI = 'mongodb+srv://Shiro997-Yggdrasil:kS8nCrUM8L3kMnFB@cluster0.eabutku.mongodb.net/nexKlyp'; // URI para MongoDB local

// --- Middlewares ---
app.use(cors());
app.use(express.json());
app.use('/static', express.static(path.join(__dirname, 'static')));

// --- Creación de Directorios ---
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const VIDEO_DIR = path.join(__dirname, 'static', 'videos');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(VIDEO_DIR, { recursive: true });

// --- Configuración de Multer (sin cambios) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });


// --- 4. Rutas de Autenticación (Actualizadas con Mongoose) ---

app.use('',apiroutes);


// --- 5. Middleware de Autenticación (sin cambios) ---



// --- 6. Rutas de Videos (Actualizadas con Mongoose) ---

// [POST] /api/upload
app.post('/api/upload', authMiddleware.authMiddleware, upload.single('video'), (req, res) => {
    const { title, description } = req.body;
    const videoFile = req.file;
    if (!videoFile) return res.status(400).json({ message: 'No se subió ningún archivo.' });

    const videoId = path.parse(videoFile.filename).name;
    const outputDir = path.join(VIDEO_DIR, videoId);
    fs.mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, 'stream.m3u8');
    const sourcePath = videoFile.path;

    const ffmpegCommand = `ffmpeg -i "${sourcePath}" -c:v libx264 -c:a aac -hls_time 10 -hls_list_size 0 -f hls "${outputPath}"`;

    exec(ffmpegCommand, async (error, stdout, stderr) => {
        fs.unlinkSync(sourcePath);
        if (error) {
            console.error('Error de FFmpeg:', stderr);
            return res.status(500).json({ message: 'Error al procesar el video.' });
        }

        // Guardar metadatos del video en MongoDB
        const newVideo = new Video({
            title,
            description,
            uploader: req.user.userId,
            stream_url: `/static/videos/${videoId}/stream.m3u8`,
        });
        await newVideo.save();

        res.status(201).json({ message: 'Video subido y procesado.', videoData: newVideo });
    });
});

// [GET] /api/videos
app.get('/api/videos', async (req, res) => {
    try {
        const videos = await Video.find().populate('uploader', 'username').sort({ createdAt: -1 });
        res.json(videos);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los videos.' });
    }
});

// [GET] /api/videos/:id
app.get('/api/videos/:id', async (req, res) => {
    try {
        const video = await Video.findById(req.params.id).populate('uploader', 'username');
        if (!video) return res.status(404).json({ message: 'Video no encontrado.' });
        res.json(video);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener el video.' });
    }
});

// --- 7. Iniciar el Servidor ---
app.listen(PORT, () => {
    // --- 2. Conexión a MongoDB ---
    db(MONGO_URI);
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});