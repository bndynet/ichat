import type {
  ChatFormFieldValues,
  ChatFormSubmitDetail,
  ChatMessage,
  TodoActionDetail,
} from './types.js';

export interface ChatFormSubmitRequestDetail {
  formId: string;
  title?: string;
  values: ChatFormFieldValues;
}

export type TodoActionRequestDetail = Omit<TodoActionDetail, 'messageId' | 'message'>;

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
