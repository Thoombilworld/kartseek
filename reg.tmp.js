const { Client } = require('pg');
(async () => {
  const c = new Client({ host:'127.0.0.1', port:5432, user:'postgres', password:'kartseek123', database:'kartseek_db' });
  await c.connect();
  const r = await c.query(`SELECT COALESCE("regionCode",'(null)') rc, count(*) n FROM grocery.grocery_stores GROUP BY 1 ORDER BY 2 DESC`);
  console.log('stores by regionCode:'); r.rows.forEach(x => console.log(`  ${x.rc.padEnd(10)} ${x.n}`));
  const i = await c.query(`SELECT s."regionCode" rc, count(it.*) n FROM grocery.grocery_items it JOIN grocery.grocery_stores s ON s.id=it."storeId" GROUP BY 1 ORDER BY 2 DESC`);
  console.log('\nitems by store regionCode:'); i.rows.forEach(x => console.log(`  ${String(x.rc).padEnd(10)} ${x.n}`));
  const cat = await c.query(`SELECT count(*) n FROM grocery.grocery_categories WHERE "isActive" IS NOT FALSE`);
  console.log('\nactive categories:', cat.rows[0].n);
  await c.end();
})().catch(e => console.error('FATAL', e.message));
