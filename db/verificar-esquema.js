/* eslint-disable */
// Comprueba, SOLO LEYENDO, si una base de datos tiene todo lo que necesita el
// codigo: compara las entidades de TypeORM (compiladas en dist/) con el esquema
// real, y revisa los ajustes de TiDB de los que depende la concurrencia.
//
// Uso (desde la raiz del proyecto, con dist/ compilado: pnpm run build):
//   node db/verificar-esquema.js            -> la BD de .env (DATABASE_*)
//   node db/verificar-esquema.js --tidb     -> la BD de TIDB_HOST, TIDB_PORT,
//                                              TIDB_USER, TIDB_PASSWORD y
//                                              TIDB_DATABASE (entorno o .env), con TLS
//
// Sale con codigo 1 si encuentra algo que haria fallar al codigo.
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { DataSource } = require('typeorm');

const RAIZ = path.join(__dirname, '..');
const leerEnv = () => {
  const fichero = path.join(RAIZ, '.env');
  if (!fs.existsSync(fichero)) return {};
  return Object.fromEntries(
    fs.readFileSync(fichero, 'utf8').split(/\r?\n/)
      .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
      .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
  );
};
const env = { ...leerEnv(), ...process.env };
const tidb = process.argv.includes('--tidb');
const conexion = tidb
  ? { host: env.TIDB_HOST, port: +(env.TIDB_PORT || 4000), user: env.TIDB_USER, password: env.TIDB_PASSWORD, database: env.TIDB_DATABASE, ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true } }
  : { host: env.DATABASE_HOST, port: +env.DATABASE_PORT, user: env.DATABASE_USER, password: env.DATABASE_PASSWORD, database: env.DATABASE_NAME };

const errores = [], avisos = [], bien = [];
const error = (m) => errores.push(m), aviso = (m) => avisos.push(m), ok = (m) => bien.push(m);

/** Entidades compiladas en dist/, igual que las carga el servidor. */
function entidades() {
  const dist = path.join(RAIZ, 'dist');
  if (!fs.existsSync(dist)) throw new Error('No existe dist/: ejecuta antes pnpm run build');
  const clases = [];
  const recorrer = (dir) => {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, f.name);
      if (f.isDirectory()) recorrer(p);
      else if (f.name.endsWith('.entity.js')) clases.push(...Object.values(require(p)).filter((v) => typeof v === 'function'));
    }
  };
  recorrer(dist);
  return clases;
}

const ENTEROS = new Set(['int', 'integer', 'tinyint', 'smallint', 'mediumint', 'bigint']);

(async () => {
  if (!conexion.host || !conexion.database) {
    throw new Error(tidb ? 'Faltan TIDB_HOST / TIDB_DATABASE (y usuario y contrasena) en el entorno o en .env' : 'Faltan DATABASE_* en .env');
  }
  // TypeORM calcula las columnas esperadas sin conectarse a nada.
  const ds = new DataSource({ type: 'mysql', database: conexion.database, entities: entidades() });
  await ds.buildMetadatas();

  const db = await mysql.createConnection(conexion);
  const q = async (sql, p) => (await db.query(sql, p))[0];
  console.log(`Base de datos: ${conexion.host}/${conexion.database}${tidb ? ' (TLS)' : ''}\n`);

  // ---------- Servidor ----------
  const [{ version }] = await q('SELECT VERSION() AS version');
  const esTidb = /tidb/i.test(version);
  console.log(`Servidor: ${version}`);
  const variable = async (nombre) => { try { return (await q(`SELECT @@${nombre} AS v`))[0].v; } catch { return undefined; } };
  const sqlMode = await variable('sql_mode');
  console.log(`sql_mode: ${sqlMode}`);
  console.log(`time_zone: ${await variable('time_zone')}`);
  if (esTidb) {
    const modo = await variable('tidb_txn_mode');
    console.log(`tidb_txn_mode: ${modo || '(vacio = pessimistic)'}`);
    if (modo && modo !== 'pessimistic') error(`tidb_txn_mode = ${modo}: los SELECT ... FOR UPDATE no bloquean y se podria vender por encima del aforo o gastar dos veces un QR. Debe ser pessimistic.`);
    else ok('Transacciones pesimistas: los bloqueos de aforo y de escaneo funcionan');
    const fk = await variable('tidb_enable_foreign_key');
    console.log(`tidb_enable_foreign_key: ${fk ?? '(no existe en esta version: las FOREIGN KEY se aceptan pero no se aplican)'}`);
  }
  if (!/STRICT_TRANS_TABLES|STRICT_ALL_TABLES/.test(sqlMode || '')) aviso('Sin modo estricto: los textos largos se recortan en silencio en vez de dar error.');
  console.log('');

  // ---------- Tablas y columnas ----------
  const columnasBD = await q(
    `SELECT TABLE_NAME t, COLUMN_NAME c, DATA_TYPE tipo, COLUMN_TYPE ct, COLUMN_KEY k, IS_NULLABLE nul, COLUMN_DEFAULT def, EXTRA extra, CHARACTER_MAXIMUM_LENGTH len
     FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ?`, [conexion.database]);
  const porTabla = new Map();
  for (const c of columnasBD) {
    const t = c.t.toLowerCase();
    if (!porTabla.has(t)) porTabla.set(t, new Map());
    porTabla.get(t).set(c.c.toLowerCase(), c);
  }

  for (const meta of ds.entityMetadatas) {
    const tabla = meta.tableName;
    const cols = porTabla.get(tabla.toLowerCase());
    if (!cols) { error(`Falta la tabla ${tabla}`); continue; }
    const mapeadas = new Set();
    for (const col of meta.columns) {
      const nombre = col.databaseName;
      mapeadas.add(nombre.toLowerCase());
      const bd = cols.get(nombre.toLowerCase());
      if (!bd) { error(`Falta la columna ${tabla}.${nombre}`); continue; }
      if (col.isPrimary && bd.k !== 'PRI') error(`${tabla}.${nombre} no es PRIMARY KEY: sin indice, las FOREIGN KEY hacia ${tabla} no se pueden crear`);
      if (col.isGenerated && col.generationStrategy === 'increment' && !/auto_increment/i.test(bd.extra || '')) error(`${tabla}.${nombre} no es AUTO_INCREMENT: cada INSERT en ${tabla} falla`);
      const esperado = String(ds.driver.normalizeType(col)).toLowerCase();
      const real = String(bd.tipo).toLowerCase();
      const compatibles = esperado === real
        || (ENTEROS.has(esperado) && ENTEROS.has(real))
        || (esperado === 'boolean' && real === 'tinyint')
        || (['varchar', 'char', 'text'].includes(esperado) && ['varchar', 'char', 'text', 'mediumtext', 'longtext'].includes(real));
      if (!compatibles) aviso(`${tabla}.${nombre}: el codigo espera ${esperado} y la BD tiene ${bd.ct}`);
      if (esperado === 'enum' && col.enum) {
        const valores = [...bd.ct.matchAll(/'((?:[^']|'')*)'/g)].map((m) => m[1]);
        const faltan = col.enum.map(String).filter((v) => !valores.includes(v));
        if (faltan.length) error(`${tabla}.${nombre}: la BD no acepta los valores ${faltan.join(', ')} (tiene ${bd.ct})`);
      }
      if (col.length && bd.len && Number(bd.len) < Number(col.length)) aviso(`${tabla}.${nombre}: la BD admite ${bd.len} caracteres y el codigo hasta ${col.length}`);
      if (col.isNullable && !col.relationMetadata && bd.nul === 'NO' && bd.def === null && !col.isPrimary) aviso(`${tabla}.${nombre}: el codigo la deja vacia pero la BD es NOT NULL`);
    }
    // Columnas que el codigo no escribe y que la BD exige: cada INSERT fallaria en modo estricto.
    for (const [nombre, bd] of cols) {
      if (mapeadas.has(nombre)) continue;
      if (bd.nul === 'NO' && bd.def === null && !/auto_increment/i.test(bd.extra || '')) {
        error(`${tabla}.${bd.c} es NOT NULL sin DEFAULT y el codigo no la escribe: los INSERT fallan en modo estricto${nombre === 'quantity' ? ' (paso 1 de db/tidb-produccion.sql)' : ''}`);
      }
    }
  }

  // ---------- Migraciones de 2026-09 ----------
  const indices = await q(`SELECT TABLE_NAME t, INDEX_NAME i FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ?`, [conexion.database]);
  const hayIndice = (t, i) => indices.some((x) => x.t.toLowerCase() === t && x.i === i);
  const hayCol = (t, c) => porTabla.get(t)?.has(c.toLowerCase());
  const pd = porTabla.get('paymentdetails');
  const estado = [
    ['2026-09-10 quantity con DEFAULT', !pd?.has('quantity') || pd.get('quantity').def !== null || pd.get('quantity').nul === 'YES'],
    ['2026-09-17 document_sequence', porTabla.has('document_sequence')],
    ['2026-09-17 indice unico noDocumento', hayIndice('payment', 'uq_payment_noDocumento')],
    ['2026-09-23 paymentdetails.usadas', hayCol('paymentdetails', 'usadas')],
    ['2026-09-23 scan_log y scan_log_detail', porTabla.has('scan_log') && porTabla.has('scan_log_detail')],
    ['2026-10-28 catalogo de consumo (detalle, categoria, orden)', hayCol('food', 'detalle') && hayCol('food', 'orden') && hayCol('drinks', 'categoria') && hayCol('drinks', 'orden')],
  ];
  console.log('Migraciones:');
  for (const [nombre, aplicada] of estado) console.log(`  ${aplicada ? '[x]' : '[ ]'} ${nombre}`);
  console.log('');

  const fecha = porTabla.get('payment')?.get('date');
  if (fecha && /on update/i.test(fecha.extra || '')) error('payment.date tiene ON UPDATE: la fecha de compra cambia al aprobar o rechazar (paso 2.2)');

  // ---------- Datos ----------
  if (hayCol('payment', 'noDocumento')) {
    const [{ n }] = await q('SELECT COUNT(*) n FROM (SELECT noDocumento FROM payment WHERE noDocumento IS NOT NULL GROUP BY noDocumento HAVING COUNT(*) > 1) d');
    if (Number(n) > 0 && !hayIndice('payment', 'uq_payment_noDocumento')) aviso(`${n} numeros de documento repetidos: el paso 2.3 los renumera antes de crear el indice unico`);
    if (porTabla.has('document_sequence')) {
      const fila = (await q("SELECT `last_value` v FROM document_sequence WHERE name = 'payment'"))[0];
      const [{ m }] = await q("SELECT COALESCE(MAX(CAST(noDocumento AS UNSIGNED)), 0) m FROM payment WHERE noDocumento REGEXP '^[0-9]{7}$'");
      if (!fila) error("document_sequence no tiene la fila 'payment': las compras fallan (paso 2.4)");
      else if (Number(fila.v) < Number(m)) error(`El contador (${fila.v}) va por detras del numero mas alto (${m}): las compras daran numero repetido. Repite el paso 2.4`);
      else ok(`Contador de documentos en ${fila.v} (numero mas alto: ${m})`);
    }
  }
  const [{ pagos }] = await q('SELECT COUNT(*) pagos FROM payment');
  console.log(`Pagos en la BD: ${pagos}`);

  // ---------- Imagenes ----------
  // Se sirven desde src/assets/img (/assets/img/<archivo>). En Render el disco
  // no es persistente: solo sobreviven las imagenes que estan en el repositorio.
  const carpeta = path.join(RAIZ, 'src', 'assets', 'img');
  const enDisco = new Set(fs.existsSync(carpeta) ? fs.readdirSync(carpeta) : []);
  const imagenes = [];
  for (const [tabla, cols] of [['events', ['flyer', 'image1', 'image2', 'image3']], ['food', ['image']], ['drinks', ['image']]]) {
    for (const c of cols) {
      if (!hayCol(tabla, c)) continue;
      for (const f of await q(`SELECT DISTINCT \`${c}\` f FROM \`${tabla}\` WHERE \`${c}\` IS NOT NULL AND \`${c}\` <> ''`)) imagenes.push(`${tabla}.${c}: ${f.f}`);
    }
  }
  const perdidas = imagenes.filter((i) => !enDisco.has(path.basename(i.split(': ')[1])));
  if (perdidas.length) aviso(`${perdidas.length} de ${imagenes.length} imagenes de la BD no estan en src/assets/img (darian 404): ${perdidas.slice(0, 5).join(' | ')}${perdidas.length > 5 ? ' ...' : ''}`);
  else if (imagenes.length) ok(`Las ${imagenes.length} imagenes de la BD estan en src/assets/img`);

  await db.end();

  console.log('');
  for (const m of bien) console.log(`OK     ${m}`);
  for (const m of avisos) console.log(`AVISO  ${m}`);
  for (const m of errores) console.log(`ERROR  ${m}`);
  console.log(`\n${errores.length ? 'NO LISTA' : 'LISTA'} para este codigo: ${errores.length} errores, ${avisos.length} avisos.`);
  process.exit(errores.length ? 1 : 0);
})().catch((e) => { console.error('No se pudo verificar:', e.message); process.exit(2); });
