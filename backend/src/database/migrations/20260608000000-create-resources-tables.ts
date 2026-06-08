import { QueryInterface, DataTypes, Sequelize } from 'sequelize'

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('resources', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.literal('uuid_generate_v4()'),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    tag: {
      type: DataTypes.ENUM('legal', 'insurance', 'national', 'other'),
      allowNull: false,
    },
    uploadedBy: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  })

  await queryInterface.addIndex('resources', ['tag'], { name: 'idx_resources_tag' })

  await queryInterface.createTable('resource_versions', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.literal('uuid_generate_v4()'),
      allowNull: false,
    },
    resourceId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'resources', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    filePath: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    originalFilename: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    contentType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    versionNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    uploadedBy: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  })

  await queryInterface.addIndex('resource_versions', ['resourceId'], {
    name: 'idx_resource_versions_resourceId',
  })
  await queryInterface.addIndex('resource_versions', ['resourceId', 'versionNumber'], {
    name: 'idx_resource_versions_resourceId_versionNumber',
  })
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('resource_versions')
  await queryInterface.dropTable('resources')
}
