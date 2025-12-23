import { useAppStore } from "@/stores/AppStore";
import type { WsEventMessage } from "@/types/Ws";

async function handleLikeEvents({ payload }: { payload: WsEventMessage }) {
  console.log(payload);

  const { target_id, target_type, action } = payload.event;

  const { addOrRemoveLike } = useAppStore.getState();

  let inc = 0;
  if (action === "create") {
    inc = 1;
  } else if (action === "delete") {
    inc = -1;
  }

  if (target_type === "POST" || target_type === "COMMENT") {
    addOrRemoveLike(target_type, target_id, inc);
  }
}

export default handleLikeEvents;
