// Sube src/assets/img (y galeria/) a Cloudflare R2 con los mismos nombres, asi
// la BD no cambia. Se salta lo que ya esta en el bucket. Reejecutable.
// Uso: node --env-file=.env scripts/subir-imagenes-r2.mjs   (necesita las R2_* en .env)
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } =
  process.env;
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
  console.error('Faltan R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY o R2_BUCKET');
  process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

const RAIZ = join(process.cwd(), 'src', 'assets', 'img');
const TIPOS = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.gif': 'image/gif', '.avif': 'image/avif' };

const archivos = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? archivos(p) : TIPOS[extname(n).toLowerCase()] ? [p] : [];
  });

let subidas = 0, saltadas = 0, fallos = 0;
for (const p of archivos(RAIZ)) {
  const Key = relative(RAIZ, p).split(sep).join('/');
  try {
    await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key }));
    saltadas++;
    continue;
  } catch (e) {
    if (e?.$metadata?.httpStatusCode !== 404) { fallos++; console.error('ERROR', Key, e.message); continue; }
  }
  try {
    await s3.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key, Body: readFileSync(p), ContentType: TIPOS[extname(p).toLowerCase()], CacheControl: 'public, max-age=86400' }));
    subidas++;
    console.log('subida', Key);
  } catch (e) {
    fallos++;
    console.error('ERROR', Key, e.message);
  }
}
console.log(`\nListo: ${subidas} subidas, ${saltadas} ya estaban, ${fallos} con error.`);
process.exit(fallos ? 1 : 0);
