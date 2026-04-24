import { callMake } from "./client";
import { SCENARIOS } from "./scenarios";

export async function listAdSets(params: {
  tenantId: string;
  makeConnectionRef: string;
  campaignId: string;
}) {
  return callMake({
    tenantId: params.tenantId,
    scenario: SCENARIOS.ADSET_LIST,
    payload: {
      make_connection_ref: params.makeConnectionRef,
      campaign_id: params.campaignId,
    },
  });
}

export async function createAdSet(params: {
  tenantId: string;
  makeConnectionRef: string;
  adAccountActId: string;
  name: string;
  campaignId: string;
  dailyBudget: number;
  billingEvent: string; // e.g. "IMPRESSIONS"
  optimizationGoal: string; // e.g. "LINK_CLICKS"
  targeting: Record<string, unknown>;
  startTime?: string;
  endTime?: string;
  status?: "ACTIVE" | "PAUSED";
}) {
  return callMake<{ id: string }>({
    tenantId: params.tenantId,
    scenario: SCENARIOS.ADSET_CREATE,
    payload: {
      make_connection_ref: params.makeConnectionRef,
      ad_account_id: params.adAccountActId,
      params: {
        name: params.name,
        campaign_id: params.campaignId,
        daily_budget: params.dailyBudget,
        billing_event: params.billingEvent,
        optimization_goal: params.optimizationGoal,
        targeting: params.targeting,
        start_time: params.startTime,
        end_time: params.endTime,
        status: params.status ?? "PAUSED",
      },
    },
  });
}
