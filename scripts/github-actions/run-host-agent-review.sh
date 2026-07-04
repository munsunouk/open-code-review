#!/usr/bin/env bash
# prepare → generate comments → validate → report for single bundle or manifest.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUNDLE_PATH="${BUNDLE_PATH:-/tmp/bundle.json}"
COMMENTS_PATH="${COMMENTS_PATH:-/tmp/comments.json}"
VALIDATION_PATH="${VALIDATION_PATH:-/tmp/validation.json}"
REPORT_PATH="${REPORT_PATH:-/tmp/report.md}"
GENERATE_JS="${GENERATE_JS:-${SCRIPT_DIR}/generate-agent-comments.js}"

if [ ! -f "${BUNDLE_PATH}" ]; then
	echo "run-host-agent-review: missing bundle ${BUNDLE_PATH}" >&2
	exit 1
fi

is_manifest() {
	jq -e '.schema_version == "agent-review-manifest/v1" and (.bundles | type) == "array"' \
		"${BUNDLE_PATH}" >/dev/null 2>&1
}

bundle_count() {
	if is_manifest; then
		jq '.bundles | length' "${BUNDLE_PATH}"
	else
		echo 1
	fi
}

write_slice_bundle() {
	local index="$1"
	local output="$2"
	jq ".bundles[${index}]" "${BUNDLE_PATH}" >"${output}"
}

generate_for_bundle_file() {
	local bundle_file="$1"
	local comments_file="$2"
	node "${GENERATE_JS}" --bundle "${bundle_file}" --output "${comments_file}"
}

validate_comments() {
	local comments_file="$1"
	local validation_file="$2"
	if ! ocr agent validate-comments \
		--bundle "${BUNDLE_PATH}" \
		--comments "${comments_file}" \
		--output "${validation_file}"; then
		local exit_code=$?
		if [ "${exit_code}" -eq 2 ]; then
			echo "run-host-agent-review: validation failed for ${comments_file}" >&2
			cat "${validation_file}" 2>/dev/null || true
		fi
		return "${exit_code}"
	fi
}

count="$(bundle_count)"
if [ "${count}" -eq 0 ]; then
	echo "run-host-agent-review: manifest has no bundles" >&2
	exit 1
fi

tmpdir="$(mktemp -d)"
trap 'rm -rf "${tmpdir}"' EXIT

comment_parts=()
validation_parts=()

if is_manifest; then
	for index in $(seq 0 $((count - 1))); do
		slice="${tmpdir}/bundle-${index}.json"
		comments="${tmpdir}/comments-${index}.json"
		validation="${tmpdir}/validation-${index}.json"
		write_slice_bundle "${index}" "${slice}"
		generate_for_bundle_file "${slice}" "${comments}"
		validate_comments "${comments}" "${validation}"
		comment_parts+=("${comments}")
		validation_parts+=("${validation}")
	done
	jq -s \
		'{
			schema_version: "agent-review-comments/v1",
			bundle_id: .[0].bundle_id,
			summary: {
				files_reviewed: ([.[].summary.files_reviewed] | add),
				issues_found: ([.[].summary.issues_found] | add)
			},
			comments: ([.[].comments] | add),
			warnings: ([.[].warnings] | add)
		}' \
		"${comment_parts[@]}" >"${COMMENTS_PATH}"
	jq -s \
		'{
			schema_version: .[0].schema_version,
			bundle_id: .[0].bundle_id,
			valid: ([.[] | .valid] | all),
			errors: ([.[].errors] | add),
			warnings: ([.[].warnings] | add)
		}' \
		"${validation_parts[@]}" >"${VALIDATION_PATH}"
else
	generate_for_bundle_file "${BUNDLE_PATH}" "${COMMENTS_PATH}"
	validate_comments "${COMMENTS_PATH}" "${VALIDATION_PATH}"
fi

ocr agent report \
	--bundle "${BUNDLE_PATH}" \
	--comments "${COMMENTS_PATH}" \
	--validation "${VALIDATION_PATH}" \
	--format markdown \
	--output "${REPORT_PATH}"
