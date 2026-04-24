import { callMake } from "./client";
import { SCENARIOS } from "./scenarios";

export async function uploadImage(params: {
  tenantId: string;
  makeConnectionRef: string;
  adAccountActId: string;
  imageUrl: string; // public URL; Make will fetch and upload
  filename?: string;
}) {
  return callMake<{ hash: string; url: string }>({
    tenantId: params.tenantId,
    scenario: SCENARIOS.IMAGE_UPLOAD,
    payload: {
      make_connection_ref: params.makeConnectionRef,
      ad_account_id: params.adAccountActId,
      params: {
        image_url: params.imageUrl,
        filename: params.filename,
      },
    },
  });
}

export async function uploadVideo(params: {
  tenantId: string;
  makeConnectionRef: string;
  adAccountActId: string;
  videoUrl: string;
  name?: string;
}) {
  return callMake<{ id: string }>({
    tenantId: params.tenantId,
    scenario: SCENARIOS.VIDEO_UPLOAD,
    payload: {
      make_connection_ref: params.makeConnectionRef,
      ad_account_id: params.adAccountActId,
      params: {
        file_url: params.videoUrl,
        name: params.name,
      },
    },
  });
}

export async function createCreative(params: {
  tenantId: string;
  makeConnectionRef: string;
  adAccountActId: string;
  name: string;
  objectStorySpec: Record<string, unknown>;
}) {
  return callMake<{ id: string }>({
    tenantId: params.tenantId,
    scenario: SCENARIOS.CREATIVE_CREATE,
    payload: {
      make_connection_ref: params.makeConnectionRef,
      ad_account_id: params.adAccountActId,
      params: {
        name: params.name,
        object_story_spec: params.objectStorySpec,
      },
    },
  });
}
