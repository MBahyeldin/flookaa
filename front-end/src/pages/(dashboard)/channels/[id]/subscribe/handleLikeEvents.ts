import type { WsEventMessage } from "@/types/Ws";

async function handleLikeEvents({ payload }: { payload: WsEventMessage }) {
  console.log(payload);

  // const { target_id, target_type, action } = payload.event;
  // const inc = action === "create" ? 1 : action === "delete" ? -1 : 0;
  // if (target_type !== "POST") return;
}

export default handleLikeEvents;
