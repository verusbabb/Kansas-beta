import { QueryInterface } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

/**
 * Seeder: Seed admin user
 * This seeder creates the initial admin user
 * 
 * Run: npm run seed:run:dev
 * Rollback: npm run seed:undo:dev
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  // Check if admin user already exists
  const [existingUsers] = await queryInterface.sequelize.query(
    `SELECT id FROM users WHERE email = 'stevebabbmail@gmail.com' AND "deletedAt" IS NULL LIMIT 1`,
  );

  // Only insert if user doesn't exist
  if (Array.isArray(existingUsers) && existingUsers.length === 0) {
    await queryInterface.bulkInsert('users', [
      {
        id: uuidv4(),
        email: 'stevebabbmail@gmail.com',
        firstName: 'Steve',
        lastName: 'Babb',
        role: 'admin',
        auth0Id: null, // Will be set when user signs up in Auth0
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    ]);
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.bulkDelete('users', {
    email: 'stevebabbmail@gmail.com',
  });
}

