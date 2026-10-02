INSERT INTO public.categoria (nombre, categoria_padre_id) VALUES
    ('Ficción', NULL),
    ('No ficción', NULL),
    ('Ciencia', NULL),
    ('Historia', NULL),
    ('Infantil', NULL),
    ('Poesía', NULL),
    ('Técnico', NULL),
    ('Autoayuda', NULL),
    ('Comics y novela gráfica', NULL),
    ('Filosofía', NULL),
    ('Biografía', NULL);

-- Fixture synthetic local-only. Replace via the Google Books catalog flow (P5) when available.
INSERT INTO public.libro_metadata_cache (
    isbn, google_books_id, titulo, autores
) VALUES (
    'LOCAL-P2-TEST',
    'local-demo-only',
    'Libro de prueba P2 (solo local)',
    'Datos de ejemplo'
);
