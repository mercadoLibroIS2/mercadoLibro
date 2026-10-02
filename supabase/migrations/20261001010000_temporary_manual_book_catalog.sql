CREATE POLICY metadata_manual_libro_temporal
ON public.libro_metadata_cache FOR INSERT
TO authenticated
WITH CHECK (google_books_id = 'MANUAL:' || isbn);
