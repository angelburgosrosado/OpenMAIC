'use client';

/**
 * Defensive patch for Node.prototype.removeChild and Node.prototype.insertBefore.
 *
 * Prevents "NotFoundError: Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node."
 *
 * This error occurs in React/Next.js when external factors mutate the DOM tree outside of React's reconciler:
 * 1. Google Chrome Translate or browser translation extensions wrap text nodes in <font> tags.
 * 2. Browser extensions (Grammarly, 1Password, ad blockers) inject/move nodes.
 * 3. Third-party DOM manipulation or animation/layout transitions.
 *
 * When React attempts to remove or insert a node whose parent was altered, native DOM throws a fatal NotFoundError.
 * By safely removing from child.parentNode or inserting before referenceNode's actual parent,
 * we allow React reconciliation to complete cleanly without crashing the application.
 */
if (typeof window !== 'undefined' && typeof Node === 'function' && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child.parentNode !== this) {
      if (child.parentNode) {
        child.parentNode.removeChild(child);
      }
      return child;
    }
    return originalRemoveChild.call(this, child);
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(
    newNode: T,
    referenceNode: Node | null,
  ): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (referenceNode.parentNode) {
        referenceNode.parentNode.insertBefore(newNode, referenceNode);
      } else {
        this.appendChild(newNode);
      }
      return newNode;
    }
    return originalInsertBefore.call(this, newNode, referenceNode);
  };
}
