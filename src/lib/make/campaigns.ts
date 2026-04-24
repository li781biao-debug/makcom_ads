import { callMake } from "./client";
import { SCENARIOS } from "./scenarios";

export interface MetaCampaign {
  id: string;
  name: string;
  objective: string;
  status: string;
  daily_budget?: string;
  lifetime_budget?: string;
}

export async function listCampaigns(params: {
  tenantId: string;
  makeConnectionRef: string;
  adAccountActId: string;
  limit?: number;
}) {
  return callMake<{ data: MetaCampaign[] }>({
    tenantId: params.tenantId,
    scenario: SCENARIOS.CAMPAIGN_LIST,
    payload: {
      make_connection_ref: params.makeConnectionRef,
      ad_account_id: params.adAccountActId,
      limit: params.limit ?? 100,
    },
  });
}

export async function createCampaign(params: {
  tenantId: string;
  makeConnectionRef: string;
  adAccountActId: string;
  name: string;
  objective: string;
  status?: "ACTIVE" | "PAUSED";
  special_ad_categories?: string[];
  daily_budget?: number; // in account currency cents
}) {
  return callMake<{ id: string }>({
    tenantId: params.tenantId,
    scenario: SCENARIOS.CAMPAIGN_CREATE,
    payload: {
      make_connection_ref: params.makeConnectionRef,
      ad_account_id: params.adAccountActId,
      params: {
        name: params.name,
        objective: params.objective,
        status: params.status ?? "PAUSED",
        special_ad_categories: params.special_ad_categories ?? [],
        daily_budget: params.daily_budget,
      },
    },
  });
}

export async function updateCampaign(params: {
  tenantId: string;
  makeConnectionRef: string;
  metaCampaignId: string;
  updates: Partial<{
    name: string;
    status: "ACTIVE" | "PAUSED" | "ARCHIVED" | "DELETED";
    daily_budget: number;
  }>;
}) {
  return callMake<{ success: boolean }>({
    tenantId: params.tenantId,
    scenario: SCENARIOS.CAMPAIGN_UPDATE,
    payload: {
      make_connection_ref: params.makeConnectionRef,
      campaign_id: params.metaCampaignId,
      params: params.updates,
    },
  });
}
