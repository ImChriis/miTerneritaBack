import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

/**
 * Imagenes publicas en Cloudflare R2 (API compatible con S3). Activo solo con
 * las cinco variables; sin ellas las imagenes van al disco (local). Se leen de
 * process.env al cargar el modulo: en Render deben ser variables reales.
 */
const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_PUBLIC_URL,
} = process.env;

export const R2_ACTIVO = Boolean(
  R2_ACCOUNT_ID &&
  R2_ACCESS_KEY_ID &&
  R2_SECRET_ACCESS_KEY &&
  R2_BUCKET &&
  R2_PUBLIC_URL,
);

const cliente = R2_ACTIVO
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID!,
        secretAccessKey: R2_SECRET_ACCESS_KEY!,
      },
    })
  : null;

/** `key` = ruta relativa a la carpeta de imagenes ("galeria/<uuid>.webp"). */
export async function subirR2(key: string, body: Buffer): Promise<void> {
  await cliente!.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: 'image/webp',
      // Los nombres en R2 llevan sufijo aleatorio: nunca cambian de contenido.
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
}

export async function borrarR2(key: string): Promise<void> {
  await cliente!.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
}

export const urlR2 = (key: string) =>
  `${R2_PUBLIC_URL!.replace(/\/+$/, '')}/${key}`;
