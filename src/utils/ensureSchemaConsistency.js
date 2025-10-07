const { QueryTypes } = require('sequelize');

const TABLES_WITH_NUMERIC_IDS = ['users', 'sedes', 'gruas', 'rutas', 'gastos', 'recargas'];

const ensureUnsignedPrimaryKeys = async (sequelize) => {
  for (const table of TABLES_WITH_NUMERIC_IDS) {
    const [{ count }] = await sequelize.query(
      `
        SELECT COUNT(*) AS count
        FROM information_schema.tables
        WHERE table_schema = DATABASE() AND table_name = :table
      `,
      {
        replacements: { table },
        type: QueryTypes.SELECT,
      }
    );

    const tableExists = Number.parseInt(count, 10) > 0;

    if (!tableExists) {
      continue;
    }

    await sequelize.query(
      `ALTER TABLE \`${table}\` MODIFY COLUMN \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT`
    );
  }
};

const ensureSchemaConsistency = async (sequelize) => {
  await ensureUnsignedPrimaryKeys(sequelize);
};

module.exports = ensureSchemaConsistency;
