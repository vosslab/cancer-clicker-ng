#!/usr/bin/env python3
"""Verify the complete nonignored working-tree candidate through a disposable Git index."""

# Standard Library imports above.
import hashlib
import json
import os
import pathlib
import subprocess
import tempfile


#============================================
MANIFEST_PATH = pathlib.Path("output_release/candidate_manifest.json")
TEST_COMMAND = ["python3", "-m", "pytest", "tests/"]


#============================================
def run_git(
	repo_root: pathlib.Path, command: list[str], environment: dict[str, str] | None = None,
) -> subprocess.CompletedProcess[str]:
	"""Run one Git command from the resolved repository root.

	Args:
		repo_root: Absolute repository root.
		command: Git subcommand and arguments without the leading ``git``.
		environment: Optional full environment for disposable Git operations.

	Returns:
		Completed Git process with text output when requested by the caller.

	Raises:
		subprocess.CalledProcessError: The Git command reports a failure.
	"""
	argv = ["git"] + command
	result = subprocess.run(argv, cwd=repo_root, env=environment, check=True, text=True)
	return result


#============================================
def git_output(repo_root: pathlib.Path, command: list[str]) -> str:
	"""Return stripped stdout from a read-only Git query.

	Args:
		repo_root: Absolute repository root.
		command: Git subcommand and arguments without the leading ``git``.

	Returns:
		Stripped standard output from the Git query.

	Raises:
		subprocess.CalledProcessError: The Git query reports a failure.
	"""
	argv = ["git"] + command
	result = subprocess.run(
		argv,
		cwd=repo_root,
		check=True,
		capture_output=True,
		text=True,
	)
	output = result.stdout.strip()
	return output


#============================================
def resolve_repo_path(repo_root: pathlib.Path, git_path: str) -> pathlib.Path:
	"""Resolve a Git-provided repository path to an absolute real path.

	Args:
		repo_root: Absolute repository root used for relative Git paths.
		git_path: Path text returned by Git.

	Returns:
		Resolved absolute path.
	"""
	path = pathlib.Path(git_path)
	if not path.is_absolute():
		path = repo_root / path
	resolved = path.resolve()
	return resolved


#============================================
def discover_repository() -> tuple[pathlib.Path, pathlib.Path, pathlib.Path, pathlib.Path]:
	"""Resolve the repository root and its real index, object, and Git directories.

	Returns:
		Repository root, real index path, real object directory, and absolute Git directory.

	Raises:
		RuntimeError: The repository has no readable real index or object directory.
	"""
	repo_root_text = git_output(pathlib.Path.cwd(), ["rev-parse", "--show-toplevel"])
	repo_root = pathlib.Path(repo_root_text).resolve()
	index_git_path = git_output(repo_root, ["rev-parse", "--git-path", "index"])
	index_path = resolve_repo_path(repo_root, index_git_path)
	objects_path = resolve_repo_path(
		repo_root,
		git_output(repo_root, ["rev-parse", "--git-path", "objects"]),
	)
	git_dir = pathlib.Path(git_output(repo_root, ["rev-parse", "--absolute-git-dir"])).resolve()
	if not index_path.is_file():
		message = f"FAIL: real Git index is missing: {index_path}"
		raise RuntimeError(message)
	if not objects_path.is_dir():
		message = f"FAIL: real Git object directory is missing: {objects_path}"
		raise RuntimeError(message)
	return repo_root, index_path, objects_path, git_dir


#============================================
def index_snapshot(index_path: pathlib.Path) -> tuple[bytes, str]:
	"""Capture the exact bytes and SHA-256 digest of the real Git index.

	Args:
		index_path: Resolved path to the real Git index.

	Returns:
		Exact index bytes and their hexadecimal SHA-256 digest.
	"""
	contents = index_path.read_bytes()
	digest = hashlib.sha256(contents).hexdigest()
	return contents, digest


#============================================
def verify_index_unchanged(index_path: pathlib.Path, before: tuple[bytes, str]) -> None:
	"""Confirm that disposable projection work preserved the real Git index.

	Args:
		index_path: Resolved path to the real Git index.
		before: Exact bytes and digest captured before candidate projection.

	Raises:
		RuntimeError: The real index bytes or digest changed during verification.
	"""
	after = index_snapshot(index_path)
	if before != after:
		message = "FAIL: the real Git index changed during candidate verification."
		raise RuntimeError(message)


#============================================
def disposable_git_environment(
	repo_root: pathlib.Path,
	git_dir: pathlib.Path,
	real_objects: pathlib.Path,
	temporary_root: pathlib.Path,
) -> dict[str, str]:
	"""Create an environment that sends index and object writes into temporary storage.

	Args:
		repo_root: Absolute repository root.
		git_dir: Absolute Git administrative directory.
		real_objects: Read-only alternate object directory for existing blobs and trees.
		temporary_root: Unique temporary directory for this projection.

	Returns:
		Full subprocess environment for disposable Git operations.
	"""
	temporary_objects = temporary_root / "objects"
	temporary_objects.mkdir()
	environment = os.environ.copy()
	environment["GIT_DIR"] = str(git_dir)
	environment["GIT_WORK_TREE"] = str(repo_root)
	environment["GIT_INDEX_FILE"] = str(temporary_root / "index")
	environment["GIT_OBJECT_DIRECTORY"] = str(temporary_objects)
	environment["GIT_ALTERNATE_OBJECT_DIRECTORIES"] = str(real_objects)
	return environment


#============================================
def parse_index_entries(index_output: bytes) -> list[dict[str, str]]:
	"""Convert disposable-index entries into a deterministic manifest path list.

	Args:
		index_output: NUL-delimited output from ``git ls-files -s -z``.

	Returns:
		Sorted manifest entries with path, mode, and blob identifier.

	Raises:
		RuntimeError: Git emits an index entry with an unexpected format.
	"""
	entries = []
	for raw_entry in index_output.split(b"\0"):
		if not raw_entry:
			continue
		metadata, separator, raw_path = raw_entry.partition(b"\t")
		parts = metadata.split()
		if not separator or len(parts) != 3:
			message = "FAIL: disposable index returned an unparseable entry."
			raise RuntimeError(message)
		entry = {
			"path": raw_path.decode("utf-8", errors="surrogateescape"),
			"mode": parts[0].decode("ascii"),
			"blob_id": parts[1].decode("ascii"),
		}
		entries.append(entry)
	entries.sort(key=lambda entry: entry["path"])
	return entries


#============================================
def projected_entries(
	repo_root: pathlib.Path,
	environment: dict[str, str],
) -> list[dict[str, str]]:
	"""Populate the disposable index with HEAD and all nonignored working-tree changes.

	Args:
		repo_root: Absolute repository root.
		environment: Disposable Git environment with isolated writes.

	Returns:
		Sorted candidate entries from the populated disposable index.

	Raises:
		subprocess.CalledProcessError: A Git projection command reports a failure.
	"""
	# Start from the committed tree, then stage every relevant working-tree change.
	run_git(repo_root, ["read-tree", "HEAD"], environment)
	run_git(repo_root, ["add", "--all"], environment)
	argv = ["git", "ls-files", "--stage", "-z"]
	result = subprocess.run(
		argv,
		cwd=repo_root,
		env=environment,
		check=True,
		capture_output=True,
	)
	entries = parse_index_entries(result.stdout)
	return entries


#============================================
def changed_candidate_paths(
	before_entries: list[dict[str, str]],
	after_entries: list[dict[str, str]],
) -> list[str]:
	"""Return sorted paths whose candidate mode or content changed.

	Args:
		before_entries: Candidate entries captured before running projected tests.
		after_entries: Candidate entries captured after running projected tests.

	Returns:
		Sorted paths added, removed, or changed between the two projections.
	"""
	before_by_path = {
		entry["path"]: (entry["mode"], entry["blob_id"])
		for entry in before_entries
	}
	after_by_path = {
		entry["path"]: (entry["mode"], entry["blob_id"])
		for entry in after_entries
	}
	paths = set(before_by_path) | set(after_by_path)
	changed_paths = []
	for path in sorted(paths):
		if before_by_path.get(path) != after_by_path.get(path):
			changed_paths.append(path)
	return changed_paths


#============================================
def verify_candidate_entries_unchanged(
	before_entries: list[dict[str, str]],
	after_entries: list[dict[str, str]],
) -> None:
	"""Reject a candidate whose nonignored working tree changed during testing.

	Args:
		before_entries: Candidate entries captured before running projected tests.
		after_entries: Candidate entries captured after running projected tests.

	Raises:
		RuntimeError: Projected tests changed a nonignored candidate path.
	"""
	if before_entries == after_entries:
		return
	changed_paths = changed_candidate_paths(before_entries, after_entries)
	if changed_paths:
		path_text = ", ".join(changed_paths)
		message = (
			"FAIL: the nonignored candidate changed while projected tests were running. "
			f"Changed candidate paths: {path_text}"
		)
	else:
		message = (
			"FAIL: the nonignored candidate changed while projected tests were running, "
			"but changed paths could not be determined."
		)
	raise RuntimeError(message)


#============================================
def manifest_digest(source_head: str, entries: list[dict[str, str]]) -> str:
	"""Return the canonical digest for the projected candidate content.

	Args:
		source_head: Commit identifier used as the projection base.
		entries: Sorted path, mode, and blob identifier entries.

	Returns:
		Hexadecimal SHA-256 digest of canonical candidate content.
	"""
	content = {
		"source_head": source_head,
		"projected_paths": entries,
	}
	encoded = json.dumps(
		content,
		sort_keys=True,
		separators=(",", ":"),
		ensure_ascii=True,
	).encode("ascii")
	digest = hashlib.sha256(encoded).hexdigest()
	return digest


#============================================
def manifest_content(source_head: str, entries: list[dict[str, str]]) -> str:
	"""Build deterministic JSON content for one projected candidate manifest.

	Args:
		source_head: Commit identifier used as the projection base.
		entries: Sorted path, mode, and blob identifier entries.

	Returns:
		ASCII JSON content with a trailing newline.
	"""
	digest = manifest_digest(source_head, entries)
	manifest = {
		"source_head": source_head,
		"projected_paths": entries,
		"manifest_digest": digest,
		"command_metadata": {
			"projection_commands": [
				["git", "read-tree", "HEAD"],
				["git", "add", "--all"],
				["git", "ls-files", "--stage", "-z"],
			],
			"test_command": TEST_COMMAND,
			"script": "devel/verify_candidate.py",
		},
	}
	content = json.dumps(manifest, indent="\t", sort_keys=True, ensure_ascii=True) + "\n"
	return content


#============================================
def remove_prior_manifest(repo_root: pathlib.Path) -> pathlib.Path:
	"""Remove an earlier generated manifest before starting a new candidate run.

	Args:
		repo_root: Absolute repository root.

	Returns:
		Absolute root-scoped path reserved for this invocation's manifest.
	"""
	path = repo_root / MANIFEST_PATH
	path.unlink(missing_ok=True)
	return path


#============================================
def publish_manifest(manifest_path: pathlib.Path, content: str) -> pathlib.Path:
	"""Atomically publish successful projected-candidate content in the output directory.

	Args:
		manifest_path: Absolute ignored manifest path under the repository output directory.
		content: Complete deterministic manifest text prepared from projected entries.

	Returns:
		Published absolute manifest path.
	"""
	manifest_path.parent.mkdir(exist_ok=True)
	file_descriptor, temporary_name = tempfile.mkstemp(
		prefix=f".{manifest_path.stem}.",
		suffix=".tmp",
		dir=manifest_path.parent,
		text=True,
	)
	temporary_path = pathlib.Path(temporary_name)
	try:
		with os.fdopen(file_descriptor, "w", encoding="ascii") as temporary_file:
			temporary_file.write(content)
		os.replace(temporary_path, manifest_path)
	finally:
		temporary_path.unlink(missing_ok=True)
	return manifest_path


#============================================
def run_projected_tests(repo_root: pathlib.Path, environment: dict[str, str]) -> None:
	"""Run the repository pytest lane with the disposable Git environment.

	Args:
		repo_root: Absolute repository root.
		environment: Disposable Git environment with isolated writes.

	Raises:
		subprocess.CalledProcessError: The pytest lane reports a failure.
	"""
	subprocess.run(TEST_COMMAND, cwd=repo_root, env=environment, check=True)


#============================================
def main() -> None:
	"""Project the full candidate, test it, and prove the real Git index remained unchanged."""
	repo_root, index_path, real_objects, git_dir = discover_repository()
	manifest_path = remove_prior_manifest(repo_root)
	before_index = index_snapshot(index_path)
	source_head = git_output(repo_root, ["rev-parse", "HEAD"])
	failure_message: str | None = None

	try:
		with tempfile.TemporaryDirectory(prefix="candidate_projection_") as temporary_name:
			temporary_root = pathlib.Path(temporary_name)
			environment = disposable_git_environment(
				repo_root,
				git_dir,
				real_objects,
				temporary_root,
			)
			entries = projected_entries(repo_root, environment)
			run_projected_tests(repo_root, environment)
			entries_after_tests = projected_entries(repo_root, environment)
			verify_candidate_entries_unchanged(entries, entries_after_tests)
			content = manifest_content(source_head, entries)
			try:
				manifest_path = publish_manifest(manifest_path, content)
			except OSError as error:
				message = f"FAIL: atomic manifest publication failed: {error}"
				raise RuntimeError(message) from error
	except subprocess.CalledProcessError:
		failure_message = "FAIL: projected pytest or Git command reported an error."
	finally:
		verify_index_unchanged(index_path, before_index)
	if failure_message is not None:
		raise RuntimeError(failure_message)

	print("PASS: complete nonignored working-tree candidate verified")
	print(f"- source HEAD: {source_head}")
	print(f"- projected manifest: {manifest_path.relative_to(repo_root)}")
	print("- disposable Git index and object storage preserved the real index")


if __name__ == "__main__":
	try:
		main()
	except RuntimeError as error:
		print(error)
		raise SystemExit(1) from error
