package reviewbundle

import (
	"encoding/json"
	"fmt"

	"github.com/google/jsonschema-go/jsonschema"
)

func validateEmbeddedDocument(schemaBytes []byte, document []byte, label string) error {
	var instance any
	if err := json.Unmarshal(document, &instance); err != nil {
		return fmt.Errorf("invalid %s schema: %w", label, err)
	}
	var schema jsonschema.Schema
	if err := json.Unmarshal(schemaBytes, &schema); err != nil {
		return fmt.Errorf("load %s schema: %w", label, err)
	}
	resolved, err := schema.Resolve(nil)
	if err != nil {
		return fmt.Errorf("resolve %s schema: %w", label, err)
	}
	if err := resolved.Validate(instance); err != nil {
		return fmt.Errorf("invalid %s schema: %w", label, err)
	}
	return nil
}

func validateBundleDocument(document []byte) error {
	return validateEmbeddedDocument(BundleSchema(), document, "bundle")
}

func validateCommentsDocument(document []byte) error {
	return validateEmbeddedDocument(CommentsSchema(), document, "comments")
}

func validateManifestDocument(document []byte) error {
	return validateEmbeddedDocument(ManifestSchema(), document, "scan manifest")
}
