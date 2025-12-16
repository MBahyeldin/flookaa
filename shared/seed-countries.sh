#!/bin/bash

BASE_DUMP_FILE="external/db/postgres/seeds"

TABLES=(
  "cities"
  "countries"
  "regions"
  "states"
  "subregions"
)

for TABLE in "${TABLES[@]}"; do
  echo "Seeding database from $DUMP_FILE..."
  DUMP_FILES["$TABLE"]="$BASE_DUMP_FILE/$TABLE.sql"
  psql -d app -U baheuddeen -h 217.76.59.221 -p 5432 -f "${DUMP_FILES[$TABLE]}"
  if [ $? -ne 0 ]; then
    echo "Error seeding $TABLE."
    exit 1
  fi
done

if [ $? -eq 0 ]; then
  echo "Database seeded successfully!"
else
  echo "Error seeding database."
  exit 1
fi
