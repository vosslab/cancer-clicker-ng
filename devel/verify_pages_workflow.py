#!/usr/bin/env python3
"""Verify the repository's autonomous GitHub Pages release-candidate contract."""

import copy
import pathlib
import re
import subprocess

# Standard Library imports above.

# PIP3 modules
import yaml

#============================================
ROOT_WORKFLOW = pathlib.Path("deploy-pages.yml")
PUBLISHED_WORKFLOW = pathlib.Path(".github/workflows/deploy-pages.yml")
BOOL_TAG = "tag:yaml.org,2002:bool"
REQUIRED_PERMISSIONS = {
	"contents": "read",
	"pages": "write",
	"id-token": "write",
}


#============================================
class WorkflowLoader(yaml.SafeLoader):
	"""Load GitHub Actions YAML with YAML 1.2 boolean spelling."""


# GitHub Actions treats `on` as a string key. PyYAML's YAML 1.1 resolver would
# otherwise coerce it to True, so retain booleans only for true and false.
WorkflowLoader.yaml_implicit_resolvers = copy.deepcopy(yaml.SafeLoader.yaml_implicit_resolvers)
for resolver_key, resolvers in WorkflowLoader.yaml_implicit_resolvers.items():
	WorkflowLoader.yaml_implicit_resolvers[resolver_key] = [
		resolver for resolver in resolvers if resolver[0] != BOOL_TAG
	]
WorkflowLoader.add_implicit_resolver(
	BOOL_TAG,
	re.compile(r"^(?:true|True|TRUE|false|False|FALSE)$"),
	list("tTfF"),
)


#============================================
def discover_repo_root() -> pathlib.Path:
	"""Locate the repository root through the repository's canonical Git query."""
	try:
		result = subprocess.run(
			["git", "rev-parse", "--show-toplevel"],
			capture_output=True,
			check=True,
			cwd=pathlib.Path(__file__).resolve().parent,
			text=True,
		)
	except subprocess.CalledProcessError as error:
		message = "FAIL: unable to locate repository root with git rev-parse --show-toplevel"
		raise RuntimeError(message) from error
	repo_root = pathlib.Path(result.stdout.strip())
	return repo_root


#============================================
def load_workflow(path: pathlib.Path) -> dict:
	"""Load one GitHub Actions workflow with actionable YAML diagnostics.

	Args:
		path: Workflow file to parse.

	Returns:
		Parsed mapping with GitHub Actions keys preserved.

	Raises:
		RuntimeError: The file is invalid YAML or does not contain a mapping.
	"""
	try:
		contents = path.read_text(encoding="utf-8")
	except OSError as error:
		detail = str(error).splitlines()[0]
		message = f"FAIL: {path}: provide readable GitHub Actions YAML: {detail}"
		raise RuntimeError(message) from error
	loader = WorkflowLoader(contents)
	try:
		workflow = loader.get_single_data()
	except yaml.YAMLError as error:
		detail = str(error).splitlines()[0]
		message = f"FAIL: {path}: provide valid GitHub Actions YAML: {detail}"
		raise RuntimeError(message) from error
	finally:
		loader.dispose()
	if not isinstance(workflow, dict):
		message = f"FAIL: {path}: workflow root must be a mapping."
		raise RuntimeError(message)
	return workflow


#============================================
def normalize_semantics(value: object, key: str | None = None) -> object:
	"""Normalize action versions while retaining the workflow's meaningful shape."""
	if isinstance(value, dict):
		normalized = {}
		for child_key, child_value in value.items():
			normalized[child_key] = normalize_semantics(child_value, str(child_key))
		return normalized
	if isinstance(value, list):
		normalized_list = [normalize_semantics(item) for item in value]
		return normalized_list
	if key == "uses" and isinstance(value, str):
		action_family = value.split("@", maxsplit=1)[0]
		return action_family
	return value


#============================================
def action_family(step: dict) -> str | None:
	"""Return the version-independent action family used by one workflow step."""
	uses = step.get("uses")
	if not isinstance(uses, str):
		return None
	family = uses.split("@", maxsplit=1)[0]
	return family


#============================================
def expected_step_index(
	steps: list, start_index: int, expected_action: str | None,
	expected_run: str | None,
) -> int | None:
	"""Find the next required build step, preserving its required ordering."""
	for index in range(start_index, len(steps)):
		step = steps[index]
		if not isinstance(step, dict):
			continue
		if expected_action is not None and action_family(step) == expected_action:
			return index
		run = step.get("run")
		if expected_run is not None and isinstance(run, str) and run.strip() == expected_run:
			return index
	return None


#============================================
def validate_triggers(workflow: dict, failures: list[str]) -> None:
	"""Validate the release and manual-start entry points."""
	triggers = workflow.get("on")
	if not isinstance(triggers, dict):
		failures.append("workflow 'on' must define push and workflow_dispatch triggers")
		return
	push = triggers.get("push")
	if not isinstance(push, dict):
		failures.append("workflow 'on.push' must target the main branch")
	else:
		branches = push.get("branches")
		if not isinstance(branches, list) or "main" not in branches:
			failures.append("workflow 'on.push.branches' must include main")
	if "workflow_dispatch" not in triggers:
		failures.append("workflow 'on.workflow_dispatch' must be present")


#============================================
def validate_permissions(workflow: dict, failures: list[str]) -> None:
	"""Validate the minimal permissions required by GitHub Pages deployment."""
	permissions = workflow.get("permissions")
	if not isinstance(permissions, dict):
		failures.append("workflow permissions must grant the Pages deployment contract")
		return
	if permissions != REQUIRED_PERMISSIONS:
		failures.append(
			"workflow permissions must be exactly contents: read, pages: write, id-token: write"
		)


#============================================
def validate_build_job(workflow: dict, failures: list[str]) -> None:
	"""Validate the ordered local-build and artifact-upload contract."""
	jobs = workflow.get("jobs")
	if not isinstance(jobs, dict):
		failures.append("workflow must define a jobs mapping")
		return
	build = jobs.get("build")
	if not isinstance(build, dict):
		failures.append("workflow must define a build job")
		return
	steps = build.get("steps")
	if not isinstance(steps, list):
		failures.append("build job must define ordered steps")
		return
	expected_steps = (
		("actions/checkout", None, "checkout"),
		("actions/setup-node", None, "setup-node"),
		(None, "npm install", "npm install"),
		(None, "./build_github_pages.sh", "build_github_pages.sh"),
		("actions/configure-pages", None, "configure-pages"),
		("actions/upload-pages-artifact", None, "upload-pages-artifact"),
	)
	start_index = 0
	artifact_step = None
	for expected_action, expected_run, label in expected_steps:
		index = expected_step_index(steps, start_index, expected_action, expected_run)
		if index is None:
			failures.append(f"build job must run {label} in the required deployment order")
			return
		if expected_action == "actions/upload-pages-artifact":
			artifact_step = steps[index]
		start_index = index + 1
	if not isinstance(artifact_step, dict):
		failures.append("upload-pages-artifact step must provide path: dist")
		return
	with_values = artifact_step.get("with")
	if not isinstance(with_values, dict) or with_values.get("path") != "dist":
		failures.append("upload-pages-artifact must upload the dist directory")


#============================================
def validate_deploy_job(workflow: dict, failures: list[str]) -> None:
	"""Validate the deploy job's dependency on the built Pages artifact."""
	jobs = workflow.get("jobs")
	if not isinstance(jobs, dict):
		return
	deploy = jobs.get("deploy")
	if not isinstance(deploy, dict):
		failures.append("workflow must define a deploy job")
		return
	needs = deploy.get("needs")
	needs_build = needs == "build" or isinstance(needs, list) and "build" in needs
	if not needs_build:
		failures.append("deploy job must need the build job")
	steps = deploy.get("steps")
	if not isinstance(steps, list):
		failures.append("deploy job must use actions/deploy-pages")
		return
	deploys_pages = any(
		isinstance(step, dict) and action_family(step) == "actions/deploy-pages" for step in steps
	)
	if not deploys_pages:
		failures.append("deploy job must use the actions/deploy-pages action family")


#============================================
def verify_workflows(repo_root: pathlib.Path) -> list[str]:
	"""Return all release-candidate workflow contract failures."""
	template_path = repo_root / ROOT_WORKFLOW
	published_path = repo_root / PUBLISHED_WORKFLOW
	template = load_workflow(template_path)
	published = load_workflow(published_path)
	failures = []
	if normalize_semantics(template) != normalize_semantics(published):
		failures.append("root template and published workflow differ in deployment semantics")
	validate_triggers(template, failures)
	validate_permissions(template, failures)
	validate_build_job(template, failures)
	validate_deploy_job(template, failures)
	return failures


#============================================
def main() -> None:
	"""Run the offline GitHub Pages release-candidate verification."""
	try:
		repo_root = discover_repo_root()
		failures = verify_workflows(repo_root)
	except RuntimeError as error:
		print(error)
		raise SystemExit(1) from None
	if failures:
		print("FAIL: GitHub Pages workflow contract")
		for failure in failures:
			print(f"- {failure}")
		raise SystemExit(1)
	print("PASS: GitHub Pages workflow contract")
	print("- template and published workflow have matching deployment semantics")
	print(
		"- main push and workflow_dispatch triggers, minimal permissions, "
		"and build/deploy flow verified"
	)


if __name__ == "__main__":
	main()
