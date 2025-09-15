// --- 1. Importaciones y Configuración Inicial ---
const express = require('express');
const multer = require('multer');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db/database');
const mongoose = require('mongoose');
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



// --- 3. Modelos de Mongoose (Schemas) ---
// Schema para Usuarios
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
}, { timestamps: true });
const User = mongoose.model('User', UserSchema);

// Schema para Videos
const VideoSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    stream_url: { type: String, required: true },
    uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
const Video = mongoose.model('Video', VideoSchema);


// --- Configuración de Multer (sin cambios) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });


// --- 4. Rutas de Autenticación (Actualizadas con Mongoose) ---

// [POST] /api/auth/register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Todos los campos son requeridos.' });
        }

        // Verificar si el email ya existe en la BD
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'El correo electrónico ya está en uso.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Crear y guardar el nuevo usuario en MongoDB
        const newUser = new User({ username, email, password: hashedPassword });
        await newUser.save();

        res.status(201).json({ message: 'Usuario registrado exitosamente.' });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor.', error: error.message });
    }
});

// [POST] /api/auth/login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Credenciales inválidas.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Credenciales inválidas.' });
        }

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, username: user.username });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor.', error: error.message });
    }
});


// --- 5. Middleware de Autenticación (sin cambios) ---
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Acceso denegado.' });
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Token no válido.' });
        req.user = user;
        next();
    });
};


// --- 6. Rutas de Videos (Actualizadas con Mongoose) ---

// [POST] /api/upload
app.post('/api/upload', authMiddleware, upload.single('video'), (req, res) => {
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