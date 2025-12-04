-- name: ListCountries :many
SELECT 
    id,
    name
FROM public.countries
WHERE name ILIKE '%' || COALESCE(sqlc.arg(name)::text, '') || '%'
ORDER BY name ASC;

-- name: ListStatesByCountry :many
SELECT 
    s.id,
    s.name
FROM public.states s
JOIN public.countries c ON c.id = s.country_id
WHERE s.country_id = sqlc.arg(country_id)
  AND s.name ILIKE '%' || COALESCE(sqlc.arg(name)::text, '') || '%'
ORDER BY s.name ASC;

-- name: ListCitiesByState :many
SELECT 
    c.id,
    c.name
FROM public.cities c
JOIN public.states s ON s.id = c.state_id
WHERE c.state_id = sqlc.arg(state_id)
  AND c.name ILIKE '%' || COALESCE(sqlc.arg(name)::text, '') || '%'
ORDER BY c.name ASC;
