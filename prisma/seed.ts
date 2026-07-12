import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const phone = '01700000000';
  const password = '01700000000';

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    console.log('✅ Super admin already exists');
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  // Super admin doesn't belong to any school, we need a placeholder
  // We'll create a "System" school for super admin
  let systemSchool = await prisma.school.findFirst({
    where: { eiin: 'SYSTEM' },
  });
  if (!systemSchool) {
    systemSchool = await prisma.school.create({
      data: {
        name: 'System Administration',
        eiin: 'SYSTEM',
        establishedYear: 2024,
        address: 'System',
        upazila: 'System',
        district: 'System',
        division: 'System',
        isActive: false, // Not shown in dropdown
      },
    });
  }

  await prisma.user.create({
    data: {
      phone,
      password: hashedPassword,
      role: UserRole.SUPER_ADMIN,
      schoolId: systemSchool.id,
    },
  });

  console.log(`✅ Super admin created with phone: ${phone}`);
  console.log(`⚠️  Please change the default password after first login!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
