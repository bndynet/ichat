import type {
  ChatFormFieldValues,
  ChatFormSubmitDetail,
  ChatMessage,
  ChatPartActionDetail,
  ChatPartActionKind,
  MessagePart,
  TodoActionDetail,
  ToolActionDetail,
} from './types.js';

/**
 * @deprecated Internal compatibility payload for `form-submit`. Prefer
 * `part-action` (`kind: 'form-submit'`) for host integrations.
 */
export interface ChatFormSubmitRequestDetail {
  formId: string;
  title?: string;
  values: ChatFormFieldValues;
}

/**
 * @deprecated Internal compatibility payload for `todo-action`. Prefer
 * `part-action` (`kind: 'todo-action'`) for host integrations.
 */
export type TodoActionRequestDetail = Omit<TodoActionDetail, 'messageId' | 'message'>;

/**
 * @deprecated Internal compatibility payload for `tool-action`. Prefer
 * `part-action` (`kind: 'tool-action'`) for host integrations.
 */
export type ToolActionRequestDetail = Omit<ToolActionDetail, 'messageId' | 'message'>;

/** Attach the owning message context to a form submit event detail. */
export function createFormSubmitDetail(
  message: ChatMessage,
  detail: ChatFormSubmitRequestDetail,
): ChatFormSubmitDetail {
  return {
    formId: detail.formId,
    title: detail.title ?? '',
    values: detail.values,
    messageId: message.id,
    message,
  };
}

/** Attach the owning message context to a todo action event detail. */
export function createTodoActionDetail(
  message: ChatMessage,
  detail: TodoActionRequestDetail,
): TodoActionDetail {
  return {
    action: detail.action,
    itemId: detail.itemId,
    previousStatus: detail.previousStatus,
    status: detail.status,
    part: detail.part,
    messageId: message.id,
    message,
  };
}

/** Attach the owning message context to a tool-call action event detail. */
export function createToolActionDetail(
  message: ChatMessage,
  detail: ToolActionRequestDetail,
): ToolActionDetail {
  return {
    action: detail.action,
    toolCallId: detail.toolCallId,
    part: detail.part,
    messageId: message.id,
    message,
  };
}

/** Build the unified `part-action` event detail around a legacy action detail. */
export function createPartActionDetail<TDetail>(params: {
  kind: ChatPartActionKind;
  action: string;
  message: ChatMessage;
  detail: TDetail;
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
    detail: params.detail,
  };
}
