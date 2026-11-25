-- La "Imagen 2" del evento no se muestra en ninguna parte: deja de ser obligatoria.
-- Las del evento son flyer (tarjetas), image1 (fondo del evento y la compra) e image3 (carrusel).
-- Aplicar en TiDB (base `ternera`) antes o durante el deploy del backend.
ALTER TABLE events MODIFY image2 VARCHAR(255) NULL;
