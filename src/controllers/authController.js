const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, USER_ROLES, Sede } = require('../models');

const generarToken = (user) =>
  jwt.sign(
    {
      id: user.id,
      rol: user.rol,
    },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );

const registerUser = async (req, res, next) => {
  try {
    const { nombre, email, password, rol, sede } = req.body;

    const rolUpper = rol?.toUpperCase();
    if (!USER_ROLES.includes(rolUpper)) {
      return res.status(400).json({ mensaje: 'Rol no valido' });
    }

    const existing = await User.scope('withPassword').findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ mensaje: 'El correo ya esta registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const sedeId = sede ? Number(sede) : null;

    const created = await User.create({
      nombre,
      email,
      password: hashedPassword,
      rol: rolUpper,
      sedeId,
    });

    const usuario = await User.findByPk(created.id, {
      include: [{ model: Sede, as: 'sede' }],
    });

    return res.status(201).json({
      mensaje: 'Usuario creado correctamente',
      usuario,
    });
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.scope('withPassword').findOne({
      where: { email },
      include: [{ model: Sede, as: 'sede' }],
    });

    if (!user || !user.activo) {
      return res.status(401).json({ mensaje: 'Credenciales invalidas' });
    }

    const esValido = await bcrypt.compare(password, user.get('password'));
    if (!esValido) {
      return res.status(401).json({ mensaje: 'Credenciales invalidas' });
    }

    const token = generarToken(user);

    return res.json({
      token,
      usuario: user,
    });
  } catch (error) {
    return next(error);
  }
};

const getProfile = (req, res) => res.json({ usuario: req.user });

module.exports = {
  registerUser,
  login,
  getProfile,
};
