const bcrypt = require('bcryptjs');
const { User, USER_ROLES, Sede } = require('../models');

const createUsuario = async (req, res, next) => {
  try {
    const { nombre, email, password, rol, sede } = req.body;

    const rolUpper = (rol || '').toUpperCase();
    if (!USER_ROLES.includes(rolUpper)) {
      return res.status(400).json({ mensaje: 'Rol no valido' });
    }

    const existente = await User.scope('withPassword').findOne({ where: { email } });
    if (existente) {
      return res.status(409).json({ mensaje: 'El correo ya esta registrado' });
    }

    const sedeId = sede ? Number(sede) : null;
    if (sedeId) {
      const sedeExiste = await Sede.findByPk(sedeId);
      if (!sedeExiste) {
        return res.status(404).json({ mensaje: 'La sede indicada no existe' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const creado = await User.create({
      nombre,
      email,
      password: hashedPassword,
      rol: rolUpper,
      sedeId,
    });

    const usuario = await User.findByPk(creado.id, {
      include: [{ model: Sede, as: 'sede', attributes: ['id', 'nombre'] }],
    });

    return res.status(201).json({ mensaje: 'Usuario creado', usuario });
  } catch (error) {
    return next(error);
  }
};

const listUsuarios = async (req, res, next) => {
  try {
    const { rol, sede } = req.query;
    const where = {};

    if (rol) {
      const rolUpper = rol.toUpperCase();
      if (!USER_ROLES.includes(rolUpper)) {
        return res.status(400).json({ mensaje: 'Rol no valido' });
      }
      where.rol = rolUpper;
    }

    if (sede) {
      where.sedeId = Number(sede);
    }

    if (req.user.rol === 'JEFE') {
      const sedeAsignada = req.user.sede?._id || req.user.sedeId;
      if (!sedeAsignada) {
        return res.status(400).json({ mensaje: 'Debes tener una sede asignada' });
      }

      if (where.rol && where.rol !== 'CONDUCTOR') {
        return res.status(403).json({ mensaje: 'No puedes consultar usuarios con ese rol' });
      }

      where.rol = 'CONDUCTOR';
      where.sedeId = Number(sedeAsignada);
    }

    const usuarios = await User.findAll({
      where,
      include: [{ model: Sede, as: 'sede', attributes: ['id', 'nombre'] }],
      order: [['nombre', 'ASC']],
    });

    return res.json({ usuarios });
  } catch (error) {
    return next(error);
  }
};

const updateUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nombre, rol, sede, activo } = req.body;
    const usuario = await User.findByPk(id);

    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    const payload = {};
    if (nombre) {
      payload.nombre = nombre;
    }
    if (typeof activo === 'boolean') {
      payload.activo = activo;
    }
    if (rol) {
      const rolUpper = rol.toUpperCase();
      if (!USER_ROLES.includes(rolUpper)) {
        return res.status(400).json({ mensaje: 'Rol no valido' });
      }
      payload.rol = rolUpper;
    }
    if (sede !== undefined) {
      const sedeId = sede ? Number(sede) : null;
      if (sedeId) {
        const sedeExiste = await Sede.findByPk(sedeId);
        if (!sedeExiste) {
          return res.status(404).json({ mensaje: 'La sede indicada no existe' });
        }
      }
      payload.sedeId = sedeId;
    }

    await usuario.update(payload);

    const actualizado = await User.findByPk(usuario.id, {
      include: [{ model: Sede, as: 'sede', attributes: ['id', 'nombre'] }],
    });

    return res.json({ mensaje: 'Usuario actualizado', usuario: actualizado });
  } catch (error) {
    return next(error);
  }
};

const deleteUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    const usuario = await User.findByPk(id);

    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    const currentUserId = req.user?._id ? Number(req.user._id) : null;
    if (currentUserId && currentUserId === usuario.id) {
      return res.status(400).json({ mensaje: 'No puedes eliminar tu propio usuario' });
    }

    await usuario.destroy();

    return res.json({ mensaje: 'Usuario eliminado' });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createUsuario,
  listUsuarios,
  updateUsuario,
  deleteUsuario,
};
