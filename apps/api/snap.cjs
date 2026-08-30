const { Client } = require('pg');
(async () => {
  const c = new Client({ host:'127.0.0.1', port:5432, user:'postgres', password:'kartseek123', database:'kartseek_db' });
  await c.connect();
  const r = await c.query(`
    SELECT table_name||'.'||column_name||' '||data_type||coalesce('('||character_maximum_length||')','')
           ||' null='||is_nullable||' def='||coalesce(column_default,'-') AS d
    FROM information_schema.columns
    WHERE table_schema='marketplace' AND table_name IN ('flash_deals','flash_deal_nominations')
    ORDER BY table_name, ordinal_position`);
  console.log(r.rows.map(x=>x.d).join('\n'));
  await c.end();
})().catch(e=>{console.error(e.message);process.exit(1);});
