import type { ReactiveController, ReactiveControllerHost } from 'lit';

export class StreamingController implements ReactiveController {
  private _host: ReactiveControllerHost;
  private _fullContent = '';
  private _visibleLength = 0;
  private _rafId: number | null = null;
  private _charsPerTick: number;
  private _active = false;
  private _onComplete?: () => void;

  constructor(
    host: ReactiveControllerHost,
    options?: { speed?: number; onComplete?: () => void }
  ) {
    this._host = host;
    this._host.addController(this);
    this._charsPerTick = options?.speed ?? 3;
    this._onComplete = options?.onComplete;
  }

  get displayedContent(): string {
    if (!this._active) return this._fullContent;
    return this._fullContent.slice(0, this._visibleLength);
  }

  get isAnimating(): boolean {
    return this._active && this._visibleLength < this._fullContent.length;
  }

  get progress(): number {
    if (!this._fullContent.length) return 1;
    return this._visibleLength / this._fullContent.length;
  }

  setContent(content: string, animate = true): void {
    const wasComplete = this._visibleLength >= this._fullContent.length;
    this._fullContent = content;

    if (animate && this._charsPerTick > 0 && this._visibleLength < content.length) {
      this._active = true;
      this._startAnimation();
    } else if (!animate || this._charsPerTick <= 0) {
      // animate=false or speed=0 both mean: show everything instantly, no rAF
      this._visibleLength = content.length;
      this._active = false;
      this._host.requestUpdate();
    } else if (wasComplete && this._visibleLength >= content.length) {
      this._active = false;
      this._host.requestUpdate();
    }
  }

  complete(): void {
    this._visibleLength = this._fullContent.length;
    this._active = false;
    this._cancelAnimation();
    this._host.requestUpdate();
    this._onComplete?.();
  }

  /**
   * Freeze the animation at the current visible position without revealing
   * remaining content and without firing the onComplete callback.
   * Use this when the stream is aborted mid-flight.
   */
  freeze(): void {
    this._active = false;
    this._cancelAnimation();
    this._host.requestUpdate();
  }

  reset(): void {
    this._fullContent = '';
    this._visibleLength = 0;
    this._active = false;
    this._cancelAnimation();
    this._host.requestUpdate();
  }

  setSpeed(charsPerTick: number): void {
    this._charsPerTick = charsPerTick;
  }

  private _startAnimation(): void {
    if (this._rafId !== null) return;
    this._tick();
  }

  private _tick = (): void => {
    if (this._visibleLength >= this._fullContent.length || this._charsPerTick <= 0) {
      this._visibleLength = this._fullContent.length;
      this._active = false;
      this._rafId = null;
      this._host.requestUpdate();
      this._onComplete?.();
      return;
    }

    this._visibleLength = Math.min(
      this._visibleLength + this._charsPerTick,
      this._fullContent.length
    );
    this._host.requestUpdate();
    this._rafId = requestAnimationFrame(this._tick);
  };

  private _cancelAnimation(): void {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  hostDisconnected(): void {
    this._cancelAnimation();
  }
}
