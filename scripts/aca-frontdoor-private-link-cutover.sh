#!/usr/bin/env bash
set -euo pipefail

require_bin() {
  if ! command -v "\$1" >/dev/null 2>&1; then
    echo "Missing required command: \$1" >&2
    exit 1
  fi
}

require_bin az
require_bin jq
require_bin curl

echo "== GreenChainz Front Door Premium -> Container Apps Private Link cutover =="

SUBSCRIPTION_ID="$(az account show --query id -o tsv)"
if [[ -z "${SUBSCRIPTION_ID}" ]]; then
  echo "No active Azure subscription. Run: az login" >&2
  exit 1
fi

echo "Azure subscription: ${SUBSCRIPTION_ID}"

json_len() {
  jq 'length' <<<"\$1"
}

pick_one_or_exit() {
  local json="\$1"
  local label="\$2"
  local count
  count="$(json_len "$json")"

  if [[ "$count" -eq 0 ]]; then
    echo "No ${label} found." >&2
    exit 1
  fi

  if [[ "$count" -gt 1 ]]; then
    echo "Multiple ${label} found. Re-run with the exact env vars shown below:" >&2
    jq -r '.[] | @json' <<<"$json" >&2
    exit 1
  fi
}

echo
echo "1/8 Discovering Front Door Premium profile..."

if [[ -n "${AFD_PROFILE_NAME:-}" && -n "${AFD_PROFILE_RESOURCE_GROUP:-}" ]]; then
  AFD_NAME="${AFD_PROFILE_NAME}"
  AFD_RG="${AFD_PROFILE_RESOURCE_GROUP}"
else
  AFD_PROFILES_JSON="$(
    az afd profile list \
      --query "[?sku.name=='Premium_AzureFrontDoor'].{name:name, resourceGroup:resourceGroup, sku:sku.name}" \
      -o json
  )"
  pick_one_or_exit "$AFD_PROFILES_JSON" "Azure Front Door Premium profiles"
  AFD_NAME="$(jq -r '.[0].name' <<<"$AFD_PROFILES_JSON")"
  AFD_RG="$(jq -r '.[0].resourceGroup' <<<"$AFD_PROFILES_JSON")"
fi

AFD_SKU="$(
  az afd profile show \
    --name "$AFD_NAME" \
    --resource-group "$AFD_RG" \
    --query "sku.name" \
    -o tsv
)"

if [[ "$AFD_SKU" != "Premium_AzureFrontDoor" ]]; then
  echo "Front Door profile ${AFD_NAME} is ${AFD_SKU}, not Premium_AzureFrontDoor. Refusing to continue." >&2
  exit 1
fi

echo "Front Door profile: ${AFD_RG}/${AFD_NAME} (${AFD_SKU})"

echo
echo "2/8 Discovering origin group and origin..."

if [[ -n "${AFD_ORIGIN_GROUP_NAME:-}" ]]; then
  ORIGIN_GROUP="${AFD_ORIGIN_GROUP_NAME}"
else
  ORIGIN_GROUPS_JSON="$(
    az afd origin-group list \
      --profile-name "$AFD_NAME" \
      --resource-group "$AFD_RG" \
      --query "[].{name:name}" \
      -o json
  )"
  pick_one_or_exit "$ORIGIN_GROUPS_JSON" "Front Door origin groups"
  ORIGIN_GROUP="$(jq -r '.[0].name' <<<"$ORIGIN_GROUPS_JSON")"
fi

if [[ -n "${AFD_ORIGIN_NAME:-}" ]]; then
  ORIGIN_NAME="${AFD_ORIGIN_NAME}"
else
  ORIGINS_JSON="$(
    az afd origin list \
      --profile-name "$AFD_NAME" \
      --resource-group "$AFD_RG" \
      --origin-group-name "$ORIGIN_GROUP" \
      -o json
  )"

  ACA_ORIGINS_JSON="$(
    jq '[.[] | select((.hostName // "") | contains("azurecontainerapps.io")) | {name:name, hostName:hostName}]' <<<"$ORIGINS_JSON"
  )"

  if [[ "$(json_len "$ACA_ORIGINS_JSON")" -eq 1 ]]; then
    ORIGIN_NAME="$(jq -r '.[0].name' <<<"$ACA_ORIGINS_JSON")"
  else
    SIMPLE_ORIGINS_JSON="$(jq '[.[] | {name:name, hostName:hostName}]' <<<"$ORIGINS_JSON")"
    pick_one_or_exit "$SIMPLE_ORIGINS_JSON" "Front Door origins"
    ORIGIN_NAME="$(jq -r '.[0].name' <<<"$SIMPLE_ORIGINS_JSON")"
  fi
fi

ORIGIN_JSON="$(
  az afd origin show \
    --profile-name "$AFD_NAME" \
    --resource-group "$AFD_RG" \
    --origin-group-name "$ORIGIN_GROUP" \
    --origin-name "$ORIGIN_NAME" \
    -o json
)"

ORIGIN_HOST="$(jq -r '.hostName // empty' <<<"$ORIGIN_JSON")"
ORIGIN_HOST_HEADER="$(jq -r '.originHostHeader // .hostName // empty' <<<"$ORIGIN_JSON")"

if [[ -z "$ORIGIN_HOST" ]]; then
  echo "Could not read origin hostName from Front Door origin ${ORIGIN_NAME}." >&2
  exit 1
fi

echo "Origin group: ${ORIGIN_GROUP}"
echo "Origin: ${ORIGIN_NAME}"
echo "Origin host: ${ORIGIN_HOST}"
echo "Origin host header: ${ORIGIN_HOST_HEADER}"

echo
echo "3/8 Discovering Container Apps environment..."

if [[ -n "${ACA_ENV_NAME:-}" && -n "${ACA_ENV_RESOURCE_GROUP:-}" ]]; then
  ACA_ENV_NAME_FINAL="${ACA_ENV_NAME}"
  ACA_ENV_RG="${ACA_ENV_RESOURCE_GROUP}"
  ACA_ENV_ID="$(
    az containerapp env show \
      --name "$ACA_ENV_NAME_FINAL" \
      --resource-group "$ACA_ENV_RG" \
      --query id \
      -o tsv
  )"
else
  MATCHING_APPS_JSON="$(
    az containerapp list \
      --query "[?properties.configuration.ingress.fqdn=='${ORIGIN_HOST}'].{name:name, resourceGroup:resourceGroup, environmentId:properties.environmentId}" \
      -o json
  )"

  if [[ "$(json_len "$MATCHING_APPS_JSON")" -eq 1 ]]; then
    ACA_ENV_ID="$(jq -r '.[0].environmentId' <<<"$MATCHING_APPS_JSON")"
    ACA_ENV_NAME_FINAL="$(basename "$ACA_ENV_ID")"
    ACA_ENV_RG="$(awk -F/ '{for(i=1;i<=NF;i++){if($i=="resourceGroups"){print $(i+1); exit}}}' <<<"$ACA_ENV_ID")"
  else
    ENVS_JSON="$(
      az containerapp env list \
        --query "[].{name:name, resourceGroup:resourceGroup, id:id}" \
        -o json
    )"
    pick_one_or_exit "$ENVS_JSON" "Container Apps environments"
    ACA_ENV_NAME_FINAL="$(jq -r '.[0].name' <<<"$ENVS_JSON")"
    ACA_ENV_RG="$(jq -r '.[0].resourceGroup' <<<"$ENVS_JSON")"
    ACA_ENV_ID="$(jq -r '.[0].id' <<<"$ENVS_JSON")"
  fi
fi

ACA_ENV_JSON="$(
  az containerapp env show \
    --name "$ACA_ENV_NAME_FINAL" \
    --resource-group "$ACA_ENV_RG" \
    -o json
)"

ACA_ENV_LOCATION="$(jq -r '.location' <<<"$ACA_ENV_JSON")"
ACA_ENV_PNA="$(jq -r '.properties.publicNetworkAccess // "Enabled"' <<<"$ACA_ENV_JSON")"

echo "Container Apps environment: ${ACA_ENV_RG}/${ACA_ENV_NAME_FINAL}"
echo "Container Apps environment id: ${ACA_ENV_ID}"
echo "Container Apps environment location: ${ACA_ENV_LOCATION}"
echo "Current publicNetworkAccess: ${ACA_ENV_PNA}"

echo
echo "4/8 Enabling Private Link on Front Door origin..."

az afd origin update \
  --profile-name "$AFD_NAME" \
  --resource-group "$AFD_RG" \
  --origin-group-name "$ORIGIN_GROUP" \
  --origin-name "$ORIGIN_NAME" \
  --enable-private-link true \
  --private-link-resource "$ACA_ENV_ID" \
  --private-link-location "$ACA_ENV_LOCATION" \
  --private-link-sub-resource-type managedEnvironment \
  --private-link-request-message "GreenChainz Front Door private origin approval $(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --enabled-state Enabled \
  --only-show-errors \
  -o none

echo "Private Link requested on origin."

echo
echo "5/8 Waiting for Container Apps private endpoint connection request..."

PEC_ID=""
for i in $(seq 1 60); do
  CONNECTIONS_JSON="$(
    az network private-endpoint-connection list \
      --id "$ACA_ENV_ID" \
      -o json 2>/dev/null || echo "[]"
  )"

  PEC_ID="$(
    jq -r '
      [
        .[]
        | select(
            ((.properties.privateLinkServiceConnectionState.status // "") == "Pending")
            or
            ((.privateLinkServiceConnectionState.status // "") == "Pending")
          )
        | .id
      ][0] // empty
    ' <<<"$CONNECTIONS_JSON"
  )"

  if [[ -n "$PEC_ID" ]]; then
    break
  fi

  echo "Waiting for pending private endpoint connection... ${i}/60"
  sleep 10
done

if [[ -z "$PEC_ID" ]]; then
  echo "No pending private endpoint connection was found on ${ACA_ENV_ID}." >&2
  echo "Existing connections:" >&2
  az network private-endpoint-connection list --id "$ACA_ENV_ID" -o table >&2 || true
  exit 1
fi

echo "Pending private endpoint connection: ${PEC_ID}"

echo
echo "6/8 Approving private endpoint connection..."

az network private-endpoint-connection approve \
  --id "$PEC_ID" \
  --description "Approved for GreenChainz Azure Front Door Premium private origin" \
  --only-show-errors \
  -o none

echo "Approved private endpoint connection."

echo
echo "Waiting for private endpoint connection to become Approved..."

for i in $(seq 1 90); do
  PEC_STATUS="$(
    az network private-endpoint-connection show \
      --id "$PEC_ID" \
      --query "properties.privateLinkServiceConnectionState.status" \
      -o tsv 2>/dev/null || true
  )"

  echo "Private endpoint status: ${PEC_STATUS:-unknown} (${i}/90)"

  if [[ "$PEC_STATUS" == "Approved" ]]; then
    break
  fi

  sleep 10
done

if [[ "${PEC_STATUS:-}" != "Approved" ]]; then
  echo "Private endpoint did not reach Approved state in time. Refusing to disable public access." >&2
  exit 1
fi

echo
echo "7/8 Validating Front Door before origin lockdown..."

if [[ -n "${PUBLIC_TEST_URL:-}" ]]; then
  TEST_URL="${PUBLIC_TEST_URL}"
else
  ENDPOINTS_JSON="$(
    az afd endpoint list \
      --profile-name "$AFD_NAME" \
      --resource-group "$AFD_RG" \
      --query "[?enabledState=='Enabled'].{name:name, hostName:hostName}" \
      -o json
  )"
  pick_one_or_exit "$ENDPOINTS_JSON" "enabled Front Door endpoints"
  AFD_ENDPOINT_HOST="$(jq -r '.[0].hostName' <<<"$ENDPOINTS_JSON")"
  TEST_URL="https://${AFD_ENDPOINT_HOST}/"
fi

echo "Testing through Front Door: ${TEST_URL}"

HTTP_CODE="$(
  curl \
    --silent \
    --show-error \
    --location \
    --max-redirs 0 \
    --connect-timeout 10 \
    --max-time 30 \
    --output /dev/null \
    --write-out "%{http_code}" \
    "$TEST_URL" || echo "000"
)"

echo "Front Door HTTP status before lockdown: ${HTTP_CODE}"

if [[ "$HTTP_CODE" == "000" || "$HTTP_CODE" -ge 500 ]]; then
  echo "Front Door validation failed before lockdown. Refusing to disable public access." >&2
  exit 1
fi

echo
echo "8/8 Disabling public network access on Container Apps environment..."

ROLLBACK_CMD="az resource update --ids '${ACA_ENV_ID}' --set properties.publicNetworkAccess=Enabled -o none"
echo "Rollback command if needed:"
echo "$ROLLBACK_CMD"

az resource update \
  --ids "$ACA_ENV_ID" \
  --set properties.publicNetworkAccess=Disabled \
  --only-show-errors \
  -o none

echo "publicNetworkAccess set to Disabled. Waiting 60 seconds for propagation..."
sleep 60

ACA_ENV_PNA_AFTER="$(
  az containerapp env show \
    --name "$ACA_ENV_NAME_FINAL" \
    --resource-group "$ACA_ENV_RG" \
    --query "properties.publicNetworkAccess" \
    -o tsv
)"

echo "Container Apps publicNetworkAccess after lockdown: ${ACA_ENV_PNA_AFTER}"

HTTP_CODE_AFTER="$(
  curl \
    --silent \
    --show-error \
    --location \
    --max-redirs 0 \
    --connect-timeout 10 \
    --max-time 30 \
    --output /dev/null \
    --write-out "%{http_code}" \
    "$TEST_URL" || echo "000"
)"

echo "Front Door HTTP status after lockdown: ${HTTP_CODE_AFTER}"

if [[ "$HTTP_CODE_AFTER" == "000" || "$HTTP_CODE_AFTER" -ge 500 ]]; then
  echo "Front Door failed after disabling public access. Rolling back publicNetworkAccess to Enabled..." >&2
  az resource update \
    --ids "$ACA_ENV_ID" \
    --set properties.publicNetworkAccess=Enabled \
    --only-show-errors \
    -o none
  echo "Rollback complete. Investigate Front Door origin health / Private Link approval before retrying." >&2
  exit 1
fi

echo
echo "DONE."
echo "Container Apps origin is now reachable through Front Door Private Link and public network access is disabled."
echo "Final test URL: ${TEST_URL}"
