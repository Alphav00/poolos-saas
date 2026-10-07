/**
 * Svelte actions for cross-cutting concerns.
 */

/**
 * `use:onChange={callback}`
 *
 * Attach to a wrapper element. Calls `callback()` whenever any nested input
 * fires `input` or `change` event. Use for "anything in this subtree fires
 * the dirty flag" patterns.
 */
export function onChange(node, callback) {
  function handler(e) {
    callback(e);
  }
  node.addEventListener('input', handler, true);  // capture
  node.addEventListener('change', handler, true);
  return {
    destroy() {
      node.removeEventListener('input', handler, true);
      node.removeEventListener('change', handler, true);
    },
  };
}
