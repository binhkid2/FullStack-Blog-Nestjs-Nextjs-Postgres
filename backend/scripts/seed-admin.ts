/**
 * Run: npx ts-node -P tsconfig.json scripts/seed-admin.ts
 */
import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User, UserRole } from '../src/users/entities/user.entity';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'nestjs_blog',
  entities: [User],
  synchronize: true,
});

async function seed() {
  await dataSource.initialize();
  console.log('✅ Database connected');

  const users = [
    { email: 'admin@gmail.com', role: UserRole.ADMIN, name: 'Admin' },
    { email: 'manager@gmail.com', role: UserRole.MANAGER, name: 'Manager' },
  ];

  const repo = dataSource.getRepository(User);
  const passwordHash = await bcrypt.hash('Whatever123$', 12);

  for (const u of users) {
    let user = await repo.findOne({ where: { email: u.email } });
    if (!user) {
      user = repo.create({ id: uuidv4(), ...u, passwordHash, isActive: true });
      await repo.save(user);
      console.log(`✅ Created ${u.role}: ${u.email}`);
    } else {
      user.role = u.role;
      user.passwordHash = passwordHash;
      user.isActive = true;
      await repo.save(user);
      console.log(`♻️  Updated ${u.role}: ${u.email}`);
    }
  }

  await dataSource.destroy();
  console.log('🎉 Seeding complete');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
