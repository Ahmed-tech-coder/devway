const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const supabase = require('../src/config/supabase');
const bcrypt = require('bcryptjs');

const admins = [
  {
    full_name: 'Ahmed Magdy',
    email: 'ahmed.front@gmail.com',
    password: '@Gm_Ahm77!20m5#',
    role: 'admin',
  },
  {
    full_name: 'Habiba Emad',
    email: 'habiba.front@gmail.com',
    password: '@Gm_Hab77!20m5#',
    role: 'admin',
  },
];

async function seed() {
  console.log('Starting database seeding via Supabase...');
  try {
    for (const admin of admins) {
      console.log(`Seeding admin: ${admin.full_name} (${admin.email})...`);
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(admin.password, saltRounds);

      const { data, error } = await supabase
        .from('profiles')
        .upsert(
          {
            full_name: admin.full_name,
            email: admin.email,
            password_hash: hashedPassword,
            role: admin.role,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'email' }
        )
        .select('*');

      if (error) {
        throw error;
      }

      console.log(`Admin ${admin.full_name} seeded successfully.`);
    }
    console.log('Database seeding finished successfully.');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

seed();
