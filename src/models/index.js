const { sequelize } = require('../config/db');
const { User, USER_ROLES } = require('./User');
const Sede = require('./Sede');
const Grua = require('./Grua');
const { Ruta, ESTADO_RUTA } = require('./Ruta');
const { Gasto, CATEGORIAS_GASTO } = require('./Gasto');
const Recarga = require('./Recarga');

User.belongsTo(Sede, { as: 'sede', foreignKey: 'sedeId' });
Sede.hasMany(User, { as: 'usuarios', foreignKey: 'sedeId' });

Sede.belongsTo(User, { as: 'jefe', foreignKey: 'jefeId' });
User.hasOne(Sede, { as: 'sedeDirigida', foreignKey: 'jefeId' });

Grua.belongsTo(Sede, { as: 'sede', foreignKey: 'sedeId' });
Sede.hasMany(Grua, { as: 'gruas', foreignKey: 'sedeId' });

Ruta.belongsTo(Sede, { as: 'sedeOrigen', foreignKey: 'sedeOrigenId' });
Ruta.belongsTo(Sede, { as: 'sedeDestino', foreignKey: 'sedeDestinoId' });
Ruta.belongsTo(Grua, { as: 'grua', foreignKey: 'gruaId' });
Ruta.belongsTo(User, { as: 'conductor', foreignKey: 'conductorId' });

Gasto.belongsTo(Ruta, { as: 'ruta', foreignKey: 'rutaId' });
Ruta.hasMany(Gasto, { as: 'gastos', foreignKey: 'rutaId' });
Gasto.belongsTo(User, { as: 'conductor', foreignKey: 'conductorId' });
User.hasMany(Gasto, { as: 'gastos', foreignKey: 'conductorId' });

Recarga.belongsTo(Ruta, { as: 'ruta', foreignKey: 'rutaId' });
Ruta.hasMany(Recarga, { as: 'recargas', foreignKey: 'rutaId' });
Recarga.belongsTo(User, { as: 'jefe', foreignKey: 'jefeId' });
User.hasMany(Recarga, { as: 'recargas', foreignKey: 'jefeId' });

module.exports = {
  sequelize,
  User,
  USER_ROLES,
  Sede,
  Grua,
  Ruta,
  ESTADO_RUTA,
  Gasto,
  CATEGORIAS_GASTO,
  Recarga,
};
