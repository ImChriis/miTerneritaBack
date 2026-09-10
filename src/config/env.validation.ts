import { Logger } from '@nestjs/common';

const REQUIRED_VARS = [
  'DATABASE_HOST',
  'DATABASE_PORT',
  'DATABASE_USER',
  'DATABASE_NAME',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
] as const;

/**
 * Valida la configuración al arrancar en vez de fallar más tarde con un
 * error opaco (por ejemplo, passport-jwt reventando porque JWT_SECRET
 * llegó como undefined).
 */
export function validateEnv(config: Record<string, unknown>) {
  const logger = new Logger('EnvValidation');

  // DATABASE_PASSWORD se comprueba aparte: debe estar declarada, pero se
  // admite vacia (habitual en entornos locales con root sin contrasena).
  const allRequired = [...REQUIRED_VARS, 'DATABASE_PASSWORD'] as const;

  const missing = allRequired.filter((key) => {
    if (key === 'DATABASE_PASSWORD') {
      return config[key] === undefined;
    }
    const value = config[key];
    return value === undefined || `${value as string}`.trim() === '';
  });

  if (missing.length > 0) {
    throw new Error(
      `Faltan variables de entorno obligatorias: ${missing.join(', ')}. Revisa tu archivo .env (ver .env.example).`,
    );
  }

  const jwtSecret = `${config.JWT_SECRET as string}`;
  if (jwtSecret.length < 32) {
    logger.warn(
      'JWT_SECRET tiene menos de 32 caracteres. Usa un secreto largo y aleatorio en producción.',
    );
  }

  if (
    !config.CORS_ORIGINS ||
    `${config.CORS_ORIGINS as string}`.trim() === ''
  ) {
    logger.warn(
      'CORS_ORIGINS no está definido: la API aceptará peticiones de cualquier origen.',
    );
  }

  return config;
}
