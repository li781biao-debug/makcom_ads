export const SCENARIOS = {
  META_CONNECT: "meta.connect",
  META_LIST_ADACCOUNTS: "meta.list_adaccounts",
  META_INSIGHTS: "meta.insights",
  CAMPAIGN_LIST: "meta.campaign.list",
  CAMPAIGN_CREATE: "meta.campaign.create",
  CAMPAIGN_UPDATE: "meta.campaign.update",
  ADSET_LIST: "meta.adset.list",
  ADSET_CREATE: "meta.adset.create",
  AD_LIST: "meta.ad.list",
  AD_CREATE: "meta.ad.create",
  CREATIVE_CREATE: "meta.creative.create",
  IMAGE_UPLOAD: "meta.image.upload",
  VIDEO_UPLOAD: "meta.video.upload",
} as const;

export type ScenarioKey = (typeof SCENARIOS)[keyof typeof SCENARIOS];

export const SCENARIO_ENV: Record<ScenarioKey, string> = {
  "meta.connect": "MAKE_WEBHOOK_META_CONNECT",
  "meta.list_adaccounts": "MAKE_WEBHOOK_META_LIST_ADACCOUNTS",
  "meta.insights": "MAKE_WEBHOOK_META_INSIGHTS",
  "meta.campaign.list": "MAKE_WEBHOOK_CAMPAIGN_LIST",
  "meta.campaign.create": "MAKE_WEBHOOK_CAMPAIGN_CREATE",
  "meta.campaign.update": "MAKE_WEBHOOK_CAMPAIGN_UPDATE",
  "meta.adset.list": "MAKE_WEBHOOK_ADSET_LIST",
  "meta.adset.create": "MAKE_WEBHOOK_ADSET_CREATE",
  "meta.ad.list": "MAKE_WEBHOOK_AD_LIST",
  "meta.ad.create": "MAKE_WEBHOOK_AD_CREATE",
  "meta.creative.create": "MAKE_WEBHOOK_CREATIVE_CREATE",
  "meta.image.upload": "MAKE_WEBHOOK_IMAGE_UPLOAD",
  "meta.video.upload": "MAKE_WEBHOOK_VIDEO_UPLOAD",
};
