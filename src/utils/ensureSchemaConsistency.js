const { QueryTypes } = require('sequelize');

const TABLES_WITH_NUMERIC_IDS = ['users', 'sedes', 'gruas', 'rutas', 'gastos', 'recargas'];

const UNIQUE_INDEXES = [
  { table: 'users', column: 'email', indexName: 'users_email_unique' },
  { table: 'sedes', column: 'nombre', indexName: 'sedes_nombre_unique' },
  { table: 'gruas', column: 'codigo', indexName: 'gruas_codigo_unique' },
  { table: 'gruas', column: 'placa', indexName: 'gruas_placa_unique' },
];

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

const ensureUniqueIndexes = async (sequelize) => {
  for (const { table, column, indexName } of UNIQUE_INDEXES) {
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

    const indexes = await sequelize.query(
      `
        SELECT index_name, non_unique
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = :table
          AND column_name = :column
          AND index_name <> 'PRIMARY'
      `,
      {
        replacements: { table, column },
        type: QueryTypes.SELECT,
      }
    );

    const targetIndex = indexes.find(
      (index) =>
        index.index_name === indexName &&
        Number.parseInt(index.non_unique, 10) === 0
    );

    const indexesToDrop = indexes.filter(
      (index) =>
        index.index_name !== indexName ||
        Number.parseInt(index.non_unique, 10) !== 0
    );

    for (const index of indexesToDrop) {
      await sequelize.query(
        `ALTER TABLE \`${table}\` DROP INDEX \`${index.index_name}\``
      );
    }

    if (!targetIndex) {
      await sequelize.query(
        `ALTER TABLE \`${table}\` ADD UNIQUE INDEX \`${indexName}\` (\`${column}\`)`
      );
    }
  }
};

const ensureSchemaConsistency = async (sequelize) => {
  await ensureUnsignedPrimaryKeys(sequelize);
  await ensureUniqueIndexes(sequelize);
};

module.exports = ensureSchemaConsistency;
