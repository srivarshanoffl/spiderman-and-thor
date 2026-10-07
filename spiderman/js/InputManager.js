/**
 * InputManager - Abstract multi-input controller (Keyboard, Mouse, Touch)
 * Provides responsive, clean inputs for Spider-Man movement and web shooting.
 */
class InputManager {
  constructor(game) {
    this.game = game;
    this.keys = {};
    this.pointer = { x: 0, y: 0, isDown: false, justDown: false };
    this.hasMovedPointer = false;
    this.horizontal = 0;
    this.shootWebRequested = false;
    this.shootWebHeld = false;
    this.boostActive = false;

    // Frame-based input event flags consumed by game loop
    this.justPressedSpace = false;
    this.justClicked = false;
    this.justReleasedSpace = false;
    this.justReleasedClick = false;
    this.justPressedE = false;

    this.pendingPressedSpace = false;
    this.pendingClicked = false;
    this.pendingReleasedSpace = false;
    this.pendingReleasedClick = false;
    this.pendingPressedE = false;

    // Callbacks for developer / system actions
    this.onRestart = null;
    this.onToggleDebug = null;
    this.onEscape = null;

    this.bindEvents();
  }

  bindEvents() {
    this.hasMovedPointer = false;
    this.handleKeyDown = (e) => {
      this.keys[e.code] = true;

      // Handle developer shortcuts
      if (e.code === 'KeyR' && !e.ctrlKey && !e.metaKey) {
        if (this.onRestart) this.onRestart();
      }
      if (e.code === 'F3') {
        e.preventDefault();
        if (this.onToggleDebug) this.onToggleDebug();
      }
      if (e.code === 'Escape') {
        if (this.onEscape) this.onEscape();
      }

      // Quick debug (KeyB or F4)
      if (e.code === 'KeyB' || e.code === 'F4') {
        e.preventDefault();
        if (typeof window.debugWebshooter === 'function') {
          window.debugWebshooter();
        }
      }

      // Inspect key (KeyE)
      if (e.code === 'KeyE' && !e.repeat) {
        this.pendingPressedE = true;
        this.justPressedE = true;
      }

      // Space / Web shooting
      if (e.code === 'Space') {
        e.preventDefault();
        this.shootWebRequested = true;
        this.shootWebHeld = true;
        if (!e.repeat) {
          this.pendingPressedSpace = true;
          this.justPressedSpace = true;
        }
      }
    };

    this.handleKeyUp = (e) => {
      this.keys[e.code] = false;
      if (e.code === 'Space') {
        this.shootWebHeld = false;
        this.pendingReleasedSpace = true;
        this.justReleasedSpace = true;
      }
    };

    this.handlePointerDown = (e) => {
      // Ignore clicks on diagnostic interactive UI elements or tester toolbar
      if (e.target && e.target.closest && (e.target.closest('.interactive-ui') || e.target.closest('.tester-toolbar') || e.target.closest('.orbital-header') || e.target.closest('.debug-overlay'))) {
        return;
      }
      if (e.button === 0) { // Left click
        this.pointer.isDown = true;
        this.pointer.justDown = true;
        this.shootWebRequested = true;
        this.shootWebHeld = true;
        this.pendingClicked = true;
        this.justClicked = true;
      }
    };

    this.handlePointerUp = (e) => {
      if (e.button === 0) {
        this.pointer.isDown = false;
        this.shootWebHeld = false;
        this.pendingReleasedClick = true;
        this.justReleasedClick = true;
      }
    };

    this.handlePointerMove = (e) => {
      this.pointer.x = e.clientX;
      this.pointer.y = e.clientY;
    };

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('mousedown', this.handlePointerDown);
    window.addEventListener('mouseup', this.handlePointerUp);
    window.addEventListener('mousemove', this.handlePointerMove);

    // Touch support for mobile / tablets
    this.handleTouchStart = (e) => {
      if (e.touches && e.touches[0]) {
        this.pointer.x = e.touches[0].clientX;
        this.pointer.y = e.touches[0].clientY;
        this.shootWebRequested = true;
        this.shootWebHeld = true;
        this.pendingClicked = true;
        this.justClicked = true;
      }
    };

    this.handleTouchEnd = () => {
      this.shootWebHeld = false;
      this.pendingReleasedClick = true;
      this.justReleasedClick = true;
    };

    window.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    window.addEventListener('touchend', this.handleTouchEnd);
  }

  update() {
    // Transfer pending single-frame events
    this.justPressedSpace = this.pendingPressedSpace;
    this.justClicked = this.pendingClicked;
    this.justReleasedSpace = this.pendingReleasedSpace;
    this.justReleasedClick = this.pendingReleasedClick;
    this.justPressedE = this.pendingPressedE;

    this.pendingPressedSpace = false;
    this.pendingClicked = false;
    this.pendingReleasedSpace = false;
    this.pendingReleasedClick = false;
    this.pendingPressedE = false;

    // Calculate horizontal directional input (-1 to 1)
    let h = 0;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) h -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) h += 1;
    this.horizontal = h;

    this.boostActive = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']);
  }

  // Consume single-frame shoot request
  consumeShootWeb() {
    const requested = this.shootWebRequested;
    this.shootWebRequested = false;
    return requested;
  }

  destroy() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('mousedown', this.handlePointerDown);
    window.removeEventListener('mouseup', this.handlePointerUp);
    window.removeEventListener('mousemove', this.handlePointerMove);
    if (this.handleTouchStart) {
      window.removeEventListener('touchstart', this.handleTouchStart);
    }
    if (this.handleTouchEnd) {
      window.removeEventListener('touchend', this.handleTouchEnd);
    }
  }
}

if (typeof window !== 'undefined') {
  window.InputManager = InputManager;
}
