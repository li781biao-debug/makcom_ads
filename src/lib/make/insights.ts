import { callMake } from "./client";
import { SCENARIOS } from "./scenarios";

export interface InsightsQuery {
  tenantId: string;
  makeConnectionRef: string;
  adAccountActId: string;
  level: "account" | "campaign" | "adset" | "ad";
  datePreset?: string; // e.g. "last_7d", "last_30d"
  timeRange?: { since: string; until: string };
  fields?: string[];
  breakdowns?: string[];
  filtering?: Array<{ field: string; operator: string; value: unknown }>;
}

export async function getInsights(query: InsightsQuery) {
  return callMake<{ data: Array<Record<string, unknown>> }>({
    tenantId: query.tenantId,
    scenario: SCENARIOS.META_INSIGHTS,
    payload: {
      make_connection_ref: query.makeConnectionRef,
      ad_account_id: query.adAccountActId,
      params: {
        level: query.level,
        date_preset: query.datePreset,
        time_range: query.timeRange,
        fields: query.fields ?? [
          "impressions",
          "clicks",
          "spend",
          "cpm",
          "ctr",
          "actions",
        ],
        breakdowns: query.breakdowns,
        filtering: query.filtering,
      },
    },
  });
}
