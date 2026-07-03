package main

import (
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/open-code-review/open-code-review/internal/reviewbundle"
)

func TestAgentErrorStrings(t *testing.T) {
	var validationErr validationFailedError
	if validationErr.Error() != "comment validation failed" {
		t.Fatalf("validationFailedError string = %q", validationErr.Error())
	}
	var reportErr invalidValidationReportError
	if reportErr.Error() != "validation result is invalid" {
		t.Fatalf("invalidValidationReportError string = %q", reportErr.Error())
	}
}

func TestRequireValidationReportRequiresValidResult(t *testing.T) {
	if _, err := requireValidationReport(""); err == nil ||
		!strings.Contains(err.Error(), "--validation is required") {
		t.Fatalf("requireValidationReport(empty) error = %v, want missing validation", err)
	}

	path := filepath.Join(t.TempDir(), "validation.json")
	writeAgentJSON(t, path, reviewbundle.ValidationResult{
		SchemaVersion: "codex-review-validation/v1",
		BundleID:      "sha256:test",
		Valid:         false,
	})
	result, err := requireValidationReport(path)
	if _, ok := err.(invalidValidationReportError); !ok {
		t.Fatalf("error = %T(%v), want invalidValidationReportError", err, err)
	}
	if result == nil || result.Valid {
		t.Fatalf("result = %+v, want invalid report returned", result)
	}
}

func TestLoadValidationResultRejectsUnknownFields(t *testing.T) {
	path := filepath.Join(t.TempDir(), "validation.json")
	if err := os.WriteFile(path, []byte(`{
		"schema_version":"codex-review-validation/v1",
		"bundle_id":"sha256:test",
		"valid":true,
		"unexpected":true
	}`), 0o600); err != nil {
		t.Fatal(err)
	}

	_, err := loadValidationResult(path)
	if err == nil || !strings.Contains(err.Error(), "unknown field") {
		t.Fatalf("loadValidationResult() error = %v, want unknown field", err)
	}
}

func TestParseAgentReportAndValidateFlagsRejectBadValues(t *testing.T) {
	if _, err := parseCodexReportFlags("agent", []string{
		"--bundle", "bundle.json",
		"--comments", "comments.json",
		"--validation", "validation.json",
		"--format", "xml",
	}); err == nil || !strings.Contains(err.Error(), "--format") {
		t.Fatalf("parseCodexReportFlags() error = %v, want format error", err)
	}

	if _, err := parseCodexValidateFlags("agent", []string{
		"--bundle", "bundle.json",
		"--comments", "comments.json",
		"--max-git-procs", "0",
	}); err == nil || !strings.Contains(err.Error(), "--max-git-procs") {
		t.Fatalf("parseCodexValidateFlags() error = %v, want max git procs error", err)
	}
}

func TestAgentCommandUsageAndPrepareValidationEdges(t *testing.T) {
	var output bytes.Buffer
	printAgentCommandUsage(&output, "agent")
	if !strings.Contains(output.String(), "ocr agent prepare") ||
		!strings.Contains(output.String(), "validate-comments") {
		t.Fatalf("usage output missing agent commands:\n%s", output.String())
	}

	cases := []struct {
		name    string
		options codexPrepareOptions
		want    string
	}{
		{
			name: "scan with split",
			options: codexPrepareOptions{
				format:         "json",
				maxBundleBytes: 1,
				maxGitProcs:    1,
				maxFileBytes:   1,
				batchSize:      1,
				batchStrategy:  "by-language",
				scan:           true,
				split:          true,
			},
			want: "--split",
		},
		{
			name: "preview output",
			options: codexPrepareOptions{
				format:         "json",
				maxBundleBytes: 1,
				maxGitProcs:    1,
				maxFileBytes:   1,
				batchSize:      1,
				batchStrategy:  "none",
				preview:        true,
				outputPath:     "bundle.json",
			},
			want: "--output",
		},
		{
			name: "bad batch",
			options: codexPrepareOptions{
				format:         "json",
				maxBundleBytes: 1,
				maxGitProcs:    1,
				maxFileBytes:   1,
				batchSize:      1,
				batchStrategy:  "random",
			},
			want: "--batch",
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := validateCodexPrepareOptions(tc.options)
			if err == nil || !strings.Contains(err.Error(), tc.want) {
				t.Fatalf("validateCodexPrepareOptions() error = %v, want %q", err, tc.want)
			}
		})
	}
}

func TestWritePrivateFileUsesOwnerOnlyPermissions(t *testing.T) {
	path := filepath.Join(t.TempDir(), "bundle.json")
	if err := writePrivateFile(path, []byte("content")); err != nil {
		t.Fatalf("writePrivateFile() error = %v", err)
	}
	info, err := os.Stat(path)
	if err != nil {
		t.Fatal(err)
	}
	if got := info.Mode().Perm(); got != 0o600 {
		t.Fatalf("mode = %o, want 600", got)
	}
}
