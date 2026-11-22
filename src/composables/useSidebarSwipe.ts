import { onBeforeUnmount, onMounted, type Ref } from "vue";

export type SwipeAction = "open" | "close" | "none";

export interface SwipeEvaluationInput {
  deltaX: number;
  deltaY: number;
  isOpen: boolean;
  threshold?: number;
  axisRatio?: number;
}

export interface UseSidebarSwipeOptions {
  isMobile: Readonly<Ref<boolean>>;
  isOpen: Readonly<Ref<boolean>>;
  disabled?: Readonly<Ref<boolean>>;
  threshold?: number;
  axisRatio?: number;
  onOpen: () => void;
  onClose: () => void;
}

const DEFAULT_SWIPE_THRESHOLD_PX = 56;
const DEFAULT_HORIZONTAL_AXIS_RATIO = 1.4;

/**
 * Evaluates a completed touch displacement and determines whether it should
 * open or close the mobile sidebar.
 */
export function evaluateSidebarSwipeGesture(
  input: SwipeEvaluationInput,
): SwipeAction {
  const threshold = input.threshold ?? DEFAULT_SWIPE_THRESHOLD_PX;
  const axisRatio = input.axisRatio ?? DEFAULT_HORIZONTAL_AXIS_RATIO;

  const absX = Math.abs(input.deltaX);
  const absY = Math.abs(input.deltaY);

  if (absX < threshold) {
    return "none";
  }

  // Require horizontal movement to clearly dominate vertical scrolling.
  if (absY > 0 && absX < absY * axisRatio) {
    return "none";
  }

  if (input.deltaX > 0 && !input.isOpen) {
    return "open";
  }

  if (input.deltaX < 0 && input.isOpen) {
    return "close";
  }

  return "none";
}

function isInteractiveOrScrollableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toUpperCase();
  if (
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT" ||
    target.isContentEditable
  ) {
    return true;
  }

  let current: HTMLElement | null = target;
  while (current && current !== document.body) {
    const style = window.getComputedStyle(current);
    const overflowX = style.overflowX;
    const isScrollableX = overflowX === "auto" || overflowX === "scroll";
    if (isScrollableX && current.scrollWidth > current.clientWidth + 4) {
      return true;
    }
    current = current.parentElement;
  }

  return false;
}

/**
 * Listens for horizontal touch swipes on mobile viewports to reveal (swipe right)
 * or dismiss (swipe left) the sidebar drawer.
 */
export function useSidebarSwipe(options: UseSidebarSwipeOptions): void {
  const threshold = options.threshold ?? DEFAULT_SWIPE_THRESHOLD_PX;
  const axisRatio = options.axisRatio ?? DEFAULT_HORIZONTAL_AXIS_RATIO;

  let tracking = false;
  let startX = 0;
  let startY = 0;

  function resetTracking(): void {
    tracking = false;
    startX = 0;
    startY = 0;
  }

  function handleTouchStart(event: TouchEvent): void {
    if (!options.isMobile.value || options.disabled?.value) {
      resetTracking();
      return;
    }

    if (event.touches.length !== 1) {
      resetTracking();
      return;
    }

    if (!options.isOpen.value && isInteractiveOrScrollableTarget(event.target)) {
      resetTracking();
      return;
    }

    const touch = event.touches[0];
    if (!touch) {
      resetTracking();
      return;
    }

    tracking = true;
    startX = touch.clientX;
    startY = touch.clientY;
  }

  function handleTouchMove(event: TouchEvent): void {
    if (!tracking) return;
    if (event.touches.length !== 1) {
      resetTracking();
    }
  }

  function handleTouchEnd(event: TouchEvent): void {
    if (!tracking) return;

    const touch = event.changedTouches[0];
    const originX = startX;
    const originY = startY;
    resetTracking();

    if (!touch || !options.isMobile.value || options.disabled?.value) {
      return;
    }

    const action = evaluateSidebarSwipeGesture({
      deltaX: touch.clientX - originX,
      deltaY: touch.clientY - originY,
      isOpen: options.isOpen.value,
      threshold,
      axisRatio,
    });

    if (action === "open") {
      options.onOpen();
    } else if (action === "close") {
      options.onClose();
    }
  }

  onMounted(() => {
    if (typeof window === "undefined") return;
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", resetTracking, { passive: true });
  });

  onBeforeUnmount(() => {
    if (typeof window === "undefined") return;
    window.removeEventListener("touchstart", handleTouchStart);
    window.removeEventListener("touchmove", handleTouchMove);
    window.removeEventListener("touchend", handleTouchEnd);
    window.removeEventListener("touchcancel", resetTracking);
  });
}
