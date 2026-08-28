"""Behavioral coverage for candidate-verification attribution boundaries."""

# PIP3 modules
import pytest

# local repo modules
import devel.verify_candidate


#============================================
def test_candidate_verifier_names_paths_changed_during_projected_tests() -> None:
	"""Reject candidate publication when projected tests alter tracked content."""
	before_entries = [
		{"path": "alpha.txt", "mode": "100644", "blob_id": "before"},
		{"path": "obsolete.txt", "mode": "100644", "blob_id": "unchanged"},
	]
	after_entries = [
		{"path": "alpha.txt", "mode": "100644", "blob_id": "after"},
		{"path": "beta.txt", "mode": "100755", "blob_id": "new"},
	]
	with pytest.raises(
		RuntimeError,
		match="Changed candidate paths: alpha.txt, beta.txt, obsolete.txt",
	):
		devel.verify_candidate.verify_candidate_entries_unchanged(before_entries, after_entries)
