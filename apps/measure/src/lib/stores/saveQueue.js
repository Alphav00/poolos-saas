/**
 * Save queue: debounced, retryable, testable.
 *
 * Used by the job store to auto-save edits. No Svelte dependencies, so this
 * can be unit-tested in plain Node.
 *
 * Events emitted:
 *   - 'dirty'      data changed, save scheduled
 *   - 'saving'     a save is in flight
 *   - 'saved'      save succeeded; includes { at, result } (what save() returned)
 *   - 'error'      save failed; includes { error, retryInMs, fatal, permanent }
 *     - fatal=true means retries exhausted; user must intervene
 *     - permanent=true means `isPermanent(error)` said retrying cannot help
 *       (e.g. the server rejected the body); it is fatal at once
 *
 * Behavior:
 *   - schedule() debounces by `debounceMs`; rapid edits coalesce to one save
 *   - On error, retries with exponential backoff (1s, 2s, 4s, 8s, ... capped at 30s)
 *   - Up to `maxRetries` retries before giving up
 *   - An error `isPermanent` accepts is not retried; the next edit tries again
 *   - If edits come in during retry, the retry is canceled and a fresh save
 *     is run with the latest snapshot
 *   - run() is safe to call from anywhere; concurrent calls are coalesced
 *   - idle() waits out the save in flight, so a caller can leave after it
 *   - close() ends the queue's life: no new debounce, and a failed save in flight
 *     is not retried (a store that was left must not keep saving old edits)
 */
export class SaveQueue {
  constructor({
    save,
    debounceMs = 500,
    maxRetries = 5,
    retryBaseMs = 1000,
    retryCapMs = 30000,
    isPermanent = () => false,
    now = () => Date.now(),
  }) {
    if (typeof save !== 'function') {
      throw new TypeError('SaveQueue requires a save() function');
    }
    this.save = save;
    this.debounceMs = debounceMs;
    this.maxRetries = maxRetries;
    this.retryBaseMs = retryBaseMs;
    this.retryCapMs = retryCapMs;
    this.isPermanent = isPermanent;
    this._now = now;

    this._timer = null;
    this._inFlight = false;
    this._needResave = false;
    this._retries = 0;
    this._listeners = new Map();
    this._lastError = null;
    this._idleWaiters = [];
    this._closed = false;
  }

  on(event, fn) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event).add(fn);
    return () => {
      const s = this._listeners.get(event);
      if (s) s.delete(fn);
    };
  }

  _emit(event, data) {
    for (const fn of this._listeners.get(event) || []) {
      try { fn(data); } catch { /* listener bugs should not break the queue */ }
    }
  }

  /** Mark data as dirty; debounce a save. */
  schedule() {
    if (this._closed) return;
    this._emit('dirty', { at: this._now() });
    if (this._timer) clearTimeout(this._timer);
    this._timer = setTimeout(() => this.run(), this.debounceMs);
  }

  /** Force an immediate save (e.g. on user "Save now" click or before unload). */
  flush() {
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    return this.run();
  }

  /** Cancel any pending save (e.g. on unmount or after fatal error). */
  cancel() {
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
  }

  /** Stop for good: clear the timer; a save in flight may finish but is not retried. */
  close() {
    this._closed = true;
    this.cancel();
  }

  /** Resolves once no save is in flight (a follow-up save included). */
  idle() {
    if (!this._inFlight) return Promise.resolve();
    return new Promise((resolve) => this._idleWaiters.push(resolve));
  }

  get status() {
    return {
      inFlight: this._inFlight,
      scheduled: this._timer !== null,
      retries: this._retries,
      lastError: this._lastError,
    };
  }

  async run() {
    if (this._inFlight) {
      this._needResave = true;
      return { status: 'coalesced' };
    }
    this._inFlight = true;
    this._emit('saving', { at: this._now() });

    try {
      const result = await this.save();
      this._retries = 0;
      this._lastError = null;
      this._emit('saved', { at: this._now(), result });
      return { status: 'ok', result };
    } catch (err) {
      this._lastError = err;
      if (this.isPermanent(err)) {
        // Sending the same body again gets the same answer; wait for an edit.
        this._retries = 0;
        this._emit('error', { error: err, fatal: true, permanent: true, retries: 0 });
        return { status: 'fatal', error: err };
      }
      if (this._closed) {
        // Left the page: the draft stays on the phone; no timers outlive the editor.
        this._retries = 0;
        this._emit('error', { error: err, fatal: true, closed: true, retries: 0 });
        return { status: 'fatal', error: err };
      }
      this._retries += 1;
      if (this._retries > this.maxRetries) {
        this._emit('error', {
          error: err,
          fatal: true,
          retries: this._retries,
        });
        return { status: 'fatal', error: err };
      }
      const delay = Math.min(
        this.retryBaseMs * Math.pow(2, this._retries - 1),
        this.retryCapMs,
      );
      this._emit('error', {
        error: err,
        retryInMs: delay,
        retries: this._retries,
        fatal: false,
      });
      // Schedule a retry; if the user edits again, the queue will cancel
      // this timer and run a fresh save.
      this._timer = setTimeout(() => this.run(), delay);
      return { status: 'retry', error: err, retryInMs: delay };
    } finally {
      this._inFlight = false;
      if (this._needResave) {
        this._needResave = false;
        // Fire-and-forget: the latest snapshot is what gets saved.
        this.run();
      }
      if (!this._inFlight) {
        const waiters = this._idleWaiters;
        this._idleWaiters = [];
        for (const w of waiters) w();
      }
    }
  }
}
