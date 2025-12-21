import { QueryInterface } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

/**
 * Seeder: Seed guest list data
 * This seeder populates the guest_list table with initial data
 * 
 * Run: npm run seed:run:dev
 * Rollback: npm run seed:undo:dev
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.bulkInsert('guest_list', [
    {
      id: uuidv4(),
      name: 'John Doe',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: uuidv4(),
      name: 'Jane Smith',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.bulkDelete('guest_list', {
    name: ['John Doe', 'Jane Smith'],
  });
}

