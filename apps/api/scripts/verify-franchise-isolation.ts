/**
 * Verifies the franchise-view query paths against the LIVE database.
 *
 * Each module's FranchiseViewService is instantiated with real repositories and
 * every query the franchise dashboards depend on is executed. The point is to prove
 * these now RUN — the previous hand-written cross-module SQL in franchise-service
 * threw on all five verticals and was swallowed by catch blocks.
 *
 * Usage: npx ts-node --transpile-only -r tsconfig-paths/register scripts/verify-franchise-isolation.ts
 */
import { DataSource } from 'typeorm';

import { GroceryStore } from '../../../modules/grocery/backend/src/entities/grocery-store.entity';
import { GroceryItem } from '../../../modules/grocery/backend/src/entities/grocery-item.entity';
import { GroceryOrder } from '../../../modules/grocery/backend/src/entities/grocery-order.entity';
import { FranchiseViewService as GroceryView } from '../../../modules/grocery/backend/src/franchise/franchise-view.service';

import { Restaurant } from '../../../modules/restaurant/backend/src/entities/restaurant.entity';
import { RestaurantOrder } from '../../../modules/restaurant/backend/src/entities/restaurant-order.entity';
import { MenuItem } from '../../../modules/restaurant/backend/src/entities/menu-item.entity';
import { MenuCategory } from '../../../modules/restaurant/backend/src/entities/menu-category.entity';
import { FranchiseViewService as RestaurantView } from '../../../modules/restaurant/backend/src/franchise/franchise-view.service';

import { PharmacyStore } from '../../../modules/pharmacy/backend/src/entities/pharmacy-store.entity';
import { PharmacyItem } from '../../../modules/pharmacy/backend/src/entities/pharmacy-item.entity';
import { PharmacyOrder } from '../../../modules/pharmacy/backend/src/entities/pharmacy-order.entity';
import { FranchiseViewService as PharmacyView } from '../../../modules/pharmacy/backend/src/franchise/franchise-view.service';

import { Clinic } from '../../../modules/doctor/backend/src/entities/clinic.entity';
import { Doctor } from '../../../modules/doctor/backend/src/entities/doctor.entity';
import { Appointment } from '../../../modules/doctor/backend/src/entities/appointment.entity';
import { FranchiseViewService as DoctorView } from '../../../modules/doctor/backend/src/franchise/franchise-view.service';

import { Seller } from '../../../modules/marketplace/backend/src/entities/seller.entity';
import { Product } from '../../../modules/marketplace/backend/src/entities/product.entity';
import { Category } from '../../../modules/marketplace/backend/src/entities/category.entity';
import { MarketplaceOrder } from '../../../modules/marketplace/backend/src/entities/marketplace-order.entity';
import { FranchiseViewService as MarketplaceView } from '../../../modules/marketplace/backend/src/franchise/franchise-view.service';

const FRANCHISE_ID = process.env.VERIFY_FRANCHISE_ID || 'FR-001';

const ds = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: +(process.env.DB_PORT || 5432),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'kartseek123',
  database: process.env.DB_NAME || 'kartseek_db',
  // Full entity graph per module — relations (e.g. Restaurant#reservations) need
  // their inverse sides registered. Globs are fine here: this runs under ts-node,
  // not webpack, so __dirname resolves to real source directories.
  entities: [
    __dirname + '/../../../modules/grocery/backend/src/entities/*.entity.ts',
    __dirname + '/../../../modules/restaurant/backend/src/entities/*.entity.ts',
    __dirname + '/../../../modules/pharmacy/backend/src/entities/*.entity.ts',
    __dirname + '/../../../modules/doctor/backend/src/entities/*.entity.ts',
    __dirname + '/../../../modules/marketplace/backend/src/entities/*.entity.ts',
  ],
  synchronize: false,
  logging: false,
});

let pass = 0;
let fail = 0;

async function check(label: string, fn: () => Promise<unknown>) {
  try {
    const result = await fn();
    pass++;
    console.log(`  PASS  ${label}\n        → ${JSON.stringify(result).slice(0, 160)}`);
  } catch (e) {
    fail++;
    console.log(`  FAIL  ${label}\n        → ${(e as Error).message}`);
  }
}

async function main() {
  await ds.initialize();
  console.log(`\nVerifying franchise views against live DB (franchiseId=${FRANCHISE_ID})\n`);

  const grocery = new GroceryView(
    ds.getRepository(GroceryStore),
    ds.getRepository(GroceryItem),
    ds.getRepository(GroceryOrder),
  );
  console.log('GROCERY');
  await check('kpis', () => grocery.getKpis(FRANCHISE_ID));
  await check('stores', () => grocery.getStores(FRANCHISE_ID, 'a', 'APPROVED'));
  await check('orders', () => grocery.getOrders(FRANCHISE_ID, 1));
  await check('products', () => grocery.getProducts(FRANCHISE_ID, 'a'));
  await check('analytics', () => grocery.getAnalytics(FRANCHISE_ID, '30d'));

  const restaurant = new RestaurantView(
    ds.getRepository(Restaurant),
    ds.getRepository(RestaurantOrder),
    ds.getRepository(MenuItem),
  );
  console.log('\nRESTAURANT');
  await check('kpis', () => restaurant.getKpis(FRANCHISE_ID));
  await check('list', () => restaurant.getRestaurants(FRANCHISE_ID, 'a'));
  await check('orders', () => restaurant.getOrders(FRANCHISE_ID, 1));
  await check('menuStats', () => restaurant.getMenuStats(FRANCHISE_ID));
  await check('analytics', () => restaurant.getAnalytics(FRANCHISE_ID, '30d'));

  const pharmacy = new PharmacyView(
    ds.getRepository(PharmacyStore),
    ds.getRepository(PharmacyOrder),
    ds.getRepository(PharmacyItem),
  );
  console.log('\nPHARMACY');
  await check('kpis', () => pharmacy.getKpis(FRANCHISE_ID));
  await check('stores', () => pharmacy.getStores(FRANCHISE_ID, 'a'));
  await check('orders', () => pharmacy.getOrders(FRANCHISE_ID, 1));
  await check('products', () => pharmacy.getProducts(FRANCHISE_ID, 'a'));
  await check('lowStockInventory', () => pharmacy.getLowStockInventory(FRANCHISE_ID));
  await check('compliance', () => pharmacy.getCompliance(FRANCHISE_ID));
  await check('analytics', () => pharmacy.getAnalytics(FRANCHISE_ID, '30d'));

  const doctor = new DoctorView(
    ds.getRepository(Clinic),
    ds.getRepository(Doctor),
    ds.getRepository(Appointment),
  );
  console.log('\nDOCTOR');
  await check('kpis', () => doctor.getKpis(FRANCHISE_ID));
  await check('clinics', () => doctor.getClinics(FRANCHISE_ID, 'a'));
  await check('appointments', () => doctor.getAppointments(FRANCHISE_ID, 1));
  await check('doctors', () => doctor.getDoctors(FRANCHISE_ID));
  await check('analytics', () => doctor.getAnalytics(FRANCHISE_ID, '30d'));

  const marketplace = new MarketplaceView(
    ds.getRepository(Seller),
    ds.getRepository(Product),
    ds.getRepository(MarketplaceOrder),
  );
  console.log('\nMARKETPLACE');
  await check('kpis', () => marketplace.getKpis(FRANCHISE_ID));
  await check('sellers', () => marketplace.getSellers(FRANCHISE_ID, 'a', 'Electronics', 'active'));
  await check('sellerCounts', () => marketplace.getSellerCounts(FRANCHISE_ID));

  console.log(`\n${pass} passed, ${fail} failed\n`);
  await ds.destroy();
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
