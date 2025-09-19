const User = require('../model/User.schema');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

class UserController {
  constructor() { }
  Register = async (req, res) => {
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
  }

  Login = async (req, res) => {
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
  }
}

module.exports = new UserController();