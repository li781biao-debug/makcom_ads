import { callMake } from "./client";
import { SCENARIOS } from "./scenarios";

export async function listAds(params: {
  tenantId: string;
  makeConnectionRef: string;
  adSetId: string;
}) {
  return callMake({
    tenantId: params.tenantId,
    scenario: SCENARIOS.AD_LIST,
    payload: {
      make_connection_ref: params.makeConnectionRef,
      adset_id: params.adSetId,
    },
  });
}

export async function createAd(params: {
  tenantId: string;
  makeConnectionRef: string;
  adAccountActId: string;
  name: string;
  adSetId: string;
  creativeId: string;
  status?: "ACTIVE" | "PAUSED";
}) {
  return callMake<{ id: string }>({
    tenantId: params.tenantId,
    scenario: SCENARIOS.AD_CREATE,
    payload: {
      make_connection_ref: params.makeConnectionRef,
      ad_account_id: params.adAccountActId,
      params: {
        name: params.name,
        adset_id: params.adSetId,
        creative: { creative_id: params.creativeId },
        status: params.status ?? "PAUSED",
      },
    },
  });
}
