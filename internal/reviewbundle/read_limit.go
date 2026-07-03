package reviewbundle

import (
	"fmt"
	"io"
)

// MaxProtocolDocumentBytes caps bundle, manifest, and comments payloads at load time.
const MaxProtocolDocumentBytes = 8 * 1024 * 1024

func readLimited(reader io.Reader) ([]byte, error) {
	limited := io.LimitReader(reader, MaxProtocolDocumentBytes+1)
	data, err := io.ReadAll(limited)
	if err != nil {
		return nil, err
	}
	if int64(len(data)) > MaxProtocolDocumentBytes {
		return nil, fmt.Errorf(
			"document exceeds %d byte limit",
			MaxProtocolDocumentBytes,
		)
	}
	return data, nil
}
