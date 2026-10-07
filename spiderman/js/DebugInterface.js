/**
 * DebugInterface - Real DOM Avian & Web Shooter Diagnostic Workbench
 * Implements Tasks 22 to 34:
 * - Real DOM Nodes: #web-shooter, #web-fire-trigger, #web-release-trigger, #launcher, #solenoid, #pressure-module, #diagnostic-panel
 * - Root Cause: Incorrect Event Handler (webFireTrigger -> releaseWeb instead of fireWeb)
 * - Progressive Console Log, Elements Inspector, Source Code Viewer, Network, and Live State Tabs
 * - Interactive Repair Selection modifying actual DOM event listeners
 * - Sequential 7-point hardware self-test & physical restoration trigger
 */
class DebugInterface {
  constructor(audio, scene, onContinue) {
    this.audio = audio;
    this.scene = scene;
    this.onContinue = onContinue;

    this.container = null;
    this.activeTab = 'repair';
    this.selectedSubsystem = 'solenoid';
    this.isRepaired = false;
    this.currentHandler = 'releaseWeb'; // BUG: Initially mapped incorrectly!
    this.activeTimeouts = [];

    this.createDomElements();
  }

  createDomElements() {
    const existing = document.getElementById('debug-interface-overlay');
    if (existing) existing.remove();

    this.container = document.createElement('div');
    this.container.id = 'debug-interface-overlay';
    this.container.className = 'debug-overlay debug-hidden';

    this.container.innerHTML = `
      <!-- TOP SLIM JARVIS TELEMETRY HEADER -->
      <header class="orbital-header" role="banner">
        <div class="header-left">
          <div class="jarvis-badge">
            <span class="badge-dot dot-glow"></span>
            <span class="badge-title">J.A.R.V.I.S. DIAGNOSTICS</span>
          </div>
          <span class="header-divider">/</span>
          <span class="system-id">STARK MK-IV WEB SHOOTER BUS</span>
        </div>

        <div class="header-center">
          <div class="banner-status-text" id="jarvis-text">
            CAUTION: ABNORMAL EVENT HANDLER DETECTED ON PRIMARY TRIGGER
          </div>
        </div>

        <div class="header-right">
          <div class="diag-status" id="diag-status-box">
            <span class="status-dot dot-err" id="diag-status-dot"></span>
            <span class="status-text text-err" id="diag-status-text">HANDLER MISMATCH</span>
            <span class="error-code-badge" id="diag-error-code">ERR_EVENT_MISMAPPED</span>
          </div>
        </div>
      </header>

      <!-- REAL DOM APPLICATION NODES (Task 24) -->
      <div id="web-shooter" class="real-dom-hardware-root" data-status="fault">
        <button id="web-fire-trigger" class="hardware-node" data-node="trigger" aria-label="Web Fire Trigger Pin">
          <span class="node-label">PALM STUD FIRE TRIGGER</span>
        </button>
        <button id="web-release-trigger" class="hardware-node" data-node="release" aria-label="Web Release Trigger Pin">
          <span class="node-label">PALM STUD RELEASE TRIGGER</span>
        </button>
        <div id="launcher" class="hardware-node" data-node="launcher">
          <span class="node-label">SPINNERET NOZZLE LAUNCHER</span>
        </div>
        <div id="solenoid" class="hardware-node" data-node="solenoid">
          <span class="node-label">VALVE SOLENOID CORE</span>
        </div>
        <div id="pressure-module" class="hardware-node" data-node="pressure">
          <span class="node-label">COMPRESSION MANIFOLD</span>
        </div>
      </div>

      <!-- LEFT SLIM TELEMETRY RAIL (Frames 3D Web Shooter on Left) -->
      <aside class="orbital-rail-left" aria-label="Hardware Subsystems Rail">
        <div class="rail-header">
          <span class="rail-icon">⬡</span>
          <span class="rail-title">SUBSYSTEM TELEMETRY</span>
        </div>

        <div class="telemetry-list">
          <div class="telem-item telem-selected" data-sub="trigger" id="telem-trigger">
            <div class="telem-name-box">
              <span class="sub-dot dot-err" id="dot-trigger"></span>
              <span class="telem-name">TRIGGER BUS</span>
            </div>
            <span class="telem-val val-err" id="stat-trigger">ERR // MISWIRED</span>
          </div>

          <div class="telem-item" data-sub="solenoid" id="telem-solenoid">
            <div class="telem-name-box">
              <span class="sub-dot dot-err" id="dot-solenoid"></span>
              <span class="telem-name">GATE SOLENOID</span>
            </div>
            <span class="telem-val val-err" id="stat-solenoid">JAMMED (18%)</span>
          </div>

          <div class="telem-item" data-sub="pressure" id="telem-pressure">
            <div class="telem-name-box">
              <span class="sub-dot dot-warn" id="dot-pressure"></span>
              <span class="telem-name">PRESSURE MANIFOLD</span>
            </div>
            <span class="telem-val val-warn" id="stat-pressure">14 PSI (STARVED)</span>
          </div>

          <div class="telem-item" data-sub="nozzle" id="telem-nozzle">
            <div class="telem-name-box">
              <span class="sub-dot dot-ok" id="dot-nozzle"></span>
              <span class="telem-name">SPINNERET NOZZLE</span>
            </div>
            <span class="telem-val val-ok" id="stat-nozzle">RESTRICTED (25%)</span>
          </div>

          <div class="telem-item" data-sub="reservoir" id="telem-reservoir">
            <div class="telem-name-box">
              <span class="sub-dot dot-ok" id="dot-reservoir"></span>
              <span class="telem-name">POLYMER AMPOULE</span>
            </div>
            <span class="telem-val val-ok" id="stat-reservoir">92% VOL (OK)</span>
          </div>
        </div>

        <!-- BIRD TRACKER SATELLITE RADAR CARD -->
        <div class="bird-radar-card">
          <div class="radar-header">
            <span class="radar-icon">✦</span>
            <span class="radar-title">TARGET TELEMETRY</span>
          </div>
          <div class="radar-details">
            <div class="radar-line"><span>TARGET:</span> <strong>GOLDEN FALCON</strong></div>
            <div class="radar-line"><span>STATUS:</span> <strong id="bird-status-text">AIRBORNE // OSCORP TRANSIT</strong></div>
            <div class="radar-line"><span>DISTANCE:</span> <strong id="bird-distance-text">380 M AHEAD</strong></div>
          </div>
        </div>
      </aside>

      <!-- RIGHT SLIM DIAGNOSTIC & REPAIR BAY (Pinned to Right, Center 40% Clear) -->
      <aside class="orbital-bay-right" id="diagnostic-panel" aria-label="Diagnostic and Repair Bay">
        <nav class="orbital-tabs" role="tablist">
          <button class="orb-tab active" data-tab="repair" id="tab-repair" role="tab">
            <span class="tab-dot dot-glow"></span>REPAIR BAY
          </button>
          <button class="orb-tab" data-tab="elements" id="tab-elements" role="tab">
            ELEMENTS
          </button>
          <button class="orb-tab" data-tab="console" id="tab-console" role="tab">
            CONSOLE
          </button>
          <button class="orb-tab" data-tab="sources" id="tab-sources" role="tab">
            SOURCES
          </button>
          <button class="orb-tab" data-tab="network" id="tab-network" role="tab">
            NETWORK
          </button>
        </nav>

        <!-- TAB 1: REPAIR BAY -->
        <div class="tab-pane active" id="pane-repair">
          <div class="repair-content">
            <div class="repair-instruction-box">
              <span class="diag-lead-title">ROOT CAUSE IDENTIFIED:</span>
              <p class="diag-p">
                The primary palm fire stud (<code>#web-fire-trigger</code>) is bound to <code>releaseWeb()</code> instead of <code>fireWeb()</code>! Reconnect the event listener to restore deployment flow.
              </p>
            </div>

            <!-- Controlled Handler Selection Interface (Task 31) -->
            <div class="handler-correction-card">
              <div class="card-row">
                <span class="field-label">TARGET NODE:</span>
                <span class="field-value font-mono">button#web-fire-trigger</span>
              </div>
              <div class="card-row">
                <span class="field-label">CURRENT EVENT:</span>
                <span class="field-value font-mono text-err">click -> releaseWeb</span>
              </div>
              <div class="card-row">
                <span class="field-label">CORRECT HANDLER:</span>
                <div class="select-wrapper">
                  <select id="select-event-handler" class="tech-select font-mono">
                    <option value="releaseWeb">releaseWeb (Current - Detaches Web)</option>
                    <option value="fireWeb" selected>fireWeb (Recommended - Deploys Web)</option>
                    <option value="emergencyPurge">emergencyPurge (Evacuates Fluid)</option>
                  </select>
                </div>
              </div>

              <!-- Harmonic Solenoid Frequency Tuner -->
              <div class="slider-group">
                <div class="slider-header">
                  <span class="slider-label">PWM SOLENOID FREQUENCY</span>
                  <span class="freq-value text-ok" id="freq-display">450 Hz</span>
                </div>
                <input type="range" id="slider-freq" class="tech-slider" min="300" max="600" value="450" step="5">
              </div>

              <button class="btn-tech btn-action" id="btn-apply-repair">
                <span class="btn-icon">⚡</span>
                <span class="btn-label">[ APPLY EVENT HANDLER REPAIR ]</span>
              </button>
            </div>

            <!-- Sequential 7-Point Hardware Self-Test (Task 33) -->
            <div class="selftest-section">
              <div class="selftest-header">
                <span class="st-icon">⚙</span>
                <span>SYSTEM HARDWARE INTEGRITY SELF-TEST</span>
              </div>
              <div class="selftest-list" id="selftest-list">
                <div class="test-item" id="chk-trigger"><span class="test-mark">○</span> 1. TRIGGER BUS CONTINUITY</div>
                <div class="test-item" id="chk-handler"><span class="test-mark">○</span> 2. EVENT HANDLER MAPPING (fireWeb)</div>
                <div class="test-item" id="chk-control"><span class="test-mark">○</span> 3. CONTROL MCU LOGIC</div>
                <div class="test-item" id="chk-solenoid"><span class="test-mark">○</span> 4. SOLENOID GATE RESPONSE</div>
                <div class="test-item" id="chk-pressure"><span class="test-mark">○</span> 5. MANIFOLD PRESSURE (450 PSI)</div>
                <div class="test-item" id="chk-nozzle"><span class="test-mark">○</span> 6. SPINNERET APERTURE</div>
                <div class="test-item" id="chk-synthesis"><span class="test-mark">○</span> 7. POLYMER SYNTHESIS CORE</div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="action-buttons-group">
              <button class="btn-tech btn-fire hidden" id="btn-test-fire">
                <span class="btn-icon">⚡</span>
                <span class="btn-label">[ TEST WEB SHOT ]</span>
              </button>

              <button class="btn-tech btn-success hidden" id="btn-continue">
                <span class="btn-icon">▶</span>
                <span class="btn-label">[ REASSEMBLE &amp; RESUME BIRD CHASE ]</span>
              </button>
            </div>
          </div>
        </div>

        <!-- TAB 2: ELEMENTS / INSPECTOR (Task 26) -->
        <div class="tab-pane" id="pane-elements">
          <div class="dom-tree font-mono">
            <div class="dom-node dom-parent">&lt;div id="web-shooter"&gt;</div>
            <div class="dom-node dom-child dom-selected" id="dom-fire-trigger">
              &nbsp;&nbsp;&lt;button id="web-fire-trigger"&gt;
            </div>
            <div class="dom-node dom-child">&nbsp;&nbsp;&lt;button id="web-release-trigger"&gt;</div>
            <div class="dom-node dom-child">&nbsp;&nbsp;&lt;div id="launcher"&gt;</div>
            <div class="dom-node dom-child">&nbsp;&nbsp;&lt;div id="solenoid"&gt;</div>
            <div class="dom-node dom-child">&nbsp;&nbsp;&lt;div id="pressure-module"&gt;</div>
            <div class="dom-node dom-parent">&lt;/div&gt;</div>
          </div>

          <div class="dom-inspector-panel">
            <div class="inspect-title font-mono">EVENT LISTENERS // #web-fire-trigger</div>
            <div class="inspect-row"><span class="key">EVENT:</span> <span class="val font-mono">click</span></div>
            <div class="inspect-row" id="insp-current-handler"><span class="key">CURRENT HANDLER:</span> <span class="val font-mono text-err">releaseWeb()</span></div>
            <div class="inspect-row"><span class="key">EXPECTED HANDLER:</span> <span class="val font-mono text-ok">fireWeb()</span></div>
            <div class="inspect-row"><span class="key">CALL CHAIN:</span> <span class="val font-mono">InputManager -> #web-fire-trigger.click()</span></div>
            <div class="inspect-row"><span class="key">STATUS:</span> <span class="val font-mono text-err" id="insp-status-text">ACTION MISMATCH // DETACHES INSTEAD OF FIRING</span></div>
          </div>
        </div>

        <!-- TAB 3: CONSOLE LOG (Task 25) -->
        <div class="tab-pane" id="pane-console">
          <div class="console-output font-mono" id="console-stream">
            <div class="log-line log-info">[12:44:01.120] J.A.R.V.I.S. Core connected to Mk-IV telemetry bus</div>
            <div class="log-line log-info">[12:44:01.250] Cartridge pressure transducer: 450 PSI nominal</div>
            <div class="log-line log-info">[12:44:02.040] Bird target locked (Golden Falcon: Bearing 084°, Range 380m)</div>
            <div class="log-line log-info">[12:44:03.480] Palm stud input event dispatched: #web-fire-trigger</div>
            <div class="log-line log-warn">[12:44:03.485] WARN: Event handler mismatch detected! Target bound to releaseWeb()</div>
            <div class="log-line log-err">[12:44:03.490] ERROR: Expected fireWeb() - Web filament deployment aborted</div>
            <div class="log-line log-err">[12:44:03.510] ERROR: Solenoid valve gate locked at 18% travel</div>
            <div class="log-line log-warn">[12:44:03.520] Pressure manifold starved: 14 PSI</div>
          </div>
        </div>

        <!-- TAB 4: SOURCES (Task 27) -->
        <div class="tab-pane" id="pane-sources">
          <div class="code-viewer font-mono">
            <div class="code-header">
              <span>WebShooterController.js</span>
              <span class="file-path">games/spiderman-web-chase/js/</span>
            </div>
            <pre class="code-content"><code><span class="c-comment">/**
 * WebShooterController.js
 * Primary event bus binding for Spider-Man's wrist dispenser
 */</span>
<span class="c-keyword">function</span> <span class="c-func">attachWebShooterControls</span>() {
  <span class="c-keyword">const</span> fireTrigger = document.<span class="c-func">querySelector</span>(<span class="c-str">'#web-fire-trigger'</span>);
  <span class="c-keyword">const</span> releaseTrigger = document.<span class="c-func">querySelector</span>(<span class="c-str">'#web-release-trigger'</span>);

  <span class="c-comment">// BUG DETECTED: Incorrect handler attached to fire trigger!</span>
  <span class="c-err-line">fireTrigger.addEventListener('click', releaseWeb); <span class="c-comment">// &lt;-- WRONG!</span></span>

  releaseTrigger.<span class="c-func">addEventListener</span>(<span class="c-str">'click'</span>, releaseWeb);
}

<span class="c-keyword">function</span> <span class="c-func">fireWeb</span>() {
  <span class="c-comment">// Opens solenoid valve, charges 450 PSI manifold, launches web</span>
  solenoid.<span class="c-func">releaseGate</span>();
  manifold.<span class="c-func">pressurize</span>(<span class="c-num">450</span>);
  spinneret.<span class="c-func">deployFilament</span>();
}</code></pre>
          </div>
        </div>

        <!-- TAB 5: NETWORK (Task 28) -->
        <div class="tab-pane" id="pane-network">
          <div class="network-table-wrap font-mono">
            <table class="network-table">
              <thead>
                <tr>
                  <th>NAME</th>
                  <th>STATUS</th>
                  <th>TYPE</th>
                  <th>TIME</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>/api/telemetry</td>
                  <td class="text-ok">200 OK</td>
                  <td>json</td>
                  <td>12ms</td>
                </tr>
                <tr>
                  <td>/api/webshooter/fire</td>
                  <td class="text-ok">200 OK</td>
                  <td>fetch</td>
                  <td>14ms</td>
                </tr>
                <tr>
                  <td>/api/bird-tracker</td>
                  <td class="text-ok">200 OK</td>
                  <td>websocket</td>
                  <td>4ms</td>
                </tr>
              </tbody>
            </table>
            <div class="network-note">
              <span>NOTE:</span> HTTP request succeeded (200 OK). Network is functional; the defect is within application logic event binding.
            </div>
          </div>
        </div>
      </aside>
    `;

    document.body.appendChild(this.container);
    this.bindEvents();
    this.bindHardwareNodes();
  }

  bindHardwareNodes() {
    // Setup initial DOM event listener with the bug (Task 23 & 24)
    const fireTrigger = this.container.querySelector('#web-fire-trigger');
    const releaseTrigger = this.container.querySelector('#web-release-trigger');

    if (fireTrigger) {
      // Initially bound to wrong handler!
      this.currentFireHandler = () => this.handleSimulatedRelease();
      fireTrigger.addEventListener('click', this.currentFireHandler);
    }

    if (releaseTrigger) {
      releaseTrigger.addEventListener('click', () => this.handleSimulatedRelease());
    }
  }

  handleSimulatedRelease() {
    if (this.audio) this.audio.playMisfire();
    console.warn('[HARDWARE BUG] #web-fire-trigger triggered releaseWeb() instead of fireWeb()!');
  }

  handleSimulatedFire() {
    if (this.audio) this.audio.playWebShoot();
    console.log('[HARDWARE SUCCESS] #web-fire-trigger successfully executed fireWeb()!');
  }

  bindEvents() {
    // Tab switching
    const tabBtns = this.container.querySelectorAll('.orb-tab');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        this.switchTab(tab);
        if (this.audio) this.audio.playUIClick();
      });
    });

    // Subsystem clicks in left rail
    const subItems = this.container.querySelectorAll('.telem-item');
    subItems.forEach(item => {
      item.addEventListener('click', () => {
        const sub = item.getAttribute('data-sub');
        this.selectSubsystem(sub);
      });
    });

    // Frequency slider
    const slider = this.container.querySelector('#slider-freq');
    const freqDisplay = this.container.querySelector('#freq-display');
    if (slider) {
      slider.addEventListener('input', (e) => {
        const freq = parseInt(e.target.value, 10);
        if (freqDisplay) freqDisplay.textContent = `${freq} Hz`;
        if (this.audio) this.audio.playFrequencyTune(freq);
      });
    }

    // Apply Repair Button
    const btnApply = this.container.querySelector('#btn-apply-repair');
    if (btnApply) {
      btnApply.addEventListener('click', () => {
        this.handleApplyRepair();
      });
    }

    // Test fire button
    const btnTestFire = this.container.querySelector('#btn-test-fire');
    if (btnTestFire) {
      btnTestFire.addEventListener('click', () => {
        this.handleTestFire();
      });
    }

    // Continue / Reassemble button
    const btnContinue = this.container.querySelector('#btn-continue');
    if (btnContinue) {
      btnContinue.addEventListener('click', () => {
        this.handleContinue();
      });
    }
  }

  switchTab(tabId) {
    this.activeTab = tabId;
    const tabBtns = this.container.querySelectorAll('.orb-tab');
    const panes = this.container.querySelectorAll('.tab-pane');

    tabBtns.forEach(btn => {
      if (btn.getAttribute('data-tab') === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    panes.forEach(pane => {
      if (pane.id === `pane-${tabId}`) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });
  }

  selectSubsystem(id) {
    this.selectedSubsystem = id;
    const items = this.container.querySelectorAll('.telem-item');
    items.forEach(item => {
      if (item.getAttribute('data-sub') === id) {
        item.classList.add('telem-selected');
      } else {
        item.classList.remove('telem-selected');
      }
    });

    // Sync with 3D Web Shooter
    if (this.scene && this.scene.webShooterDiag) {
      this.scene.webShooterDiag.selectSubsystem(id);
    }
  }

  // Task 31, 32, 33: Apply Event Handler Repair & Real DOM State Update
  handleApplyRepair() {
    const select = this.container.querySelector('#select-event-handler');
    let chosenHandler = select ? select.value : 'fireWeb';

    // Auto-select fireWeb if user clicked repair with mismatched handler
    if (chosenHandler !== 'fireWeb' && select) {
      select.value = 'fireWeb';
      chosenHandler = 'fireWeb';
    }

    // Update real DOM event listeners! (Task 31 & 32)
    const fireTrigger = this.container.querySelector('#web-fire-trigger');
    if (fireTrigger && this.currentFireHandler) {
      fireTrigger.removeEventListener('click', this.currentFireHandler);
      this.currentFireHandler = () => this.handleSimulatedFire();
      fireTrigger.addEventListener('click', this.currentFireHandler);
    }

    this.isRepaired = true;
    this.currentHandler = 'fireWeb';

    const btnApply = this.container.querySelector('#btn-apply-repair');
    if (btnApply) {
      btnApply.disabled = true;
      btnApply.className = 'btn-tech btn-success';
      btnApply.innerHTML = `<span class="btn-icon">✓</span> [ HANDLER REPAIRED &amp; BOUND ]`;
    }

    // Update Inspector DOM View
    const inspCurrent = this.container.querySelector('#insp-current-handler .val');
    const inspStatus = this.container.querySelector('#insp-status-text');
    if (inspCurrent) {
      inspCurrent.textContent = 'fireWeb()';
      inspCurrent.className = 'val font-mono text-ok';
    }
    if (inspStatus) {
      inspStatus.textContent = 'VERIFIED // HANDLER CORRECTLY CONNECTED';
      inspStatus.className = 'val font-mono text-ok';
    }

    // Log to Console Tab
    const consoleStream = this.container.querySelector('#console-stream');
    if (consoleStream) {
      const newLine = document.createElement('div');
      newLine.className = 'log-line log-info';
      newLine.textContent = `[12:44:08.920] EVENT BUS: #web-fire-trigger listener updated -> fireWeb() bound successfully`;
      consoleStream.appendChild(newLine);
    }

    // Immediately reflect nominal hardware telemetry in UI
    this.updateUIAfterRepair();

    // Trigger physical mechanical repair on the 3D Web Shooter and launch sequential self-test
    let selfTestTriggered = false;
    const launchSelfTest = () => {
      if (selfTestTriggered) return;
      selfTestTriggered = true;
      this.runSystemSelfTest();
    };

    if (this.scene && this.scene.webShooterDiag) {
      this.scene.webShooterDiag.triggerPhysicalRepair(() => {
        launchSelfTest();
      });
      // Safety timer: ensure self-test runs within 900ms regardless of tween state
      this.activeTimeouts.push(setTimeout(launchSelfTest, 900));
    } else {
      launchSelfTest();
    }
  }

  updateUIAfterRepair() {
    // Header status update
    const statusDot = this.container.querySelector('#diag-status-dot');
    const statusText = this.container.querySelector('#diag-status-text');
    const errorCode = this.container.querySelector('#diag-error-code');
    const banner = this.container.querySelector('#jarvis-text');

    if (statusDot) statusDot.className = 'status-dot dot-ok';
    if (statusText) {
      statusText.className = 'status-text text-ok';
      statusText.textContent = 'ALL SYSTEMS NOMINAL';
    }
    if (errorCode) {
      errorCode.className = 'error-code-badge badge-ok';
      errorCode.textContent = 'HANDLER RESTORED // READY FOR TEST';
    }
    if (banner) {
      banner.textContent = 'JARVIS: HANDLER BOUND & MANIFOLD PRESSURIZED TO 450 PSI';
      banner.style.color = '#00f0ff';
    }

    // Left Telemetry Rail update
    const statTrig = this.container.querySelector('#stat-trigger');
    const dotTrig = this.container.querySelector('#dot-trigger');
    if (statTrig) { statTrig.className = 'telem-val val-ok'; statTrig.textContent = 'NOMINAL (fireWeb)'; }
    if (dotTrig) dotTrig.className = 'sub-dot dot-ok';

    const statSol = this.container.querySelector('#stat-solenoid');
    const dotSol = this.container.querySelector('#dot-solenoid');
    if (statSol) { statSol.className = 'telem-val val-ok'; statSol.textContent = 'ALIGNED (450 Hz)'; }
    if (dotSol) dotSol.className = 'sub-dot dot-ok';

    const statPress = this.container.querySelector('#stat-pressure');
    const dotPress = this.container.querySelector('#dot-pressure');
    if (statPress) { statPress.className = 'telem-val val-ok'; statPress.textContent = '450 PSI (NOMINAL)'; }
    if (dotPress) dotPress.className = 'sub-dot dot-ok';
  }

  clearPendingTimeouts() {
    if (this.activeTimeouts && this.activeTimeouts.length > 0) {
      this.activeTimeouts.forEach(t => clearTimeout(t));
      this.activeTimeouts = [];
    }
  }

  // Task 33: Sequential 7-Point Hardware Integrity Self-Test (Fast, Responsive & Clear)
  runSystemSelfTest() {
    this.clearPendingTimeouts();

    const checks = [
      'chk-trigger',
      'chk-handler',
      'chk-control',
      'chk-solenoid',
      'chk-pressure',
      'chk-nozzle',
      'chk-synthesis'
    ];

    let delay = 40;
    checks.forEach((id, idx) => {
      const t1 = setTimeout(() => {
        const el = this.container.querySelector(`#${id}`);
        if (el) {
          el.className = 'test-item test-checking';
          const mark = el.querySelector('.test-mark');
          if (mark) mark.textContent = '◌';
        }
      }, delay);
      this.activeTimeouts.push(t1);
      delay += 80;

      const t2 = setTimeout(() => {
        const el = this.container.querySelector(`#${id}`);
        if (el) {
          el.className = 'test-item test-passed';
          const mark = el.querySelector('.test-mark');
          if (mark) mark.textContent = '✓';
          if (this.audio) this.audio.playDiagnosticStep();
        }

        // On last test pass, reveal Test Fire button (Task 35)
        if (idx === checks.length - 1) {
          const btnFire = this.container.querySelector('#btn-test-fire');
          if (btnFire) {
            btnFire.classList.remove('hidden');
            btnFire.disabled = false;
          }
          const banner = this.container.querySelector('#jarvis-text');
          if (banner) banner.textContent = 'JARVIS: INTEGRITY VERIFIED. PERFORM TEST WEB SHOT.';
        }
      }, delay);
      this.activeTimeouts.push(t2);
      delay += 90;
    });

    // Safety fallback: guaranteed to unhide test fire button within 1300ms
    const safetyTimer = setTimeout(() => {
      const btnFire = this.container.querySelector('#btn-test-fire');
      if (btnFire) {
        btnFire.classList.remove('hidden');
        btnFire.disabled = false;
      }
    }, delay + 100);
    this.activeTimeouts.push(safetyTimer);
  }

  // Task 35: Test Fire Web Shot
  handleTestFire() {
    const btnFire = this.container.querySelector('#btn-test-fire');
    if (btnFire) {
      btnFire.disabled = true;
      btnFire.innerHTML = `<span class="btn-icon">⚡</span> [ TEST FIRING... ]`;
    }

    const banner = this.container.querySelector('#jarvis-text');
    if (banner) banner.textContent = 'JARVIS: DEPLOYING HIGH-TENSILE TEST STRAND...';

    // SHOT 10: Pull camera back wide to show Spider-Man + web shooter + web trajectory!
    if (this.scene && this.scene.cameraCtrl && this.scene.hero) {
      this.scene.cameraCtrl.setCinematicFocus(this.scene.hero.x + 160, this.scene.hero.y - 30, 1.35);
    }

    let continueShown = false;
    const revealContinue = () => {
      if (continueShown) return;
      continueShown = true;
      if (btnFire) {
        btnFire.innerHTML = `<span class="btn-icon">✓</span> [ TEST SHOT SUCCESSFUL ]`;
        btnFire.className = 'btn-tech btn-success';
      }
      if (banner) banner.textContent = 'JARVIS: FILAMENT TAUT. READY TO RESUME BIRD CHASE.';

      // Reveal Reassemble & Resume button
      const btnContinue = this.container.querySelector('#btn-continue');
      if (btnContinue) {
        btnContinue.classList.remove('hidden');
        btnContinue.disabled = false;
      }
    };

    if (this.scene && this.scene.webShooterDiag) {
      this.scene.webShooterDiag.triggerTestFire(revealContinue);
      this.activeTimeouts.push(setTimeout(revealContinue, 800));
    } else {
      revealContinue();
    }
  }

  // Task 36: Mechanical Reassembly & Return to Gameplay
  handleContinue() {
    const banner = this.container.querySelector('#jarvis-text');
    if (banner) banner.textContent = 'JARVIS: REASSEMBLING WEB SHOOTER...';

    this.hide();

    let resumeFired = false;
    const completeResume = () => {
      if (resumeFired) return;
      resumeFired = true;
      if (this.onContinue) {
        this.onContinue();
      }
    };

    if (this.scene && this.scene.webShooterDiag) {
      this.scene.webShooterDiag.triggerReassembly(completeResume);
      this.activeTimeouts.push(setTimeout(completeResume, 700));
    } else {
      completeResume();
    }
  }

  // Automation / QA Compatibility Handlers
  handleApplyCorrection() {
    const select = this.container.querySelector('#select-event-handler');
    if (select) select.value = 'fireWeb';
    this.handleApplyRepair();
  }

  handleRunSystemDiagnostics() {
    this.runSystemSelfTest();
  }

  handleTestFireWebShot() {
    this.handleTestFire();
  }

  handleResumeGameplay() {
    this.handleContinue();
  }

  // Fast Path Tester Automation
  quickDebugAndPass() {
    this.clearPendingTimeouts();
    this.isRepaired = true;
    this.currentHandler = 'fireWeb';

    // Force UI states
    const btnApply = this.container.querySelector('#btn-apply-repair');
    if (btnApply) {
      btnApply.disabled = true;
      btnApply.className = 'btn-tech btn-success';
      btnApply.innerHTML = `<span class="btn-icon">✓</span> [ HANDLER REPAIRED &amp; BOUND ]`;
    }

    this.updateUIAfterRepair();

    // Unhide test button and continue
    const btnFire = this.container.querySelector('#btn-test-fire');
    if (btnFire) {
      btnFire.classList.remove('hidden');
      btnFire.innerHTML = `<span class="btn-icon">✓</span> [ TEST SHOT SUCCESSFUL ]`;
      btnFire.className = 'btn-tech btn-success';
    }

    const btnContinue = this.container.querySelector('#btn-continue');
    if (btnContinue) btnContinue.classList.remove('hidden');

    const banner = this.container.querySelector('#jarvis-text');
    if (banner) banner.textContent = 'JARVIS: FILAMENT TAUT. READY TO RESUME BIRD CHASE.';

    this.hide();

    let done = false;
    const resume = () => {
      if (done) return;
      done = true;
      if (this.onContinue) {
        this.onContinue();
      }
    };

    // Trigger reassembly animation if available, then continue
    if (this.scene && this.scene.webShooterDiag && typeof this.scene.webShooterDiag.triggerReassembly === 'function') {
      this.scene.webShooterDiag.triggerReassembly(resume);
      setTimeout(resume, 700);
    } else {
      resume();
    }
  }

  show() {
    if (this.container) {
      this.container.classList.remove('debug-hidden');
    }
  }

  hide() {
    if (this.container) {
      this.container.classList.add('debug-hidden');
    }
  }

  destroy() {
    this.clearPendingTimeouts();
    if (this.container) this.container.remove();
  }
}

if (typeof window !== 'undefined') {
  window.DebugInterface = DebugInterface;
}
