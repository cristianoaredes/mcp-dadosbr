# Ephemeral GitHub Actions runner image for cristianoaredes/mcp-dadosbr
# Based on the official GitHub Actions runner image (pinned by linux/amd64 digest)
# with the two extra runtime packages required by .github/workflows/ci.yml:
# - libatomic1: required by Node.js 26 / workerd
# - bc: used by the Cloudflare Worker bundle size check
FROM ghcr.io/actions/actions-runner:2.338.2@sha256:4037925f16bd0626196684aff1853dabd242675c82efe08f0a2d376694738d19

USER root

RUN apt-get update \
    && apt-get install -y --no-install-recommends libatomic1 bc \
    && rm -rf /var/lib/apt/lists/*

USER runner
