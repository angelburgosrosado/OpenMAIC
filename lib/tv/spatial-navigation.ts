/**
 * 2D Spatial Navigation Algorithm for 10-foot TV UI
 *
 * Provides directional candidate discovery (Up, Down, Left, Right)
 * based on geometrical distance, alignment, and axis projection.
 */

export interface SpatialRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface SpatialItem {
  id: string;
  rect: SpatialRect;
  disabled?: boolean;
}

export type SpatialDirection = 'up' | 'down' | 'left' | 'right';

/**
 * Finds the best next spatial navigation candidate in the requested direction.
 *
 * @param currentId The ID of currently focused spatial item
 * @param direction 'up' | 'down' | 'left' | 'right'
 * @param items List of all available spatial items
 * @returns ID of best candidate or null if none found
 */
export function findNextSpatialCandidate(
  currentId: string,
  direction: SpatialDirection,
  items: SpatialItem[]
): string | null {
  const current = items.find((i) => i.id === currentId);
  if (!current) {
    return null;
  }

  const c1Left = current.rect.left;
  const c1Top = current.rect.top;
  const c1Right = current.rect.left + current.rect.width;
  const c1Bottom = current.rect.top + current.rect.height;
  const c1Cx = c1Left + current.rect.width / 2;
  const c1Cy = c1Top + current.rect.height / 2;

  let bestCandidateId: string | null = null;
  let minScore = Infinity;

  for (const item of items) {
    if (item.id === currentId || item.disabled) {
      continue;
    }

    const c2Left = item.rect.left;
    const c2Top = item.rect.top;
    const c2Right = item.rect.left + item.rect.width;
    const c2Bottom = item.rect.top + item.rect.height;
    const c2Cx = c2Left + item.rect.width / 2;
    const c2Cy = c2Top + item.rect.height / 2;

    let primaryDist = 0;
    let secondaryDist = 0;
    let isValidDirection = false;

    if (direction === 'right') {
      isValidDirection = c2Cx > c1Cx && c2Right > c1Right && c2Left >= c1Left;
      if (isValidDirection) {
        primaryDist = c2Left >= c1Right ? c2Left - c1Right : c2Cx - c1Cx;
        const overlap = Math.max(
          0,
          Math.min(c1Bottom, c2Bottom) - Math.max(c1Top, c2Top)
        );
        if (overlap > 0) {
          secondaryDist = Math.abs(c2Cy - c1Cy) * 0.2;
        } else {
          const gap = c2Top > c1Bottom ? c2Top - c1Bottom : c1Top - c2Bottom;
          secondaryDist = gap + Math.abs(c2Cy - c1Cy) * 0.5;
        }
      }
    } else if (direction === 'left') {
      isValidDirection = c2Cx < c1Cx && c2Left < c1Left && c2Right <= c1Right;
      if (isValidDirection) {
        primaryDist = c1Left >= c2Right ? c1Left - c2Right : c1Cx - c2Cx;
        const overlap = Math.max(
          0,
          Math.min(c1Bottom, c2Bottom) - Math.max(c1Top, c2Top)
        );
        if (overlap > 0) {
          secondaryDist = Math.abs(c2Cy - c1Cy) * 0.2;
        } else {
          const gap = c2Top > c1Bottom ? c2Top - c1Bottom : c1Top - c2Bottom;
          secondaryDist = gap + Math.abs(c2Cy - c1Cy) * 0.5;
        }
      }
    } else if (direction === 'down') {
      isValidDirection = c2Cy > c1Cy && c2Bottom > c1Bottom && c2Top >= c1Top;
      if (isValidDirection) {
        primaryDist = c2Top >= c1Bottom ? c2Top - c1Bottom : c2Cy - c1Cy;
        const overlap = Math.max(
          0,
          Math.min(c1Right, c2Right) - Math.max(c1Left, c2Left)
        );
        if (overlap > 0) {
          secondaryDist = Math.abs(c2Cx - c1Cx) * 0.2;
        } else {
          const gap = c2Left > c1Right ? c2Left - c1Right : c1Left - c2Right;
          secondaryDist = gap + Math.abs(c2Cx - c1Cx) * 0.5;
        }
      }
    } else if (direction === 'up') {
      isValidDirection = c2Cy < c1Cy && c2Top < c1Top && c2Bottom <= c1Bottom;
      if (isValidDirection) {
        primaryDist = c1Top >= c2Bottom ? c1Top - c2Bottom : c1Cy - c2Cy;
        const overlap = Math.max(
          0,
          Math.min(c1Right, c2Right) - Math.max(c1Left, c2Left)
        );
        if (overlap > 0) {
          secondaryDist = Math.abs(c2Cx - c1Cx) * 0.2;
        } else {
          const gap = c2Left > c1Right ? c2Left - c1Right : c1Left - c2Right;
          secondaryDist = gap + Math.abs(c2Cx - c1Cx) * 0.5;
        }
      }
    }

    if (!isValidDirection) {
      continue;
    }

    const score = primaryDist + secondaryDist * 2;
    if (score < minScore) {
      minScore = score;
      bestCandidateId = item.id;
    }
  }

  return bestCandidateId;
}
