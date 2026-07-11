import { LitElement, html, unsafeCSS, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import type { TodoItem, TodoItemStatus, TodoPart } from '../types.js';
import type { TodoLabels } from '../i18n.js';
import { CHAT_LABELS_EN } from '../i18n.js';
import styles from '../styles/chat-todo.scss';

type TodoActionRequestDetail = {
  action: 'change-status';
  itemId: string;
  previousStatus: TodoItemStatus;
  status: TodoItemStatus;
  part: TodoPart;
};

const NEXT_STATUS: Record<TodoItemStatus, TodoItemStatus> = {
  pending: 'active',
  active: 'done',
  done: 'pending',
  error: 'pending',
  skipped: 'pending',
};

/**
 * Compact, collapsible todo panel for a structured {@link TodoPart}.
 *
 * @fires todo-action - A requested item status change. The owning
 * `i-chat-message` enriches the event with `messageId` and `message`.
 */
@customElement('i-chat-todo')
export class ChatTodo extends LitElement {
  static styles = unsafeCSS(styles);

  @property({ attribute: false }) data!: TodoPart;
  @property({ attribute: false }) labels?: TodoLabels;

  @query('details') private _details!: HTMLDetailsElement;
  @state() private _expanded = true;
  private _initializedPartId?: string;

  protected updated(): void {
    if (this.data?.id && this.data.id !== this._initializedPartId) {
      this._initializedPartId = this.data.id;
      this._details.open = !this.data.defaultCollapsed;
      this._expanded = this._details.open;
    }
  }

  private _handleToggle(event: Event): void {
    this._expanded = (event.currentTarget as HTMLDetailsElement).open;
    this.dispatchEvent(
      new CustomEvent('chat-content-resize', { bubbles: true, composed: true })
    );
  }

  private _statusLabel(status: TodoItemStatus, labels: TodoLabels): string {
    return labels[status];
  }

  private _requestStatusChange(item: TodoItem): void {
    if (this.data.interactive === false) return;
    const detail: TodoActionRequestDetail = {
      action: 'change-status',
      itemId: item.id,
      previousStatus: item.status,
      status: NEXT_STATUS[item.status],
      part: this.data,
    };
    this.dispatchEvent(
      new CustomEvent<TodoActionRequestDetail>('todo-action', {
        detail,
        bubbles: true,
        composed: true,
      })
    );
  }

  private _renderStatusIcon(status: TodoItemStatus) {
    switch (status) {
      case 'active':
        return html`<svg viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="10" cy="10" r="7.5"></circle>
          <path d="M7 10h6m-2.5-2.5L13 10l-2.5 2.5"></path>
        </svg>`;
      case 'done':
        return html`<svg viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="10" cy="10" r="7.5"></circle>
          <path d="m6.5 10 2.2 2.2 4.8-4.8"></path>
        </svg>`;
      case 'error':
        return html`<svg viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="10" cy="10" r="7.5"></circle>
          <path d="m7.5 7.5 5 5m0-5-5 5"></path>
        </svg>`;
      case 'skipped':
        return html`<svg viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="10" cy="10" r="7.5"></circle>
          <path d="M7 10h6"></path>
        </svg>`;
      case 'pending':
      default:
        return html`<svg viewBox="0 0 20 20" aria-hidden="true">
          <circle class="todo__pending-circle" cx="10" cy="10" r="7.5"></circle>
        </svg>`;
    }
  }

  render() {
    const part = this.data;
    if (!part) return nothing;

    const labels = this.labels ?? CHAT_LABELS_EN.todo;
    const completed = part.items.filter((item) => item.status === 'done').length;
    const interactive = part.interactive !== false;

    return html`
      <details class="todo" @toggle=${this._handleToggle}>
        <summary
          class="todo__header"
          aria-label=${this._expanded ? labels.collapse : labels.expand}
        >
          <span class="todo__heading-icon" aria-hidden="true">
            <svg viewBox="0 0 20 20">
              <circle cx="4" cy="5" r="1.25"></circle>
              <circle cx="4" cy="10" r="1.25"></circle>
              <circle cx="4" cy="15" r="1.25"></circle>
              <path d="M8 5h8M8 10h8M8 15h8"></path>
            </svg>
          </span>
          <span class="todo__title">${part.title ?? labels.title} ${part.items.length}</span>
          <span class="todo__progress">${labels.progress(completed, part.items.length)}</span>
          <span
            class="todo__toggle"
            title=${this._expanded ? labels.collapse : labels.expand}
          >
            <svg class="todo__chevron" viewBox="0 0 20 20" aria-hidden="true">
              <path d="m8 5 5 5-5 5"></path>
            </svg>
          </span>
        </summary>

        <ol class="todo__list">
          ${part.items.map(
            (item) => html`<li class="todo__item todo__item--${item.status}">
              <button
                class="todo__status"
                type="button"
                ?disabled=${!interactive}
                aria-label=${`${item.title}: ${this._statusLabel(item.status, labels)}. ${labels.changeStatus}`}
                title=${interactive ? labels.changeStatus : this._statusLabel(item.status, labels)}
                @click=${() => this._requestStatusChange(item)}
              >
                ${this._renderStatusIcon(item.status)}
              </button>
              <span class="todo__content">
                <span class="todo__item-title">${item.title}</span>
                ${item.description
                  ? html`<span class="todo__description">${item.description}</span>`
                  : nothing}
              </span>
            </li>`
          )}
        </ol>
      </details>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'i-chat-todo': ChatTodo;
  }
}
