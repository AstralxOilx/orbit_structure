package application

import (
	"crypto/rand"
	"encoding/hex"
)

func NewKey(prefix string) (string, error) {
	bytes := make([]byte, 3)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return prefix + hex.EncodeToString(bytes), nil
}
