import * as THREE from 'three';

export class BattleHUD {
  private thorHpEl: HTMLElement | null = null;
  private doomHpEl: HTMLElement | null = null;
  private cooldownEEl: HTMLElement | null = null;
  private cooldownFEl: HTMLElement | null = null;
  private comboEl: HTMLElement | null = null;
  private comboCount: number = 0;
  private comboResetTimer: number = 0;

  constructor() {
    this.thorHpEl = document.getElementById('thor-health');
    this.doomHpEl = document.getElementById('doom-health');
    this.buildAdditionalHUD();
  }

  private buildAdditionalHUD() {
    const uiLayer = document.getElementById('ui-layer');
    if (!uiLayer) return;

    // Abilities Cooldown Container
    const abilitiesDiv = document.createElement('div');
    abilitiesDiv.className = 'abilities-hud';
    abilitiesDiv.innerHTML = `
      <div class="ability-card" id="ability-lmb">
        <div class="ability-key">LMB</div>
        <div class="ability-name">Stormbreaker</div>
      </div>
      <div class="ability-card" id="ability-rmb">
        <div class="ability-key">RMB</div>
        <div class="ability-name">Heavy Strike</div>
      </div>
      <div class="ability-card" id="ability-e">
        <div class="ability-key">E</div>
        <div class="ability-name">Lightning Slam</div>
        <div class="ability-cd-overlay" id="cd-e"></div>
      </div>
      <div class="ability-card ultimate-card" id="ability-f">
        <div class="ability-key">F</div>
        <div class="ability-name">God of Thunder</div>
        <div class="ability-cd-overlay" id="cd-f"></div>
      </div>
      <div class="ability-card" id="ability-shift">
        <div class="ability-key">SHIFT</div>
        <div class="ability-name">Dodge</div>
      </div>
    `;
    uiLayer.appendChild(abilitiesDiv);

    // Combo Floating Text Container
    this.comboEl = document.createElement('div');
    this.comboEl.className = 'combo-counter hidden';
    this.comboEl.innerHTML = `<span id="combo-num">0</span> HITS!`;
    uiLayer.appendChild(this.comboEl);

    this.cooldownEEl = document.getElementById('cd-e');
    this.cooldownFEl = document.getElementById('cd-f');
  }

  public updateHealth(thorHp: number, thorMax: number, doomHp: number, doomMax: number) {
    if (this.thorHpEl) {
      const p = Math.max(0, (thorHp / thorMax) * 100);
      this.thorHpEl.style.width = `${p}%`;
    }
    if (this.doomHpEl) {
      const p = Math.max(0, (doomHp / doomMax) * 100);
      this.doomHpEl.style.width = `${p}%`;
    }
  }

  public updateCooldowns(cdE: number, maxCdE: number, cdF: number, maxCdF: number) {
    if (this.cooldownEEl) {
      const p = Math.max(0, Math.min(1, cdE / maxCdE));
      this.cooldownEEl.style.height = `${p * 100}%`;
    }
    if (this.cooldownFEl) {
      const p = Math.max(0, Math.min(1, cdF / maxCdF));
      this.cooldownFEl.style.height = `${p * 100}%`;
    }
  }

  public registerHit() {
    this.comboCount++;
    this.comboResetTimer = 3.0;

    if (this.comboEl) {
      this.comboEl.classList.remove('hidden');
      const numSpan = document.getElementById('combo-num');
      if (numSpan) numSpan.textContent = `${this.comboCount}`;
      this.comboEl.classList.add('combo-pulse');
      setTimeout(() => this.comboEl?.classList.remove('combo-pulse'), 150);
    }
  }

  public update(delta: number) {
    if (this.comboResetTimer > 0) {
      this.comboResetTimer -= delta;
      if (this.comboResetTimer <= 0) {
        this.comboCount = 0;
        this.comboEl?.classList.add('hidden');
      }
    }
  }

  public spawnDamageNumber(worldPos: THREE.Vector3, amount: number, camera: THREE.Camera, isCritical = false) {
    const v = worldPos.clone();
    v.y += 1.8 + (Math.random() * 0.4 - 0.2);
    v.x += (Math.random() * 0.4 - 0.2);
    v.project(camera);

    const x = (v.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-(v.y * 0.5) + 0.5) * window.innerHeight;

    const el = document.createElement('div');
    el.className = `floating-damage ${isCritical ? 'critical' : ''}`;
    el.textContent = `${Math.round(amount)}${isCritical ? ' CRIT!' : ''}`;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;

    document.body.appendChild(el);
    setTimeout(() => el.remove(), 850);
  }

  public spawnPlayerDamageNumber(worldPos: THREE.Vector3, amount: number, camera: THREE.Camera) {
    const v = worldPos.clone();
    v.y += 1.8;
    v.x += (Math.random() * 0.3 - 0.15);
    v.project(camera);

    const x = (v.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-(v.y * 0.5) + 0.5) * window.innerHeight;

    const el = document.createElement('div');
    el.className = 'floating-damage doom-damage';
    el.textContent = `-${Math.round(amount)}`;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;

    document.body.appendChild(el);
    setTimeout(() => el.remove(), 850);
  }

  public showBanner(title: string, subtitle: string) {
    const banner = document.createElement('div');
    banner.className = 'victory-banner';
    banner.innerHTML = `
      <h1>${title}</h1>
      <h2>${subtitle}</h2>
    `;
    document.body.appendChild(banner);
  }

  // Act Banners (Act 1, Act 2, Act 3 titles)
  public showActBanner(title: string, subtitle: string, duration = 3200) {
    const banner = document.createElement('div');
    banner.className = 'act-banner';
    banner.innerHTML = `
      <h1>${title}</h1>
      <h2>${subtitle}</h2>
    `;
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), duration);
  }

  // Act 2: SOLVE THE BUG Button
  private solveBugContainer: HTMLElement | null = null;

  public showSolveBugButton(onClick: () => void) {
    if (this.solveBugContainer) this.solveBugContainer.remove();

    this.solveBugContainer = document.createElement('div');
    this.solveBugContainer.id = 'solve-bug-container';
    this.solveBugContainer.innerHTML = `
      <button id="solve-bug-btn">SOLVE THE BUG</button>
      <div class="solve-bug-subtitle">EMERGENCY REALITY RESTORATION PROTOCOL</div>
    `;

    const btn = this.solveBugContainer.querySelector('#solve-bug-btn');
    btn?.addEventListener('click', () => {
      onClick();
    });

    document.body.appendChild(this.solveBugContainer);
  }

  public hideSolveBugButton() {
    if (this.solveBugContainer) {
      this.solveBugContainer.remove();
      this.solveBugContainer = null;
    }
  }

  // Act 3: Action Prompt (Press F to Unleash the God of Thunder)
  private actionPromptEl: HTMLElement | null = null;

  public showActionPrompt(keyText: string, actionText: string, onTrigger: () => void) {
    if (this.actionPromptEl) this.actionPromptEl.remove();

    this.actionPromptEl = document.createElement('div');
    this.actionPromptEl.className = 'action-prompt-overlay';
    this.actionPromptEl.innerHTML = `
      <div class="prompt-key">${keyText}</div>
      <div class="prompt-text">${actionText}</div>
    `;

    this.actionPromptEl.addEventListener('click', () => {
      onTrigger();
    });

    document.body.appendChild(this.actionPromptEl);
  }

  public hideActionPrompt() {
    if (this.actionPromptEl) {
      this.actionPromptEl.remove();
      this.actionPromptEl = null;
    }
  }
}

