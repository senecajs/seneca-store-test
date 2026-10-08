# Workflow patches

GitHub requires the `workflow` OAuth scope to add or change files under
`.github/workflows/`. The session that prepared this branch did not have
it, so the change to the workflow is provided here as a git patch
instead.

Apply it from a checkout with normal credentials:

```sh
git am .patches/*.patch
git rm -r .patches
git commit -m "ci: remove applied workflow patches"
git push
```

| Patch | Changes |
| ----- | ------- |
| `0001-ci-run-the-build-on-Node.js-24-and-22-for-master-and.patch` | `.github/workflows/build.yml`: trigger on `master` (the default branch) as well as `main`, and test on Node.js 24 and 22 with a matrix instead of Node.js 24 only. |

`git apply --check .patches/*.patch` verifies that the patch applies.
