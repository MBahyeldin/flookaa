package types

import (
	"database/sql"
	"encoding/json"
)

type NullString sql.NullString

func (ns *NullString) UnmarshalJSON(data []byte) error {
	if string(data) == "null" {
		ns.String = ""
		ns.Valid = false
		return nil
	}
	var s string
	if err := json.Unmarshal(data, &s); err != nil {
		return err
	}
	ns.String = s
	ns.Valid = true
	return nil
}
