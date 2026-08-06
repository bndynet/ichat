import type {
  ChatMessage,
  ChatPartActionDetail,
  ChatPartActionKind,
  MessagePart,
} from "./types.js";

/** Build the unified `part-action` event detail. */
export function createPartActionDetail<TDetail>(params: {
  kind: ChatPartActionKind;
  action: string;
  message: ChatMessage;
  payload: TDetail;
  part?: MessagePart;
}): ChatPartActionDetail<TDetail> {
  return {
    kind: params.kind,
    action: params.action,
    messageId: params.message.id,
    message: params.message,
    partId: params.part?.id,
    partType: params.part?.type,
    part: params.part,
    payload: params.payload,
  };
}
