package main

import (
	"fmt"
	"strings"

	"github.com/open-code-review/open-code-review/internal/reviewbundle"
)

type validationFailedError struct {
	summary string
}

func (e validationFailedError) Error() string {
	if e.summary == "" {
		return "comment validation failed"
	}
	return "comment validation failed: " + e.summary
}

type invalidValidationReportError struct{}

func (invalidValidationReportError) Error() string {
	return "validation result is invalid; re-run validate-comments"
}

type staleCommentsError struct{}

func (staleCommentsError) Error() string {
	return "comments changed after validation; re-run validate-comments before report"
}

func formatValidationFailureSummary(result *reviewbundle.ValidationResult) string {
	if result == nil || len(result.Errors) == 0 {
		return "see validation output for details"
	}
	first := result.Errors[0]
	parts := []string{first.Code}
	if first.Path != "" {
		parts = append(parts, first.Path)
	}
	if first.CommentIndex != nil {
		parts = append(parts, fmt.Sprintf("comment[%d]", *first.CommentIndex))
	}
	return strings.Join(parts, " ")
}

func requireValidationReport(path string) (*reviewbundle.ValidationResult, error) {
	if path == "" {
		return nil, fmt.Errorf("--validation is required; run validate-comments first")
	}
	result, err := loadValidationResult(path)
	if err != nil {
		return nil, err
	}
	if result == nil || !result.Valid {
		return result, invalidValidationReportError{}
	}
	return result, nil
}
