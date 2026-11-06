-- Carta de consumo de Mi Ternerita: descripcion corta, categoria, orden y
-- personas con acceso incluido; los 39 productos (6 comidas, 29 bebidas con
-- alcohol y 4 sin) con precio en USD, descripcion y disponibilidad tomados de
-- miternerita.club; y se retiran de la carta los productos anteriores.
--
-- Aditiva: el codigo anterior ignora las columnas nuevas, asi que puede
-- aplicarse antes de desplegar. Se puede ejecutar mas de una vez: las columnas
-- usan IF NOT EXISTS y cada producto se busca por nombre antes de insertarlo.
-- Ojo: volver a ejecutarlo devuelve precios y disponibilidad a los de esta
-- carta (pisaria cambios hechos despues desde el panel de admin).
--
-- - Fotos: src/assets/img/consumo-<categoria>-<orden>-<producto>.webp.
-- - Columna `description`: es el NOMBRE del producto (nombre historico; el
--   panel de admin ya la usa asi). La descripcion corta es `detalle`.
-- - drinks.personas: personas a las que la botella da acceso General
--   (Old Parr Silver = 6). 0 = no incluye acceso.

-- 1) Columnas
ALTER TABLE `food` ADD COLUMN IF NOT EXISTS `detalle` VARCHAR(255) NULL AFTER `description`;
ALTER TABLE `food` ADD COLUMN IF NOT EXISTS `orden` INT NOT NULL DEFAULT 0;
ALTER TABLE `drinks` ADD COLUMN IF NOT EXISTS `detalle` VARCHAR(255) NULL AFTER `description`;
ALTER TABLE `drinks` ADD COLUMN IF NOT EXISTS `categoria` VARCHAR(50) NOT NULL DEFAULT 'Con alcohol' AFTER `detalle`;
ALTER TABLE `drinks` ADD COLUMN IF NOT EXISTS `orden` INT NOT NULL DEFAULT 0;
ALTER TABLE `drinks` ADD COLUMN IF NOT EXISTS `personas` INT NOT NULL DEFAULT 0;

-- 2) Productos (orden = numero de la foto dentro de su carpeta)
-- Empanadas Mi Vaquita
UPDATE `food` SET `detalle` = '4 unidades de empanadas, acompañadas con salsa de miel mostaza.', `orden` = 1, `image` = 'consumo-comidas-01-empanadas-mi-vaquita.webp', `price` = 14.00, `status` = 1 WHERE `description` = 'Empanadas Mi Vaquita' AND `activo` = 1;
INSERT INTO `food` (`description`, `detalle`, `orden`, `image`, `price`, `status`)
  SELECT 'Empanadas Mi Vaquita', '4 unidades de empanadas, acompañadas con salsa de miel mostaza.', 1, 'consumo-comidas-01-empanadas-mi-vaquita.webp', 14.00, 1 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `food` WHERE `description` = 'Empanadas Mi Vaquita' AND `activo` = 1);
-- Nachos Ternera
UPDATE `food` SET `detalle` = 'Hojuelas de maíz, chili con carne, caraotas, pico de gallo, nata y queso cheddar fundido.', `orden` = 2, `image` = 'consumo-comidas-02-nachos-ternera.webp', `price` = 22.04, `status` = 1 WHERE `description` = 'Nachos Ternera' AND `activo` = 1;
INSERT INTO `food` (`description`, `detalle`, `orden`, `image`, `price`, `status`)
  SELECT 'Nachos Ternera', 'Hojuelas de maíz, chili con carne, caraotas, pico de gallo, nata y queso cheddar fundido.', 2, 'consumo-comidas-02-nachos-ternera.webp', 22.04, 1 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `food` WHERE `description` = 'Nachos Ternera' AND `activo` = 1);
-- Servicio de Tequeños
UPDATE `food` SET `detalle` = 'Seis (6) unidades', `orden` = 3, `image` = 'consumo-comidas-03-servicio-de-tequenos.webp', `price` = 11.60, `status` = 1 WHERE `description` = 'Servicio de Tequeños' AND `activo` = 1;
INSERT INTO `food` (`description`, `detalle`, `orden`, `image`, `price`, `status`)
  SELECT 'Servicio de Tequeños', 'Seis (6) unidades', 3, 'consumo-comidas-03-servicio-de-tequenos.webp', 11.60, 1 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `food` WHERE `description` = 'Servicio de Tequeños' AND `activo` = 1);
-- Mozzarella Sticks
UPDATE `food` SET `detalle` = 'Barritas de Mozzarella empanizadas, con salsa de la casa.', `orden` = 4, `image` = 'consumo-comidas-04-mozzarella-sticks.webp', `price` = 10.44, `status` = 1 WHERE `description` = 'Mozzarella Sticks' AND `activo` = 1;
INSERT INTO `food` (`description`, `detalle`, `orden`, `image`, `price`, `status`)
  SELECT 'Mozzarella Sticks', 'Barritas de Mozzarella empanizadas, con salsa de la casa.', 4, 'consumo-comidas-04-mozzarella-sticks.webp', 10.44, 1 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `food` WHERE `description` = 'Mozzarella Sticks' AND `activo` = 1);
-- Hamburguesa MT Cheddar & Bacon
UPDATE `food` SET `detalle` = '220gr. de carne de res premium, queso cheddar, bacon, salsa BBQ, tomate, cebolla caramelizada y coleslaw', `orden` = 5, `image` = 'consumo-comidas-05-hamburguesa-mt-cheddar-bacon.webp', `price` = 15.08, `status` = 1 WHERE `description` = 'Hamburguesa MT Cheddar & Bacon' AND `activo` = 1;
INSERT INTO `food` (`description`, `detalle`, `orden`, `image`, `price`, `status`)
  SELECT 'Hamburguesa MT Cheddar & Bacon', '220gr. de carne de res premium, queso cheddar, bacon, salsa BBQ, tomate, cebolla caramelizada y coleslaw', 5, 'consumo-comidas-05-hamburguesa-mt-cheddar-bacon.webp', 15.08, 1 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `food` WHERE `description` = 'Hamburguesa MT Cheddar & Bacon' AND `activo` = 1);
-- Crispy Chicken Sandwich
UPDATE `food` SET `detalle` = '150gr. de pechuga de pollo empanizada, coleslaw, sriracha y mostaza dijon.', `orden` = 6, `image` = 'consumo-comidas-06-crispy-chicken-sandwich.webp', `price` = 15.08, `status` = 1 WHERE `description` = 'Crispy Chicken Sandwich' AND `activo` = 1;
INSERT INTO `food` (`description`, `detalle`, `orden`, `image`, `price`, `status`)
  SELECT 'Crispy Chicken Sandwich', '150gr. de pechuga de pollo empanizada, coleslaw, sriracha y mostaza dijon.', 6, 'consumo-comidas-06-crispy-chicken-sandwich.webp', 15.08, 1 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `food` WHERE `description` = 'Crispy Chicken Sandwich' AND `activo` = 1);
-- Vodka Smirnoff Spicy Tamarind
UPDATE `drinks` SET `detalle` = 'Incluye refresco y zumo de limón · Presentación de 0,75 L', `categoria` = 'Con alcohol', `personas` = 4, `orden` = 1, `image` = 'consumo-con-alcohol-01-vodka-smirnoff-spicy-tamarind.webp', `price` = 55.00, `status` = 0 WHERE `description` = 'Vodka Smirnoff Spicy Tamarind' AND `activo` = 1;
INSERT INTO `drinks` (`description`, `detalle`, `categoria`, `personas`, `orden`, `image`, `price`, `status`)
  SELECT 'Vodka Smirnoff Spicy Tamarind', 'Incluye refresco y zumo de limón · Presentación de 0,75 L', 'Con alcohol', 4, 1, 'consumo-con-alcohol-01-vodka-smirnoff-spicy-tamarind.webp', 55.00, 0 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `drinks` WHERE `description` = 'Vodka Smirnoff Spicy Tamarind' AND `activo` = 1);
-- Vodka Smirnoff XXI
UPDATE `drinks` SET `detalle` = 'Incluye refresco y zumo de limón · Presentación de 0,75 L', `categoria` = 'Con alcohol', `personas` = 0, `orden` = 2, `image` = 'consumo-con-alcohol-02-vodka-smirnoff-xxi.webp', `price` = 60.00, `status` = 1 WHERE `description` = 'Vodka Smirnoff XXI' AND `activo` = 1;
INSERT INTO `drinks` (`description`, `detalle`, `categoria`, `personas`, `orden`, `image`, `price`, `status`)
  SELECT 'Vodka Smirnoff XXI', 'Incluye refresco y zumo de limón · Presentación de 0,75 L', 'Con alcohol', 0, 2, 'consumo-con-alcohol-02-vodka-smirnoff-xxi.webp', 60.00, 1 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `drinks` WHERE `description` = 'Vodka Smirnoff XXI' AND `activo` = 1);
-- Santa Teresa Linaje
UPDATE `drinks` SET `detalle` = 'Incluye refresco y zumo de limón · Presentación de 0,75 L', `categoria` = 'Con alcohol', `personas` = 0, `orden` = 3, `image` = 'consumo-con-alcohol-03-santa-teresa-linaje.webp', `price` = 60.00, `status` = 1 WHERE `description` = 'Santa Teresa Linaje' AND `activo` = 1;
INSERT INTO `drinks` (`description`, `detalle`, `categoria`, `personas`, `orden`, `image`, `price`, `status`)
  SELECT 'Santa Teresa Linaje', 'Incluye refresco y zumo de limón · Presentación de 0,75 L', 'Con alcohol', 0, 3, 'consumo-con-alcohol-03-santa-teresa-linaje.webp', 60.00, 1 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `drinks` WHERE `description` = 'Santa Teresa Linaje' AND `activo` = 1);
-- Old Parr Silver
UPDATE `drinks` SET `detalle` = 'Incluye soda y agua · Presentación de 0,75 L', `categoria` = 'Con alcohol', `personas` = 6, `orden` = 4, `image` = 'consumo-con-alcohol-04-old-parr-silver.webp', `price` = 75.00, `status` = 1 WHERE `description` = 'Old Parr Silver' AND `activo` = 1;
INSERT INTO `drinks` (`description`, `detalle`, `categoria`, `personas`, `orden`, `image`, `price`, `status`)
  SELECT 'Old Parr Silver', 'Incluye soda y agua · Presentación de 0,75 L', 'Con alcohol', 6, 4, 'consumo-con-alcohol-04-old-parr-silver.webp', 75.00, 1 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `drinks` WHERE `description` = 'Old Parr Silver' AND `activo` = 1);
-- Santa Teresa 1796
UPDATE `drinks` SET `detalle` = 'Incluye refresco de 1.5 litros y zumo de limón · Presentación de 0,75 L', `categoria` = 'Con alcohol', `personas` = 0, `orden` = 5, `image` = 'consumo-con-alcohol-05-santa-teresa-1796.webp', `price` = 90.00, `status` = 1 WHERE `description` = 'Santa Teresa 1796' AND `activo` = 1;
INSERT INTO `drinks` (`description`, `detalle`, `categoria`, `personas`, `orden`, `image`, `price`, `status`)
  SELECT 'Santa Teresa 1796', 'Incluye refresco de 1.5 litros y zumo de limón · Presentación de 0,75 L', 'Con alcohol', 0, 5, 'consumo-con-alcohol-05-santa-teresa-1796.webp', 90.00, 1 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `drinks` WHERE `description` = 'Santa Teresa 1796' AND `activo` = 1);
-- Buchanan's 12 Años
UPDATE `drinks` SET `detalle` = 'Incluye soda y agua · Presentación de 0,75 L', `categoria` = 'Con alcohol', `personas` = 7, `orden` = 6, `image` = 'consumo-con-alcohol-06-buchanans-12-anos.webp', `price` = 100.00, `status` = 1 WHERE `description` = 'Buchanan''s 12 Años' AND `activo` = 1;
INSERT INTO `drinks` (`description`, `detalle`, `categoria`, `personas`, `orden`, `image`, `price`, `status`)
  SELECT 'Buchanan''s 12 Años', 'Incluye soda y agua · Presentación de 0,75 L', 'Con alcohol', 7, 6, 'consumo-con-alcohol-06-buchanans-12-anos.webp', 100.00, 1 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `drinks` WHERE `description` = 'Buchanan''s 12 Años' AND `activo` = 1);
-- Old Parr 12 Años
UPDATE `drinks` SET `detalle` = 'Incluye soda y agua · Presentación de 0,75 L', `categoria` = 'Con alcohol', `personas` = 7, `orden` = 7, `image` = 'consumo-con-alcohol-07-old-parr-12-anos.webp', `price` = 100.00, `status` = 1 WHERE `description` = 'Old Parr 12 Años' AND `activo` = 1;
INSERT INTO `drinks` (`description`, `detalle`, `categoria`, `personas`, `orden`, `image`, `price`, `status`)
  SELECT 'Old Parr 12 Años', 'Incluye soda y agua · Presentación de 0,75 L', 'Con alcohol', 7, 7, 'consumo-con-alcohol-07-old-parr-12-anos.webp', 100.00, 1 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `drinks` WHERE `description` = 'Old Parr 12 Años' AND `activo` = 1);
-- Johnnie Walker Black
UPDATE `drinks` SET `detalle` = 'Incluye soda y agua · Presentación 0,75 L', `categoria` = 'Con alcohol', `personas` = 7, `orden` = 8, `image` = 'consumo-con-alcohol-08-johnnie-walker-black.webp', `price` = 100.00, `status` = 1 WHERE `description` = 'Johnnie Walker Black' AND `activo` = 1;
INSERT INTO `drinks` (`description`, `detalle`, `categoria`, `personas`, `orden`, `image`, `price`, `status`)
  SELECT 'Johnnie Walker Black', 'Incluye soda y agua · Presentación 0,75 L', 'Con alcohol', 7, 8, 'consumo-con-alcohol-08-johnnie-walker-black.webp', 100.00, 1 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `drinks` WHERE `description` = 'Johnnie Walker Black' AND `activo` = 1);
-- Buchanan's Master
UPDATE `drinks` SET `detalle` = 'Acompañada con soda y agua · Presentación de 0,75 L', `categoria` = 'Con alcohol', `personas` = 7, `orden` = 9, `image` = 'consumo-con-alcohol-09-buchanans-master.webp', `price` = 120.00, `status` = 1 WHERE `description` = 'Buchanan''s Master' AND `activo` = 1;
INSERT INTO `drinks` (`description`, `detalle`, `categoria`, `personas`, `orden`, `image`, `price`, `status`)
  SELECT 'Buchanan''s Master', 'Acompañada con soda y agua · Presentación de 0,75 L', 'Con alcohol', 7, 9, 'consumo-con-alcohol-09-buchanans-master.webp', 120.00, 1 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `drinks` WHERE `description` = 'Buchanan''s Master' AND `activo` = 1);
-- Buchanan's 18 Años
UPDATE `drinks` SET `detalle` = 'Acompañada con soda y agua · Presentación de 0,75 L', `categoria` = 'Con alcohol', `personas` = 0, `orden` = 10, `image` = 'consumo-con-alcohol-10-buchanans-18-anos.webp', `price` = 160.00, `status` = 1 WHERE `description` = 'Buchanan''s 18 Años' AND `activo` = 1;
INSERT INTO `drinks` (`description`, `detalle`, `categoria`, `personas`, `orden`, `image`, `price`, `status`)
  SELECT 'Buchanan''s 18 Años', 'Acompañada con soda y agua · Presentación de 0,75 L', 'Con alcohol', 0, 10, 'consumo-con-alcohol-10-buchanans-18-anos.webp', 160.00, 1 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `drinks` WHERE `description` = 'Buchanan''s 18 Años' AND `activo` = 1);
-- Tequila Don Julio Blanco
UPDATE `drinks` SET `detalle` = 'Incluye limón y sal · Presentación de 0,75 L', `categoria` = 'Con alcohol', `personas` = 0, `orden` = 11, `image` = 'consumo-con-alcohol-11-tequila-don-julio-blanco.webp', `price` = 145.00, `status` = 1 WHERE `description` = 'Tequila Don Julio Blanco' AND `activo` = 1;
INSERT INTO `drinks` (`description`, `detalle`, `categoria`, `personas`, `orden`, `image`, `price`, `status`)
  SELECT 'Tequila Don Julio Blanco', 'Incluye limón y sal · Presentación de 0,75 L', 'Con alcohol', 0, 11, 'consumo-con-alcohol-11-tequila-don-julio-blanco.webp', 145.00, 1 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `drinks` WHERE `description` = 'Tequila Don Julio Blanco' AND `activo` = 1);
-- Tequila Don Julio Reposado
UPDATE `drinks` SET `detalle` = 'Incluye limón y sal · Presentación de 0,75 L', `categoria` = 'Con alcohol', `personas` = 0, `orden` = 12, `image` = 'consumo-con-alcohol-12-tequila-don-julio-reposado.webp', `price` = 160.00, `status` = 1 WHERE `description` = 'Tequila Don Julio Reposado' AND `activo` = 1;
INSERT INTO `drinks` (`description`, `detalle`, `categoria`, `personas`, `orden`, `image`, `price`, `status`)
  SELECT 'Tequila Don Julio Reposado', 'Incluye limón y sal · Presentación de 0,75 L', 'Con alcohol', 0, 12, 'consumo-con-alcohol-12-tequila-don-julio-reposado.webp', 160.00, 1 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `drinks` WHERE `description` = 'Tequila Don Julio Reposado' AND `activo` = 1);
-- Tequila José Cuervo
UPDATE `drinks` SET `detalle` = 'Incluye limón y sal · Presentación de 0,75 L', `categoria` = 'Con alcohol', `personas` = 0, `orden` = 13, `image` = 'consumo-con-alcohol-13-tequila-jose-cuervo.webp', `price` = 80.00, `status` = 1 WHERE `description` = 'Tequila José Cuervo' AND `activo` = 1;
INSERT INTO `drinks` (`description`, `detalle`, `categoria`, `personas`, `orden`, `image`, `price`, `status`)
  SELECT 'Tequila José Cuervo', 'Incluye limón y sal · Presentación de 0,75 L', 'Con alcohol', 0, 13, 'consumo-con-alcohol-13-tequila-jose-cuervo.webp', 80.00, 1 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `drinks` WHERE `description` = 'Tequila José Cuervo' AND `activo` = 1);
-- Vino Viña Maipo
UPDATE `drinks` SET `detalle` = NULL, `categoria` = 'Con alcohol', `personas` = 0, `orden` = 14, `image` = 'consumo-con-alcohol-14-vino-vina-maipo.webp', `price` = 40.00, `status` = 1 WHERE `description` = 'Vino Viña Maipo' AND `activo` = 1;
INSERT INTO `drinks` (`description`, `detalle`, `categoria`, `personas`, `orden`, `image`, `price`, `status`)
  SELECT 'Vino Viña Maipo', NULL, 'Con alcohol', 0, 14, 'consumo-con-alcohol-14-vino-vina-maipo.webp', 40.00, 1 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `drinks` WHERE `description` = 'Vino Viña Maipo' AND `activo` = 1);
-- Smirnoff Ice
UPDATE `drinks` SET `detalle` = 'Presentación 275 ML', `categoria` = 'Con alcohol', `personas` = 0, `orden` = 15, `image` = 'consumo-con-alcohol-15-smirnoff-ice.webp', `price` = 10.00, `status` = 1 WHERE `description` = 'Smirnoff Ice' AND `activo` = 1;
INSERT INTO `drinks` (`description`, `detalle`, `categoria`, `personas`, `orden`, `image`, `price`, `status`)
  SELECT 'Smirnoff Ice', 'Presentación 275 ML', 'Con alcohol', 0, 15, 'consumo-con-alcohol-15-smirnoff-ice.webp', 10.00, 1 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `drinks` WHERE `description` = 'Smirnoff Ice' AND `activo` = 1);
-- Cerveza Zulia
UPDATE `drinks` SET `detalle` = NULL, `categoria` = 'Con alcohol', `personas` = 0, `orden` = 16, `image` = 'consumo-con-alcohol-16-cerveza-zulia.webp', `price` = 4.00, `status` = 1 WHERE `description` = 'Cerveza Zulia' AND `activo` = 1;
INSERT INTO `drinks` (`description`, `detalle`, `categoria`, `personas`, `orden`, `image`, `price`, `status`)
  SELECT 'Cerveza Zulia', NULL, 'Con alcohol', 0, 16, 'consumo-con-alcohol-16-cerveza-zulia.webp', 4.00, 1 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `drinks` WHERE `description` = 'Cerveza Zulia' AND `activo` = 1);
-- Cerveza Solera Azul
UPDATE `drinks` SET `detalle` = NULL, `categoria` = 'Con alcohol', `personas` = 0, `orden` = 17, `image` = 'consumo-con-alcohol-17-cerveza-solera-azul.webp', `price` = 4.00, `status` = 1 WHERE `description` = 'Cerveza Solera Azul' AND `activo` = 1;
INSERT INTO `drinks` (`description`, `detalle`, `categoria`, `personas`, `orden`, `image`, `price`, `status`)
  SELECT 'Cerveza Solera Azul', NULL, 'Con alcohol', 0, 17, 'consumo-con-alcohol-17-cerveza-solera-azul.webp', 4.00, 1 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `drinks` WHERE `description` = 'Cerveza Solera Azul' AND `activo` = 1);
-- Cerveza Solera Verde
UPDATE `drinks` SET `detalle` = NULL, `categoria` = 'Con alcohol', `personas` = 0, `orden` = 18, `image` = 'consumo-con-alcohol-18-cerveza-solera-verde.webp', `price` = 4.00, `status` = 1 WHERE `description` = 'Cerveza Solera Verde' AND `activo` = 1;
INSERT INTO `drinks` (`description`, `detalle`, `categoria`, `personas`, `orden`, `image`, `price`, `status`)
  SELECT 'Cerveza Solera Verde', NULL, 'Con alcohol', 0, 18, 'consumo-con-alcohol-18-cerveza-solera-verde.webp', 4.00, 1 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `drinks` WHERE `description` = 'Cerveza Solera Verde' AND `activo` = 1);
-- Cerveza Coronita
UPDATE `drinks` SET `detalle` = NULL, `categoria` = 'Con alcohol', `personas` = 0, `orden` = 19, `image` = 'consumo-con-alcohol-19-cerveza-coronita.webp', `price` = 6.00, `status` = 1 WHERE `description` = 'Cerveza Coronita' AND `activo` = 1;
INSERT INTO `drinks` (`description`, `detalle`, `categoria`, `personas`, `orden`, `image`, `price`, `status`)
  SELECT 'Cerveza Coronita', NULL, 'Con alcohol', 0, 19, 'consumo-con-alcohol-19-cerveza-coronita.webp', 6.00, 1 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `drinks` WHERE `description` = 'Cerveza Coronita' AND `activo` = 1);
-- Mojito Clásico
UPDATE `drinks` SET `detalle` = 'Pidelo de fresa, parchita o fresa', `categoria` = 'Con alcohol', `personas` = 0, `orden` = 20, `image` = 'consumo-con-alcohol-20-mojito-clasico.webp', `price` = 7.00, `status` = 1 WHERE `description` = 'Mojito Clásico' AND `activo` = 1;
INSERT INTO `drinks` (`description`, `detalle`, `categoria`, `personas`, `orden`, `image`, `price`, `status`)
  SELECT 'Mojito Clásico', 'Pidelo de fresa, parchita o fresa', 'Con alcohol', 0, 20, 'consumo-con-alcohol-20-mojito-clasico.webp', 7.00, 1 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `drinks` WHERE `description` = 'Mojito Clásico' AND `activo` = 1);
-- Cuba Libre
UPDATE `drinks` SET `detalle` = NULL, `categoria` = 'Con alcohol', `personas` = 0, `orden` = 21, `image` = 'consumo-con-alcohol-21-cuba-libre.webp', `price` = 7.00, `status` = 1 WHERE `description` = 'Cuba Libre' AND `activo` = 1;
INSERT INTO `drinks` (`description`, `detalle`, `categoria`, `personas`, `orden`, `image`, `price`, `status`)
  SELECT 'Cuba Libre', NULL, 'Con alcohol', 0, 21, 'consumo-con-alcohol-21-cuba-libre.webp', 7.00, 1 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `drinks` WHERE `description` = 'Cuba Libre' AND `activo` = 1);
-- Cosmopolitan
UPDATE `drinks` SET `detalle` = NULL, `categoria` = 'Con alcohol', `personas` = 0, `orden` = 22, `image` = 'consumo-con-alcohol-22-cosmopolitan.webp', `price` = 7.00, `status` = 1 WHERE `description` = 'Cosmopolitan' AND `activo` = 1;
INSERT INTO `drinks` (`description`, `detalle`, `categoria`, `personas`, `orden`, `image`, `price`, `status`)
  SELECT 'Cosmopolitan', NULL, 'Con alcohol', 0, 22, 'consumo-con-alcohol-22-cosmopolitan.webp', 7.00, 1 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `drinks` WHERE `description` = 'Cosmopolitan' AND `activo` = 1);
-- Martini
UPDATE `drinks` SET `detalle` = NULL, `categoria` = 'Con alcohol', `personas` = 0, `orden` = 23, `image` = 'consumo-con-alcohol-23-martini.webp', `price` = 7.00, `status` = 1 WHERE `description` = 'Martini' AND `activo` = 1;
INSERT INTO `drinks` (`description`, `detalle`, `categoria`, `personas`, `orden`, `image`, `price`, `status`)
  SELECT 'Martini', NULL, 'Con alcohol', 0, 23, 'consumo-con-alcohol-23-martini.webp', 7.00, 1 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `drinks` WHERE `description` = 'Martini' AND `activo` = 1);
-- Gin Tonic
UPDATE `drinks` SET `detalle` = NULL, `categoria` = 'Con alcohol', `personas` = 0, `orden` = 24, `image` = 'consumo-con-alcohol-24-gin-tonic.webp', `price` = 7.00, `status` = 1 WHERE `description` = 'Gin Tonic' AND `activo` = 1;
INSERT INTO `drinks` (`description`, `detalle`, `categoria`, `personas`, `orden`, `image`, `price`, `status`)
  SELECT 'Gin Tonic', NULL, 'Con alcohol', 0, 24, 'consumo-con-alcohol-24-gin-tonic.webp', 7.00, 1 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `drinks` WHERE `description` = 'Gin Tonic' AND `activo` = 1);
-- Paloma
UPDATE `drinks` SET `detalle` = 'Con tequila José Cuervo', `categoria` = 'Con alcohol', `personas` = 0, `orden` = 25, `image` = 'consumo-con-alcohol-25-paloma.webp', `price` = 7.00, `status` = 1 WHERE `description` = 'Paloma' AND `activo` = 1;
INSERT INTO `drinks` (`description`, `detalle`, `categoria`, `personas`, `orden`, `image`, `price`, `status`)
  SELECT 'Paloma', 'Con tequila José Cuervo', 'Con alcohol', 0, 25, 'consumo-con-alcohol-25-paloma.webp', 7.00, 1 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `drinks` WHERE `description` = 'Paloma' AND `activo` = 1);
-- Doña Paloma
UPDATE `drinks` SET `detalle` = NULL, `categoria` = 'Con alcohol', `personas` = 0, `orden` = 26, `image` = 'consumo-con-alcohol-26-dona-paloma.webp', `price` = 15.00, `status` = 1 WHERE `description` = 'Doña Paloma' AND `activo` = 1;
INSERT INTO `drinks` (`description`, `detalle`, `categoria`, `personas`, `orden`, `image`, `price`, `status`)
  SELECT 'Doña Paloma', NULL, 'Con alcohol', 0, 26, 'consumo-con-alcohol-26-dona-paloma.webp', 15.00, 1 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `drinks` WHERE `description` = 'Doña Paloma' AND `activo` = 1);
-- Margarita Clásica
UPDATE `drinks` SET `detalle` = 'Con Tequila José Cuervo', `categoria` = 'Con alcohol', `personas` = 0, `orden` = 27, `image` = 'consumo-con-alcohol-27-margarita-clasica.webp', `price` = 7.00, `status` = 1 WHERE `description` = 'Margarita Clásica' AND `activo` = 1;
INSERT INTO `drinks` (`description`, `detalle`, `categoria`, `personas`, `orden`, `image`, `price`, `status`)
  SELECT 'Margarita Clásica', 'Con Tequila José Cuervo', 'Con alcohol', 0, 27, 'consumo-con-alcohol-27-margarita-clasica.webp', 7.00, 1 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `drinks` WHERE `description` = 'Margarita Clásica' AND `activo` = 1);
-- Doña Margarita
UPDATE `drinks` SET `detalle` = 'Con Tequila Don Julio', `categoria` = 'Con alcohol', `personas` = 0, `orden` = 28, `image` = 'consumo-con-alcohol-28-dona-margarita.webp', `price` = 14.00, `status` = 1 WHERE `description` = 'Doña Margarita' AND `activo` = 1;
INSERT INTO `drinks` (`description`, `detalle`, `categoria`, `personas`, `orden`, `image`, `price`, `status`)
  SELECT 'Doña Margarita', 'Con Tequila Don Julio', 'Con alcohol', 0, 28, 'consumo-con-alcohol-28-dona-margarita.webp', 14.00, 1 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `drinks` WHERE `description` = 'Doña Margarita' AND `activo` = 1);
-- Aperol Spritz
UPDATE `drinks` SET `detalle` = NULL, `categoria` = 'Con alcohol', `personas` = 0, `orden` = 29, `image` = 'consumo-con-alcohol-29-aperol-spritz.webp', `price` = 12.00, `status` = 1 WHERE `description` = 'Aperol Spritz' AND `activo` = 1;
INSERT INTO `drinks` (`description`, `detalle`, `categoria`, `personas`, `orden`, `image`, `price`, `status`)
  SELECT 'Aperol Spritz', NULL, 'Con alcohol', 0, 29, 'consumo-con-alcohol-29-aperol-spritz.webp', 12.00, 1 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `drinks` WHERE `description` = 'Aperol Spritz' AND `activo` = 1);
-- Coca-Cola Lata
UPDATE `drinks` SET `detalle` = NULL, `categoria` = 'Sin alcohol', `personas` = 0, `orden` = 1, `image` = 'consumo-sin-alcohol-01-coca-cola-lata.webp', `price` = 3.00, `status` = 1 WHERE `description` = 'Coca-Cola Lata' AND `activo` = 1;
INSERT INTO `drinks` (`description`, `detalle`, `categoria`, `personas`, `orden`, `image`, `price`, `status`)
  SELECT 'Coca-Cola Lata', NULL, 'Sin alcohol', 0, 1, 'consumo-sin-alcohol-01-coca-cola-lata.webp', 3.00, 1 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `drinks` WHERE `description` = 'Coca-Cola Lata' AND `activo` = 1);
-- Pepsi Lata
UPDATE `drinks` SET `detalle` = NULL, `categoria` = 'Sin alcohol', `personas` = 0, `orden` = 2, `image` = 'consumo-sin-alcohol-02-pepsi-lata.webp', `price` = 3.00, `status` = 1 WHERE `description` = 'Pepsi Lata' AND `activo` = 1;
INSERT INTO `drinks` (`description`, `detalle`, `categoria`, `personas`, `orden`, `image`, `price`, `status`)
  SELECT 'Pepsi Lata', NULL, 'Sin alcohol', 0, 2, 'consumo-sin-alcohol-02-pepsi-lata.webp', 3.00, 1 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `drinks` WHERE `description` = 'Pepsi Lata' AND `activo` = 1);
-- Té Negro Natural
UPDATE `drinks` SET `detalle` = NULL, `categoria` = 'Sin alcohol', `personas` = 0, `orden` = 3, `image` = 'consumo-sin-alcohol-03-te-negro-natural.webp', `price` = 3.50, `status` = 1 WHERE `description` = 'Té Negro Natural' AND `activo` = 1;
INSERT INTO `drinks` (`description`, `detalle`, `categoria`, `personas`, `orden`, `image`, `price`, `status`)
  SELECT 'Té Negro Natural', NULL, 'Sin alcohol', 0, 3, 'consumo-sin-alcohol-03-te-negro-natural.webp', 3.50, 1 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `drinks` WHERE `description` = 'Té Negro Natural' AND `activo` = 1);
-- Agua Mineral 355 ml
UPDATE `drinks` SET `detalle` = NULL, `categoria` = 'Sin alcohol', `personas` = 0, `orden` = 4, `image` = 'consumo-sin-alcohol-04-agua-mineral-355-ml.webp', `price` = 2.00, `status` = 1 WHERE `description` = 'Agua Mineral 355 ml' AND `activo` = 1;
INSERT INTO `drinks` (`description`, `detalle`, `categoria`, `personas`, `orden`, `image`, `price`, `status`)
  SELECT 'Agua Mineral 355 ml', NULL, 'Sin alcohol', 0, 4, 'consumo-sin-alcohol-04-agua-mineral-355-ml.webp', 2.00, 1 FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `drinks` WHERE `description` = 'Agua Mineral 355 ml' AND `activo` = 1);

-- 3) Retirar de la carta los productos anteriores que no estan en ella
--    (borrado logico: las facturas de compras pasadas los conservan).
UPDATE `food` SET `activo` = 0 WHERE `activo` = 1 AND (`image` IS NULL OR `image` NOT LIKE 'consumo-%');
UPDATE `drinks` SET `activo` = 0 WHERE `activo` = 1 AND (`image` IS NULL OR `image` NOT LIKE 'consumo-%');

-- Marcha atras (solo si se revierte el codigo que usa las columnas):
-- ALTER TABLE `food` DROP COLUMN `orden`, DROP COLUMN `detalle`;
-- ALTER TABLE `drinks` DROP COLUMN `personas`, DROP COLUMN `orden`, DROP COLUMN `categoria`, DROP COLUMN `detalle`;
