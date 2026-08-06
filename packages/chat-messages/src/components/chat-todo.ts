import { LitElement, html, unsafeCSS, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { setVersionAttribute } from "../version.js";
import type { TodoItem, TodoItemStatus, TodoPart } from "../types.js";
import type { TodoLabels } from "../i18n.js";
import { CHAT_LABELS_EN } from "../i18n.js";
import {
  getTodoInitialExpanded,
  shouldInitializeTodoExpansion,
} from "../todo-collapse.js";
import { chatIcons } from "../icons.js";
import styles from "../styles/chat-todo.scss";

const NEXT_STATUS: Record<TodoItemStatus, TodoItemStatus> = {
  pending: "active",
  active: "done",
  done: "pending",
  error: "pending",
  skipped: "pending",
};

/**
 * Compact, collapsible todo panel for a structured {@link TodoPart}.
 *
 * @fires part-action - Unified action event (`kind: 'todo'`).
 */
@customElement("i-chat-todo")
export class ChatTodo extends LitElement {
  static styles = unsafeCSS(styles);

  @property({ attribute: false }) data!: TodoPart;
  @property({ attribute: false }) labels?: TodoLabels;

  @query("details") private _details!: HTMLDetailsElement;
  @state() private _expanded = true;
  private _initializedPartId?: string;

  override connectedCallback(): void {
    super.connectedCallback();
    setVersionAttribute(this);
  }

  protected updated(): void {
    if (shouldInitializeTodoExpansion(this._initializedPartId, this.data?.id)) {
      this._initializedPartId = this.data.id;
      this._details.open = getTodoInitialExpanded(this.data);
      this._expanded = this._details.open;
    }
  }

  private _handleToggle(event: Event): void {
    this._expanded = (event.currentTarget as HTMLDetailsElement).open;
    this.dispatchEvent(
      new CustomEvent("chat-content-resize", { bubbles: true, composed: true }),
    );
  }

  private _statusLabel(status: TodoItemStatus, labels: TodoLabels): string {
    return labels[status];
  }

  private _requestStatusChange(item: TodoItem): void {
    if (this.data.interactive === false) return;
    this.dispatchEvent(
      new CustomEvent("part-action", {
        detail: {
          kind: "todo",
          action: "change-status",
          itemId: item.id,
          previousStatus: item.status,
          status: NEXT_STATUS[item.status],
          part: this.data,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _renderStatusIcon(status: TodoItemStatus) {
    switch (status) {
      case "active":
        return chatIcons.todoActive();
      case "done":
        return chatIcons.todoDone();
      case "error":
        return chatIcons.todoError();
      case "skipped":
        return chatIcons.todoSkipped();
      case "pending":
      default:
        return chatIcons.todoPending();
    }
  }

  render() {
    const part = this.data;
    if (!part) return nothing;

    const labels = this.labels ?? CHAT_LABELS_EN.todo;
    const completed = part.items.filter(
      (item) => item.status === "done",
    ).length;
    const interactive = part.interactive !== false;

    return html`
      <details class="todo" @toggle=${this._handleToggle}>
        <summary
          class="todo__header"
          aria-label=${this._expanded ? labels.collapse : labels.expand}
        >
          <span class="todo__heading-icon" aria-hidden="true">
            ${chatIcons.todoList()}
          </span>
          <span class="todo__title"
            >${part.title ?? labels.title} ${part.items.length}</span
          >
          <span class="todo__progress"
            >${labels.progress(completed, part.items.length)}</span
          >
          <span
            class="todo__toggle"
            title=${this._expanded ? labels.collapse : labels.expand}
          >
            ${chatIcons.chevronRight({ className: "todo__chevron", size: 18, strokeWidth: 2.2 })}
          </span>
        </summary>

        <ol class="todo__list" role="list">
          ${part.items.map(
            (item) =>
              html`<li
                class="todo__item todo__item--${item.status}"
                data-item-id=${item.id}
                role="listitem"
              >
                <button
                  class="todo__status"
                  type="button"
                  ?disabled=${!interactive}
                  aria-checked=${item.status === "done" ? "true" : "false"}
                  aria-label=${`${item.title}: ${this._statusLabel(item.status, labels)}. ${labels.changeStatus}`}
                  title=${interactive ? labels.changeStatus : this._statusLabel(item.status, labels)}
                  @click=${() => this._requestStatusChange(item)}
                >
                  ${this._renderStatusIcon(item.status)}
                </button>
                <span class="todo__content">
                  <span class="todo__item-title">${item.title}</span>
                  ${
                    item.description
                      ? html`<span class="todo__description"
                          >${item.description}</span
                        >`
                      : nothing
                  }
                </span>
              </li>`,
          )}
        </ol>
      </details>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "i-chat-todo": ChatTodo;
  }
}
