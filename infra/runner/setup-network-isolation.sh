#!/usr/bin/env bash
# Idempotent Docker network + IPv4/IPv6 firewall isolation for ephemeral MCP DadosBR runners.
# Scoped strictly to bridge `br-dadosbr-ci` (subnet 172.30.240.0/24) so other
# host services and Docker networks remain completely unaffected.
#
# Usage:
#   setup-network-isolation.sh [--apply|--teardown|--status]

set -euo pipefail

DOCKER_NETWORK="${DOCKER_NETWORK:-dadosbr-ci-isolated}"
BRIDGE_NAME="${BRIDGE_NAME:-br-dadosbr-ci}"
RUNNER_SUBNET="${RUNNER_SUBNET:-172.30.240.0/24}"
RUNNER_GATEWAY="${RUNNER_GATEWAY:-172.30.240.1}"

FWD_CHAIN="DADOSBR-RUNNER-FWD"
IN_CHAIN="DADOSBR-RUNNER-IN"

ACTION="${1:---apply}"

ensure_network() {
  if docker network inspect "$DOCKER_NETWORK" >/dev/null 2>&1; then
    local existing_subnet existing_bridge existing_icc
    existing_subnet=$(docker network inspect "$DOCKER_NETWORK" --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}')
    existing_bridge=$(docker network inspect "$DOCKER_NETWORK" --format '{{index .Options "com.docker.network.bridge.name"}}')
    existing_icc=$(docker network inspect "$DOCKER_NETWORK" --format '{{index .Options "com.docker.network.bridge.enable_icc"}}')
    if [[ "$existing_subnet" != "$RUNNER_SUBNET" || "$existing_bridge" != "$BRIDGE_NAME" || "$existing_icc" != "false" ]]; then
      echo "ERROR: Existing network ${DOCKER_NETWORK} drifted (subnet=${existing_subnet}, bridge=${existing_bridge}, icc=${existing_icc})" >&2
      exit 1
    fi
    return 0
  fi

  docker network create \
    --driver bridge \
    --subnet "$RUNNER_SUBNET" \
    --gateway "$RUNNER_GATEWAY" \
    -o "com.docker.network.bridge.name=${BRIDGE_NAME}" \
    -o "com.docker.network.bridge.enable_icc=false" \
    "$DOCKER_NETWORK" >/dev/null
}

apply_ipv4_rules() {
  iptables -N DOCKER-USER 2>/dev/null || true
  iptables -N "$FWD_CHAIN" 2>/dev/null || true
  iptables -N "$IN_CHAIN" 2>/dev/null || true

  # Fail-closed guard while repopulating chains (eliminates any flush race window)
  if ! iptables -C DOCKER-USER -i "$BRIDGE_NAME" -j DROP 2>/dev/null; then
    iptables -I DOCKER-USER 1 -i "$BRIDGE_NAME" -j DROP
  fi
  if ! iptables -C INPUT -i "$BRIDGE_NAME" -j DROP 2>/dev/null; then
    iptables -I INPUT 1 -i "$BRIDGE_NAME" -j DROP
  fi

  # Dedicated forward chain for runner IPv4 egress containment
  iptables -F "$FWD_CHAIN"
  iptables -A "$FWD_CHAIN" -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
  iptables -A "$FWD_CHAIN" -d 0.0.0.0/8 -j DROP
  iptables -A "$FWD_CHAIN" -d 127.0.0.0/8 -j DROP
  iptables -A "$FWD_CHAIN" -d 10.0.0.0/8 -j DROP
  iptables -A "$FWD_CHAIN" -d 172.16.0.0/12 -j DROP
  iptables -A "$FWD_CHAIN" -d 192.168.0.0/16 -j DROP
  iptables -A "$FWD_CHAIN" -d 100.64.0.0/10 -j DROP
  iptables -A "$FWD_CHAIN" -d 169.254.0.0/16 -j DROP
  iptables -A "$FWD_CHAIN" -d 224.0.0.0/4 -j DROP
  iptables -A "$FWD_CHAIN" -d 240.0.0.0/4 -j DROP
  iptables -A "$FWD_CHAIN" -j RETURN

  # Dedicated input chain blocking runner -> host IPv4 access (SSH, local ports, etc.)
  iptables -F "$IN_CHAIN"
  iptables -A "$IN_CHAIN" -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
  iptables -A "$IN_CHAIN" -j DROP

  if ! iptables -C DOCKER-USER -i "$BRIDGE_NAME" -j "$FWD_CHAIN" 2>/dev/null; then
    iptables -I DOCKER-USER 2 -i "$BRIDGE_NAME" -j "$FWD_CHAIN"
  fi
  if ! iptables -C INPUT -i "$BRIDGE_NAME" -j "$IN_CHAIN" 2>/dev/null; then
    iptables -I INPUT 2 -i "$BRIDGE_NAME" -j "$IN_CHAIN"
  fi

  # Remove temporary catch-all guard now that populated chains are live
  while iptables -C DOCKER-USER -i "$BRIDGE_NAME" -j DROP 2>/dev/null; do
    iptables -D DOCKER-USER -i "$BRIDGE_NAME" -j DROP
  done
  while iptables -C INPUT -i "$BRIDGE_NAME" -j DROP 2>/dev/null; do
    iptables -D INPUT -i "$BRIDGE_NAME" -j DROP
  done
}

apply_ipv6_rules() {
  # Defense-in-depth alongside container disable_ipv6 sysctl: drop ALL IPv6 traffic
  # arriving on br-dadosbr-ci (blocks fe80::/64 link-local access to host [::]:22 etc.)
  ip6tables -N DOCKER-USER 2>/dev/null || true
  ip6tables -N "$FWD_CHAIN" 2>/dev/null || true
  ip6tables -N "$IN_CHAIN" 2>/dev/null || true

  if ! ip6tables -C DOCKER-USER -i "$BRIDGE_NAME" -j DROP 2>/dev/null; then
    ip6tables -I DOCKER-USER 1 -i "$BRIDGE_NAME" -j DROP
  fi
  if ! ip6tables -C INPUT -i "$BRIDGE_NAME" -j DROP 2>/dev/null; then
    ip6tables -I INPUT 1 -i "$BRIDGE_NAME" -j DROP
  fi

  ip6tables -F "$FWD_CHAIN"
  ip6tables -A "$FWD_CHAIN" -j DROP

  ip6tables -F "$IN_CHAIN"
  ip6tables -A "$IN_CHAIN" -j DROP

  if ! ip6tables -C DOCKER-USER -i "$BRIDGE_NAME" -j "$FWD_CHAIN" 2>/dev/null; then
    ip6tables -I DOCKER-USER 2 -i "$BRIDGE_NAME" -j "$FWD_CHAIN"
  fi
  if ! ip6tables -C INPUT -i "$BRIDGE_NAME" -j "$IN_CHAIN" 2>/dev/null; then
    ip6tables -I INPUT 2 -i "$BRIDGE_NAME" -j "$IN_CHAIN"
  fi

  while ip6tables -C DOCKER-USER -i "$BRIDGE_NAME" -j DROP 2>/dev/null; do
    ip6tables -D DOCKER-USER -i "$BRIDGE_NAME" -j DROP
  done
  while ip6tables -C INPUT -i "$BRIDGE_NAME" -j DROP 2>/dev/null; do
    ip6tables -D INPUT -i "$BRIDGE_NAME" -j DROP
  done
}

teardown() {
  # Refuse teardown if any container is still attached (never strip firewall under live workload)
  if docker network inspect "$DOCKER_NETWORK" >/dev/null 2>&1; then
    local attached
    attached=$(docker network inspect "$DOCKER_NETWORK" --format '{{len .Containers}}')
    if [[ "$attached" != "0" ]]; then
      echo "ERROR: ${attached} container(s) still attached to ${DOCKER_NETWORK}; stop them before teardown" >&2
      exit 1
    fi
    docker network rm "$DOCKER_NETWORK" >/dev/null
  fi

  for tool in iptables ip6tables; do
    while "$tool" -C DOCKER-USER -i "$BRIDGE_NAME" -j "$FWD_CHAIN" 2>/dev/null; do
      "$tool" -D DOCKER-USER -i "$BRIDGE_NAME" -j "$FWD_CHAIN"
    done
    while "$tool" -C INPUT -i "$BRIDGE_NAME" -j "$IN_CHAIN" 2>/dev/null; do
      "$tool" -D INPUT -i "$BRIDGE_NAME" -j "$IN_CHAIN"
    done
    while "$tool" -C DOCKER-USER -i "$BRIDGE_NAME" -j DROP 2>/dev/null; do
      "$tool" -D DOCKER-USER -i "$BRIDGE_NAME" -j DROP
    done
    while "$tool" -C INPUT -i "$BRIDGE_NAME" -j DROP 2>/dev/null; do
      "$tool" -D INPUT -i "$BRIDGE_NAME" -j DROP
    done
    "$tool" -F "$FWD_CHAIN" 2>/dev/null || true
    "$tool" -X "$FWD_CHAIN" 2>/dev/null || true
    "$tool" -F "$IN_CHAIN" 2>/dev/null || true
    "$tool" -X "$IN_CHAIN" 2>/dev/null || true
  done
}

show_status() {
  echo "=== Docker network ==="
  docker network inspect "$DOCKER_NETWORK" --format 'Name={{.Name}} Subnet={{range .IPAM.Config}}{{.Subnet}}{{end}} Bridge={{index .Options "com.docker.network.bridge.name"}} ICC={{index .Options "com.docker.network.bridge.enable_icc"}}' 2>/dev/null || echo "not created"
  for tool in iptables ip6tables; do
    echo "=== ${tool} DOCKER-USER jump ==="
    "$tool" -S DOCKER-USER 2>/dev/null | grep -E "${BRIDGE_NAME}|${FWD_CHAIN}" || echo "absent"
    echo "=== ${tool} ${FWD_CHAIN} ==="
    "$tool" -S "$FWD_CHAIN" 2>/dev/null || echo "absent"
    echo "=== ${tool} INPUT jump ==="
    "$tool" -S INPUT 2>/dev/null | grep -E "${BRIDGE_NAME}|${IN_CHAIN}" || echo "absent"
    echo "=== ${tool} ${IN_CHAIN} ==="
    "$tool" -S "$IN_CHAIN" 2>/dev/null || echo "absent"
  done
}

case "$ACTION" in
  --apply)
    ensure_network
    apply_ipv4_rules
    apply_ipv6_rules
    echo "Applied IPv4+IPv6 network isolation for ${DOCKER_NETWORK} (${BRIDGE_NAME} / ${RUNNER_SUBNET})"
    ;;
  --teardown)
    teardown
    echo "Removed IPv4+IPv6 network isolation for ${DOCKER_NETWORK} (${BRIDGE_NAME})"
    ;;
  --status)
    show_status
    ;;
  *)
    echo "Usage: $0 [--apply|--teardown|--status]" >&2
    exit 2
    ;;
esac
