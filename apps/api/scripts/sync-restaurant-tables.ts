/**
 * Restaurant Module — Table Sync Script
 *
 * Creates the 7 missing restaurant tables using TypeORM synchronize.
 * Safe to re-run — TypeORM will not drop or alter existing tables.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register scripts/sync-restaurant-tables.ts
 */

import { DataSource } from 'typeorm';
import { Restaurant } from '../apps/restaurant-service/src/entities/restaurant.entity';
import { MenuCategory } from '../apps/restaurant-service/src/entities/menu-category.entity';
import { MenuItem } from '../apps/restaurant-service/src/entities/menu-item.entity';
import { RestaurantOrder } from '../apps/restaurant-service/src/entities/restaurant-order.entity';
import { Reservation } from '../apps/restaurant-service/src/entities/reservation.entity';
import { RestaurantReview } from '../apps/restaurant-service/src/entities/restaurant-review.entity';
import { RestaurantTable } from '../apps/restaurant-service/src/entities/restaurant-table.entity';
import { RestaurantPromotion } from '../apps/restaurant-service/src/entities/restaurant-promotion.entity';
import { RestaurantStaff } from '../apps/restaurant-service/src/entities/restaurant-staff.entity';

const ALL_ENTITIES = [
  Restaurant, MenuCategory, MenuItem,
  RestaurantOrder, Reservation, RestaurantReview,
  RestaurantTable, RestaurantPromotion, RestaurantStaff,
];

const ds = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'kartseek123',
  database: process.env.DB_NAME ?? 'kartseek_db',
  entities: ALL_ENTITIES,
  synchronize: true,
});

async function sync() {
  console.log('🍽️  Connecting to database...');
  await ds.initialize();
  console.log('✅ Connected & synchronized!\n');

  // Verify all tables exist
  const tables = await ds.query(
    `SELECT tablename FROM pg_tables WHERE schemaname='public'
     AND tablename IN ('restaurants','menu_items','menu_categories',
       'restaurant_orders','reservations','restaurant_reviews',
       'restaurant_tables','restaurant_promotions','restaurant_staff')
     ORDER BY tablename;`
  );

  console.log('═══════════════════════════════════════════');
  console.log('📋 Restaurant tables in database:');
  for (const t of tables) {
    console.log(`   ✅ ${t.tablename}`);
  }
  console.log(`\n   Total: ${tables.length}/9 tables`);
  console.log('═══════════════════════════════════════════');

  if (tables.length < 9) {
    console.warn(`\n⚠️  Only ${tables.length}/9 tables found — some entities may have issues.`);
  } else {
    console.log('\n🎉 All 9 restaurant tables are present!');
  }

  await ds.destroy();
}

sync().catch((err) => {
  console.error('❌ Sync failed:', err);
  process.exit(1);
});
