#!/usr/bin/env bash
# Start or stop Tutorix EC2 + Docker Compose via AWS SSM.
# Usage:
#   bash scripts/tutorix-aws-env.sh staging|production start|stop|status

set -euo pipefail

REGION="${TUTORIX_AWS_REGION:-us-east-1}"
COMPOSE_DIR="/home/ssm-user/tutorix"

usage() {
  echo "Usage: bash scripts/tutorix-aws-env.sh staging|production start|stop|status" >&2
  exit 1
}

ENV="${1:-}"
ACTION="${2:-}"

[[ "$ENV" == "staging" || "$ENV" == "production" ]] || usage
[[ "$ACTION" == "start" || "$ACTION" == "stop" || "$ACTION" == "status" ]] || usage

if [[ "$ENV" == "production" ]]; then
  INSTANCE_ID="i-02c8f353467b88ec9"
  LABEL="production (www.tutorix.tech)"
else
  INSTANCE_ID="i-066ca9810c7218e87"
  LABEL="staging (dev.tutorix.tech)"
fi

state() {
  aws ec2 describe-instances \
    --region "$REGION" \
    --instance-ids "$INSTANCE_ID" \
    --query 'Reservations[0].Instances[0].State.Name' \
    --output text
}

wait_running() {
  echo "Waiting for $LABEL ($INSTANCE_ID) to reach running..."
  aws ec2 wait instance-running --region "$REGION" --instance-ids "$INSTANCE_ID"
}

wait_ssm() {
  local attempts=0
  until aws ssm describe-instance-information \
    --region "$REGION" \
    --filters "Key=InstanceIds,Values=$INSTANCE_ID" \
    --query 'InstanceInformationList[0].PingStatus' \
    --output text 2>/dev/null | grep -q Online; do
    attempts=$((attempts + 1))
    if [[ "$attempts" -gt 30 ]]; then
      echo "SSM agent did not come online in time." >&2
      exit 1
    fi
    sleep 10
  done
}

compose_up() {
  local cmd_id
  cmd_id="$(aws ssm send-command \
    --region "$REGION" \
    --instance-ids "$INSTANCE_ID" \
    --document-name AWS-RunShellScript \
    --parameters "commands=[\"sudo -u ssm-user bash -lc 'cd ${COMPOSE_DIR} && docker compose up -d && docker compose ps'\"]" \
    --query 'Command.CommandId' \
    --output text)"
  echo "SSM CommandId: $cmd_id"
  local attempts=0
  local status=""
  while [[ $attempts -lt 40 ]]; do
    status="$(aws ssm get-command-invocation \
      --region "$REGION" \
      --command-id "$cmd_id" \
      --instance-id "$INSTANCE_ID" \
      --query 'Status' \
      --output text 2>/dev/null || true)"
    case "$status" in
      Success)
        aws ssm get-command-invocation \
          --region "$REGION" \
          --command-id "$cmd_id" \
          --instance-id "$INSTANCE_ID" \
          --query 'StandardOutputContent' \
          --output text
        return 0
        ;;
      Failed|Cancelled|TimedOut)
        aws ssm get-command-invocation \
          --region "$REGION" \
          --command-id "$cmd_id" \
          --instance-id "$INSTANCE_ID" \
          --query '[Status,StandardErrorContent]' \
          --output text >&2
        exit 1
        ;;
    esac
    sleep 3
    attempts=$((attempts + 1))
  done
  echo "SSM command did not finish in time." >&2
  exit 1
}

case "$ACTION" in
  status)
    echo "$LABEL: $(state)"
    ;;
  start)
  if [[ "$ENV" == "production" ]]; then
      echo "Note: production should stay up via AWS scheduler config; use start after a manual stop or cold boot."
    else
      echo "Note: stop staging when testing is done: bash scripts/tutorix-aws-env.sh staging stop"
    fi
    current="$(state)"
    if [[ "$current" != "running" ]]; then
      aws ec2 start-instances --region "$REGION" --instance-ids "$INSTANCE_ID" >/dev/null
      wait_running
    else
      echo "$LABEL already running."
    fi
    wait_ssm
    compose_up
    echo "$LABEL is up."
    ;;
  stop)
    if [[ "$ENV" == "production" ]]; then
      echo "Refusing to stop production from this script." >&2
      echo "If you must stop for maintenance, use AWS Console or: aws ec2 stop-instances --instance-ids $INSTANCE_ID" >&2
      exit 1
    fi
    current="$(state)"
    if [[ "$current" == "stopped" ]]; then
      echo "$LABEL already stopped."
      exit 0
    fi
    aws ec2 stop-instances --region "$REGION" --instance-ids "$INSTANCE_ID" >/dev/null
    echo "Stopping $LABEL..."
    aws ec2 wait instance-stopped --region "$REGION" --instance-ids "$INSTANCE_ID"
    echo "$LABEL stopped."
    ;;
esac