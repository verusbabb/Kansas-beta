import { QueryInterface, DataTypes } from 'sequelize';

/**
 * Migration: Change newsletters.link column to newsletters.filePath
 * This migration renames the 'link' column to 'filePath' to reflect
 * the change from URL links to file paths in Cloud Storage
 * 
 * Created: 2025-12-28
 * Run: npm run migration:run
 * Rollback: npm run migration:undo
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  // Rename the column from 'link' to 'filePath'
  await queryInterface.renameColumn('newsletters', 'link', 'filePath');
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  // Revert: rename 'filePath' back to 'link'
  await queryInterface.renameColumn('newsletters', 'filePath', 'link');
}

