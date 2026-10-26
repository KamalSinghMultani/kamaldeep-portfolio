# Contributing

Use Python 3.13 and Node.js 22 to match CI. This is a static site; no npm install
or JavaScript framework build is required.

## Local checks

```sh
python -m pip install -r requirements-dev.txt
python site/build.py
python tools/check.py
python -m http.server 8766 --bind 127.0.0.1 --directory dist/site
```

The check runner runs every `tools/check-*.cjs` script and validates the built
pages, local links, HTTP downloads, and one-page PDF. It starts and stops its own
HTTP server on an available local port. It does not need the preview command.
Review layout and interaction in a browser when changing visuals; the automated
checks exercise rendering logic and navigation without a browser or GPU.

Edit `site/index.src.html`, the CSS/JS modules, or the generators. The generated
`site/index.html`, `site/quick.html`, `site/kamaldeep-singh-resume.pdf`, and
`dist/site/` are ignored by Git. The historical canvas export in
`dist/kamaldeep-singh-portfolio.html` is retained as a design artifact.

## Branches and commits

Create a focused branch such as `feat/contact-details`, `fix/mobile-menu`, or
`ci/release-checks`. Keep related changes together and open a pull request against
`main`. Include the behavior change and the checks you ran in the PR description.

Use Conventional Commits: `<type>(<scope>): <short imperative summary>`.

| Type | Use |
| --- | --- |
| `feat` | New visitor-facing behavior |
| `fix` | Correct existing behavior |
| `design` | Artwork, prototypes, and visual references |
| `build` | Generators and build dependencies |
| `test` | Automated checks |
| `ci` | GitHub Actions and deployment |
| `docs` | Documentation |
| `chore` | Repository maintenance |

Examples: `feat(resume): add quick view`, `fix(menu): restore keyboard focus`,
`ci(pages): deploy validated production output`. Use `!` after the type/scope
for breaking changes and explain the migration in the commit body. Do not bundle
unrelated work, commit secrets, or force-push shared history.

## CI/CD

`.github/workflows/portfolio.yml` builds and checks pull requests targeting `main`,
pushes to `main`, and manual workflow runs. Only a successful build from `main`
uploads a Pages artifact and enters the deployment job. Pull requests do not get
deployment permissions. The deploy job uses the `github-pages` environment and
OpenID Connect; no personal deployment token or repository secret is needed.

GitHub Pages must use **Settings > Pages > Build and deployment > Source >
GitHub Actions**. The release publishes at:

https://kamalsinghmultani.github.io/kamaldeep-portfolio/

For a rollback, revert the faulty source commit on `main`; the passing pipeline
rebuilds and deploys the reverted version. For a retry, rerun the failed workflow
or dispatch it from the Actions tab on `main`.

Workflow actions are pinned to commit SHAs. Dependabot checks the Actions and
Python dependencies weekly. For protected collaboration, configure a branch rule
for `main` requiring pull requests and the **Build and validate** status check;
this is repository policy and is not enforced by the workflow file itself.
