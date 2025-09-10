const mongoose = require('mongoose');

const db = (MONGO_URI)=>{
  mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch(err => console.error('❌ Error al conectar a MongoDB:', err));
}

module.exports = db;