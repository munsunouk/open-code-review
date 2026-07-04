package reviewbundle

import (
	"fmt"

	"github.com/open-code-review/open-code-review/internal/llm"
	"github.com/open-code-review/open-code-review/internal/model"
)

// DefaultReviewMaxTokens matches the embedded native review template default.
const DefaultReviewMaxTokens = 58888

func prefilterTokenLimit(maxTokens int) int {
	if maxTokens <= 0 {
		maxTokens = DefaultReviewMaxTokens
	}
	return maxTokens * 4 / 5
}

func filterOversizedDiffs(diffs []model.Diff, maxTokens int) ([]model.Diff, []ProtocolNotice) {
	oversized, warnings := oversizedDiffPaths(diffs, maxTokens)
	if len(oversized) == 0 {
		return append([]model.Diff(nil), diffs...), warnings
	}
	kept := make([]model.Diff, 0, len(diffs))
	for _, diff := range diffs {
		if _, skip := oversized[diffPath(diff)]; skip {
			continue
		}
		kept = append(kept, diff)
	}
	return kept, warnings
}

func oversizedDiffPaths(diffs []model.Diff, maxTokens int) (map[string]struct{}, []ProtocolNotice) {
	limit := prefilterTokenLimit(maxTokens)
	oversized := make(map[string]struct{})
	warnings := make([]ProtocolNotice, 0)
	for _, diff := range diffs {
		path := diffPath(diff)
		tokens := llm.CountTokens(diff.Diff)
		if tokens > limit {
			oversized[path] = struct{}{}
			warnings = append(warnings, ProtocolNotice{
				Code: "oversized_diff",
				Message: fmt.Sprintf(
					"%s (~%d tokens) exceeds 80%% of max review tokens (%d)",
					path,
					tokens,
					maxTokens,
				),
			})
		}
	}
	return oversized, warnings
}

func diffPath(diff model.Diff) string {
	if diff.NewPath == "" || diff.NewPath == "/dev/null" {
		return diff.OldPath
	}
	return diff.NewPath
}

func estimateDiffManifestTokens(bundles []Bundle) int64 {
	var total int64
	for _, bundle := range bundles {
		for _, file := range bundle.Files {
			if file.Reviewable {
				total += int64(llm.CountTokens(file.Patch))
			}
		}
	}
	return total
}

func estimateAgentContentTokens(items []model.ScanItem) int64 {
	var total int64
	for _, item := range items {
		total += int64(llm.CountTokens(item.Content))
	}
	return total
}

func filterOversizedScanItems(items []model.ScanItem, maxTokens int) ([]model.ScanItem, []ScanSkippedFile) {
	limit := prefilterTokenLimit(maxTokens)
	kept := make([]model.ScanItem, 0, len(items))
	skipped := make([]ScanSkippedFile, 0)
	for _, item := range items {
		tokens := llm.CountTokens(item.Content)
		if tokens > limit {
			skipped = append(skipped, ScanSkippedFile{
				Path:            item.Path,
				Reason:          "oversized_scan",
				EstimatedTokens: int64(tokens),
			})
			continue
		}
		kept = append(kept, item)
	}
	return kept, skipped
}
