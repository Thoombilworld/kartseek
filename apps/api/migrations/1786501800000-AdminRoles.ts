import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * KARTSEEK — admin roles as data.
 *
 * `admin.admin_roles` holds the permission sets the console's Roles &
 * Permissions page used to keep in a static array in the browser, and
 * `users.admin_role_id` assigns one to a staff account. Until now nothing
 * persisted a role at all: the page shipped seventeen fixtures with invented
 * user counts, "saving" one mutated React state, and a reload put the
 * fixtures back. Nothing the console displayed had ever reached the server,
 * so no permission it drew was enforceable anywhere.
 *
 * The permission keys are declared once in TypeScript
 * (`libs/common/src/admin/permissions.ts`); a spec there asserts the two
 * lists cannot drift apart.
 *
 * A later task signs the assigned role's permissions into the token at login
 * (`adminPermissions`), which is what `perm:` keys check. This migration only
 * makes the assignment exist.
 */
export class AdminRoles1786501800000 implements MigrationInterface {
  name = 'AdminRoles1786501800000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE SCHEMA IF NOT EXISTS "admin"`);
    await q.query(`
      CREATE TABLE IF NOT EXISTS "admin"."admin_roles" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "key" varchar(40) NOT NULL UNIQUE,
        "name" varchar(80) NOT NULL,
        "description" varchar(300),
        "permissions" text[] NOT NULL DEFAULT '{}',
        "is_system" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    // ON DELETE SET NULL, not CASCADE: deleting a role must never delete the
    // people who held it. (The API refuses to delete an occupied role at all;
    // this is the database's own backstop.)
    await q.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "admin_role_id" uuid REFERENCES "admin"."admin_roles"("id") ON DELETE SET NULL`,
    );
    await q.query(`
      INSERT INTO "admin"."admin_roles" ("key","name","description","permissions","is_system") VALUES
        ('super_admin','Super Admin','Global control of every module, market and setting','{*}',true),
        ('admin','Admin','Platform operations across every market','{dashboard.view,orders.view,orders.manage,orders.refund,users.view,users.manage,sellers.view,sellers.manage,sellers.approve,finance.view,finance.payouts,finance.reports,kyc.view,kyc.approve,content.view,content.manage,promotions.manage,system.health,audit.logs,franchise.view,franchise.manage,delivery.view,delivery.manage,support.view,support.respond,staff.view,wallet.audit,loyalty.view,modules.marketplace,modules.grocery,modules.restaurant,modules.pharmacy,modules.doctor,modules.hotel,modules.taxi}',true),
        ('regional_admin','Regional Admin','Everything an Admin can do, inside one market','{dashboard.view,orders.view,orders.manage,orders.refund,users.view,users.manage,sellers.view,sellers.manage,sellers.approve,finance.view,finance.payouts,finance.reports,kyc.view,kyc.approve,content.view,content.manage,promotions.manage,audit.logs,franchise.view,delivery.view,delivery.manage,support.view,support.respond,wallet.audit,loyalty.view,modules.marketplace,modules.grocery,modules.restaurant,modules.pharmacy,modules.doctor,modules.hotel,modules.taxi}',true),
        ('finance_manager','Finance Manager','Payouts, commissions, refunds and financial reports','{dashboard.view,orders.view,orders.refund,finance.view,finance.payouts,finance.reports,wallet.audit,audit.logs}',true),
        ('support_agent','Support Agent','Customer and seller support, read-only elsewhere','{dashboard.view,orders.view,users.view,sellers.view,support.view,support.respond,kyc.view}',true),
        ('product_manager','Product Manager','Catalogue, content and promotions','{dashboard.view,sellers.view,content.view,content.manage,promotions.manage,modules.marketplace,modules.grocery}',true)
      ON CONFLICT ("key") DO NOTHING
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "admin_role_id"`);
    await q.query(`DROP TABLE IF EXISTS "admin"."admin_roles"`);
  }
}
