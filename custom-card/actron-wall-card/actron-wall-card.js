/**
 * Actron Air Wall Panel Card
 * Icon support:
 *   - Built-in key:  "power", "cool", "heat", "auto", "fan_low" etc.
 *   - MDI icon:      "mdi:snowflake", "mdi:fire", "mdi:home" etc.
 *   - SVG path:      "M12 2v20M2 12h20..." (raw SVG d= string)
 */

const BUILTIN_PATHS = {
  power:    'M12 2v6M6.3 6.3a8 8 0 1 0 11.4 0',
  cool:     'M12 2v20M2 12h20M4.9 4.9l14.2 14.2M19.1 4.9 4.9 19.1',
  heat:     'M12 2c0 6-6 6-6 12a6 6 0 0 0 12 0c0-6-6-6-6-12z',
  auto:     'M13 2 3 14h9l-1 8 10-12h-9l1-8z',
  fan_low:  'M12 12c1.5-2 0-5-.5-6 0 2-.8 3.5-1.5 6 0 1.5.5 2 1.5 2s1.5-.8 1.5-2c0-1-.5-3.5-1-4z',
  fan_mid:  'M12 12c1.5-2 0-5-.5-6 0 2-.8 3.5-1.5 6 0 1.5.5 2 1.5 2s1.5-.8 1.5-2c0-1-.5-3.5-1-4zM12 12c2 1.5 5 0 6-.5-2 0-3.5-.8-6-1.5',
  fan_high: 'M12 8c0-3-2-5-3-5 0 2.5 1 4 1 5M12 16c0 3 2 5 3 5 0-2.5-1-4-1-5M8 12c-3 0-5 2-5 3 2.5 0 4-1 5-1M16 12c3 0 5-2 5-3-2.5 0-4 1-5 1',
  fan_cont: 'M5 12h14M15 8l4 4-4 4',
  zone:     'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10',
};

/**
 * Creates and returns a DOM node for the icon.
 * Using createElement (not innerHTML) so ha-icon registers correctly
 * inside Shadow DOM after the element is attached to the tree.
 */
function makeIconNode(value, sizePx) {
  const size = sizePx || 17;

  if (typeof value === 'string' && value.startsWith('mdi:')) {
    // Use HA's ha-icon custom element — must be created via createElement
    const el = document.createElement('ha-icon');
    el.setAttribute('icon', value);
    el.style.cssText = `width:${size}px;height:${size}px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;color:inherit;--mdc-icon-size:${size}px`;
    return el;
  }

  // Built-in key or raw SVG path string
  const path = BUILTIN_PATHS[value] || value;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.style.cssText = `width:${size}px;height:${size}px;flex-shrink:0`;

  // Support multi-segment paths (separated by M after the first)
  // Split on 'M' that follows a letter/digit to handle compound paths
  const segments = path.split(/(?=[A-Z])(?<![0-9]M)/);
  const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  pathEl.setAttribute('d', path);
  svg.appendChild(pathEl);
  return svg;
}

/**
 * Injects an icon node into a container element, replacing any existing icon.
 * Preserves text nodes (button labels).
 */
function setIcon(container, value, sizePx) {
  // Remove existing icon (first child if it's svg or ha-icon)
  const first = container.firstChild;
  if (first && (first.tagName === 'svg' || first.tagName === 'HA-ICON' ||
      (first.nodeType === 1 && first.tagName.toLowerCase() === 'ha-icon'))) {
    container.removeChild(first);
  }
  const node = makeIconNode(value, sizePx);
  container.insertBefore(node, container.firstChild);
}

class ActronWallCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._hass = null;
    this._iconsInjected = false;
  }

  setConfig(config) {
    const e  = config.entities || {};
    const t  = config.theme    || {};
    const l  = config.labels   || {};
    const ic = config.icons    || {};

    this._config = {
      entities: {
        temp_sensor:  e.temp_sensor  || 'sensor.actron_wifi_setpoint_temperature',
        power_switch: e.power_switch || 'switch.actron_wifi_power',
        temp_up:      e.temp_up      || 'button.actron_wifi_temp_up',
        temp_down:    e.temp_down    || 'button.actron_wifi_temp_down',
        fan_button:   e.fan_button   || 'button.actron_wifi_fan',
        mode_button:  e.mode_button  || 'button.actron_wifi_mode',
        fan_mode:     e.fan_mode     || 'sensor.actron_wifi_fan_mode',
        cool:         e.cool         || 'binary_sensor.actron_wifi_cool',
        heat:         e.heat         || 'binary_sensor.actron_wifi_heat',
        auto:         e.auto         || 'binary_sensor.actron_wifi_auto',
        run:          e.run          || 'binary_sensor.actron_wifi_run',
        fan_low:      e.fan_low      || 'binary_sensor.actron_wifi_fan_low',
        fan_mid:      e.fan_mid      || 'binary_sensor.actron_wifi_fan_mid',
        fan_high:     e.fan_high     || 'binary_sensor.actron_wifi_fan_high',
        fan_cont:     e.fan_cont     || 'binary_sensor.actron_wifi_fan_cont',
      },

      zones: (config.zones || [
        { entity: 'switch.actron_wifi_zone_1', name: 'Zone 1' },
        { entity: 'switch.actron_wifi_zone_2', name: 'Zone 2' },
        { entity: 'switch.actron_wifi_zone_3', name: 'Zone 3' },
        { entity: 'switch.actron_wifi_zone_4', name: 'Zone 4' },
        { entity: 'switch.actron_wifi_zone_5', name: 'Zone 5' },
      ]).map(z => ({
        entity: z.entity,
        name:   z.name || z.entity,
        icon:   z.icon || null,
      })),

      labels: {
        title:          l.title          || 'Actron Air',
        running:        l.running        || 'Running',
        standby:        l.standby        || 'Standby',
        setpoint:       l.setpoint       || 'Setpoint',
        adjust:         l.adjust         || 'Adjust',
        mode_section:   l.mode_section   || 'Mode',
        fan_section:    l.fan_section    || 'Fan',
        zone_section:   l.zone_section   || 'Zones',
        cool:           l.cool           || 'Cool',
        heat:           l.heat           || 'Heat',
        auto:           l.auto           || 'Auto',
        fan_low:        l.fan_low        || 'Low',
        fan_mid:        l.fan_mid        || 'Med',
        fan_high:       l.fan_high       || 'High',
        fan_cont:       l.fan_cont       || 'Cont',
      },

      icons: {
        power:    ic.power    || 'power',
        cool:     ic.cool     || 'cool',
        heat:     ic.heat     || 'heat',
        auto:     ic.auto     || 'auto',
        fan_low:  ic.fan_low  || 'fan_low',
        fan_mid:  ic.fan_mid  || 'fan_mid',
        fan_high: ic.fan_high || 'fan_high',
        fan_cont: ic.fan_cont || 'fan_cont',
        zone:     ic.zone     || 'zone',
      },

      theme: {
        card_bg:             t.card_bg             || 'rgba(12,16,28,0.75)',
        card_border:         t.card_border         || 'rgba(255,255,255,0.07)',
        card_radius:         t.card_radius         || '24px',
        card_padding:        t.card_padding        || '20px',
        blur:                t.blur                || '24px',
        text_primary:        t.text_primary        || 'rgba(255,255,255,0.9)',
        text_secondary:      t.text_secondary      || 'rgba(255,255,255,0.35)',
        text_accent:         t.text_accent         || 'rgba(255,255,255,0.7)',
        title_color:         t.title_color         || 'rgba(255,255,255,0.35)',
        temp_color:          t.temp_color          || 'rgba(255,255,255,0.92)',
        temp_unit_color:     t.temp_unit_color     || 'rgba(255,255,255,0.4)',
        temp_bg:             t.temp_bg             || 'rgba(255,255,255,0.04)',
        power_on_bg:         t.power_on_bg         || 'rgba(52,211,153,0.15)',
        power_on_border:     t.power_on_border     || 'rgba(52,211,153,0.45)',
        power_on_color:      t.power_on_color      || '#34d399',
        running_color:       t.running_color       || '#34d399',
        running_bg:          t.running_bg          || 'rgba(52,211,153,0.1)',
        running_border:      t.running_border      || 'rgba(52,211,153,0.3)',
        cool_color:          t.cool_color          || 'rgba(56,189,248,0.9)',
        cool_bg:             t.cool_bg             || 'rgba(56,189,248,0.12)',
        cool_border:         t.cool_border         || 'rgba(56,189,248,0.4)',
        heat_color:          t.heat_color          || 'rgba(251,146,60,0.9)',
        heat_bg:             t.heat_bg             || 'rgba(251,146,60,0.12)',
        heat_border:         t.heat_border         || 'rgba(251,146,60,0.4)',
        auto_color:          t.auto_color          || 'rgba(167,139,250,0.9)',
        auto_bg:             t.auto_bg             || 'rgba(167,139,250,0.12)',
        auto_border:         t.auto_border         || 'rgba(167,139,250,0.4)',
        fan_active_color:    t.fan_active_color    || 'rgba(56,189,248,0.9)',
        fan_active_bg:       t.fan_active_bg       || 'rgba(56,189,248,0.12)',
        fan_active_border:   t.fan_active_border   || 'rgba(56,189,248,0.35)',
        zone_on_color:       t.zone_on_color       || 'rgba(52,211,153,0.9)',
        zone_on_bg:          t.zone_on_bg          || 'rgba(52,211,153,0.1)',
        zone_on_border:      t.zone_on_border      || 'rgba(52,211,153,0.38)',
        btn_bg:              t.btn_bg              || 'rgba(255,255,255,0.04)',
        btn_border:          t.btn_border          || 'rgba(255,255,255,0.07)',
        btn_color:           t.btn_color           || 'rgba(255,255,255,0.38)',
        section_label_color: t.section_label_color || 'rgba(255,255,255,0.28)',
        divider_color:       t.divider_color       || 'rgba(255,255,255,0.06)',
        chip_bg:             t.chip_bg             || 'rgba(255,255,255,0.04)',
        chip_border:         t.chip_border         || 'rgba(255,255,255,0.07)',
        chip_text:           t.chip_text           || 'rgba(255,255,255,0.35)',
      },
    };

    this._iconsInjected = false;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    // Inject icons after first hass set — DOM is fully attached by then
    if (!this._iconsInjected) {
      this._injectIcons();
      this._iconsInjected = true;
    }
    this._updateStates();
  }

  _state(entity)  { if (!this._hass || !entity) return null; const s = this._hass.states[entity]; return s ? s.state : null; }
  _isOn(entity)   { return this._state(entity) === 'on'; }
  _press(id)      { if (this._hass) this._hass.callService('button', 'press', { entity_id: id }); }
  _toggle(id)     { if (this._hass) this._hass.callService('homeassistant', 'toggle', { entity_id: id }); }

  _css() {
    const t = this._config.theme;
    return `
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap');
      *,:host{box-sizing:border-box;margin:0;padding:0}
      :host{display:block;font-family:'DM Sans',sans-serif}
      .card{background:${t.card_bg};backdrop-filter:blur(${t.blur});-webkit-backdrop-filter:blur(${t.blur});border:1px solid ${t.card_border};border-radius:${t.card_radius};padding:${t.card_padding};color:${t.text_primary};user-select:none}
      .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}
      .brand{font-size:11px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:${t.title_color}}
      .header-right{display:flex;align-items:center;gap:10px}
      .run-pill{display:flex;align-items:center;gap:5px;font-size:11px;color:${t.text_secondary};background:${t.btn_bg};border:1px solid ${t.btn_border};border-radius:20px;padding:3px 10px;transition:all .3s}
      .run-pill.running{color:${t.running_color};background:${t.running_bg};border-color:${t.running_border}}
      .run-dot{width:6px;height:6px;border-radius:50%;background:currentColor}
      .run-pill.running .run-dot{animation:blink 2s infinite}
      @keyframes blink{0%,100%{opacity:1}50%{opacity:.4}}
      .power-btn{width:36px;height:36px;border-radius:50%;background:${t.btn_bg};border:1px solid ${t.btn_border};color:${t.btn_color};cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s}
      .power-btn:hover{filter:brightness(1.3)}.power-btn:active{transform:scale(.92)}
      .power-btn.on{background:${t.power_on_bg};border-color:${t.power_on_border};color:${t.power_on_color}}
      .temp-section{display:flex;align-items:center;justify-content:space-between;background:${t.temp_bg};border:1px solid ${t.card_border};border-radius:18px;padding:16px 18px;margin-bottom:14px}
      .temp-big{font-size:56px;font-weight:300;letter-spacing:-3px;line-height:1;color:${t.temp_color}}
      .temp-big sup{font-size:20px;font-weight:300;letter-spacing:0;color:${t.temp_unit_color};vertical-align:super}
      .temp-sublabel{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:${t.text_secondary};margin-top:4px}
      .temp-right{display:flex;flex-direction:column;align-items:center;gap:8px}
      .adj-label{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:${t.text_secondary}}
      .temp-btn{width:42px;height:42px;border-radius:50%;background:${t.btn_bg};border:1px solid ${t.btn_border};color:${t.text_primary};font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;line-height:1;font-weight:300;font-family:'DM Sans',sans-serif}
      .temp-btn:hover{filter:brightness(1.4)}.temp-btn:active{transform:scale(.92)}
      .section-label{font-size:10px;font-weight:500;letter-spacing:.13em;text-transform:uppercase;color:${t.section_label_color};margin-bottom:8px}
      .mode-row{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:12px}
      .mode-btn{padding:10px 6px 9px;border-radius:13px;background:${t.btn_bg};border:1px solid ${t.btn_border};color:${t.btn_color};font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:5px;transition:all .2s}
      .mode-btn:hover{filter:brightness(1.3)}.mode-btn:active{transform:scale(.96)}
      .mode-btn.cool{background:${t.cool_bg};border-color:${t.cool_border};color:${t.cool_color}}
      .mode-btn.heat{background:${t.heat_bg};border-color:${t.heat_border};color:${t.heat_color}}
      .mode-btn.auto{background:${t.auto_bg};border-color:${t.auto_border};color:${t.auto_color}}
      .fan-row{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-bottom:12px}
      .fan-btn{padding:9px 4px 8px;border-radius:11px;background:${t.btn_bg};border:1px solid ${t.btn_border};color:${t.btn_color};font-family:'DM Sans',sans-serif;font-size:11px;font-weight:500;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px;transition:all .2s}
      .fan-btn:hover{filter:brightness(1.3)}.fan-btn:active{transform:scale(.95)}
      .fan-btn.active{background:${t.fan_active_bg};border-color:${t.fan_active_border};color:${t.fan_active_color}}
      .zones-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:14px}
      .zone-btn{padding:10px 4px 9px;border-radius:13px;background:${t.btn_bg};border:1px solid ${t.btn_border};color:${t.btn_color};font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:5px;transition:all .2s;text-align:center;line-height:1.3}
      .zone-btn:hover{filter:brightness(1.3)}.zone-btn:active{transform:scale(.95)}
      .zone-btn.on{background:${t.zone_on_bg};border-color:${t.zone_on_border};color:${t.zone_on_color}}
      .divider{height:1px;background:${t.divider_color};margin:12px 0}
      .footer{display:flex;justify-content:space-between;align-items:center;gap:6px}
      .info-chip{font-size:11px;color:${t.chip_text};background:${t.chip_bg};border:1px solid ${t.chip_border};border-radius:20px;padding:4px 10px;display:flex;align-items:center;gap:4px;white-space:nowrap}
      .info-chip strong{color:${t.text_accent};font-weight:500}
    `;
  }

  /**
   * Build the skeleton HTML — buttons contain only text labels.
   * Icons are injected separately via _injectIcons() once DOM is live.
   */
  _render() {
    const l = this._config.labels;

    this.shadowRoot.innerHTML = `
      <style>${this._css()}</style>
      <ha-card><div class="card">

        <div class="header">
          <div class="brand">${l.title}</div>
          <div class="header-right">
            <div class="run-pill" id="run-pill">
              <div class="run-dot"></div>
              <span id="run-text">${l.standby}</span>
            </div>
            <button class="power-btn" id="power-btn" data-icon-key="power" data-icon-size="16"></button>
          </div>
        </div>

        <div class="temp-section">
          <div>
            <div class="temp-big" id="temp-val">--<sup>°C</sup></div>
            <div class="temp-sublabel">${l.setpoint}</div>
          </div>
          <div class="temp-right">
            <div class="adj-label">${l.adjust}</div>
            <button class="temp-btn" id="temp-up-btn">+</button>
            <button class="temp-btn" id="temp-dn-btn">−</button>
          </div>
        </div>

        <div class="section-label">${l.mode_section}</div>
        <div class="mode-row">
          <button class="mode-btn" id="mode-cool" data-icon-key="cool" data-icon-size="17">${l.cool}</button>
          <button class="mode-btn" id="mode-heat" data-icon-key="heat" data-icon-size="17">${l.heat}</button>
          <button class="mode-btn" id="mode-auto" data-icon-key="auto" data-icon-size="17">${l.auto}</button>
        </div>

        <div class="section-label">${l.fan_section}</div>
        <div class="fan-row">
          <button class="fan-btn" id="fan-low"  data-icon-key="fan_low"  data-icon-size="15">${l.fan_low}</button>
          <button class="fan-btn" id="fan-mid"  data-icon-key="fan_mid"  data-icon-size="15">${l.fan_mid}</button>
          <button class="fan-btn" id="fan-high" data-icon-key="fan_high" data-icon-size="15">${l.fan_high}</button>
          <button class="fan-btn" id="fan-cont" data-icon-key="fan_cont" data-icon-size="15">${l.fan_cont}</button>
        </div>

        <div class="section-label">${l.zone_section}</div>
        <div class="zones-grid" id="zones-grid"></div>

        <div class="divider"></div>

        <div class="footer">
          <div class="info-chip">Fan <strong id="fan-label">—</strong></div>
          <div class="info-chip">Mode <strong id="mode-label">—</strong></div>
        </div>

      </div></ha-card>
    `;

    this._renderZones();
    this._bindEvents();
  }

  /**
   * Walk every element with data-icon-key and prepend the correct icon node.
   * Called after first hass assignment so Shadow DOM is fully live.
   */
  _injectIcons() {
    const s  = this.shadowRoot;
    const ic = this._config.icons;

    // Fixed buttons
    s.querySelectorAll('[data-icon-key]').forEach(el => {
      const key  = el.getAttribute('data-icon-key');
      const size = parseInt(el.getAttribute('data-icon-size') || '17', 10);
      const iconValue = ic[key] || key;
      const node = makeIconNode(iconValue, size);
      el.insertBefore(node, el.firstChild);
    });

    // Zone buttons
    this._config.zones.forEach((zone, i) => {
      const btn = s.getElementById(`zone-${i}`);
      if (!btn) return;
      const iconValue = zone.icon || ic.zone;
      const node = makeIconNode(iconValue, 15);
      btn.insertBefore(node, btn.firstChild);
    });
  }

  _renderZones() {
    const grid = this.shadowRoot.getElementById('zones-grid');
    if (!grid) return;
    grid.innerHTML = '';
    this._config.zones.forEach((zone, i) => {
      const btn = document.createElement('button');
      btn.className = 'zone-btn';
      btn.id = `zone-${i}`;
      // Text only — icon injected by _injectIcons()
      btn.textContent = zone.name;
      btn.addEventListener('click', () => this._toggle(zone.entity));
      grid.appendChild(btn);
    });
  }

  _bindEvents() {
    const s = this.shadowRoot;
    const e = this._config.entities;
    s.getElementById('power-btn')  ?.addEventListener('click', () => this._toggle(e.power_switch));
    s.getElementById('temp-up-btn')?.addEventListener('click', () => this._press(e.temp_up));
    s.getElementById('temp-dn-btn')?.addEventListener('click', () => this._press(e.temp_down));
    s.getElementById('mode-cool')  ?.addEventListener('click', () => this._press(e.mode_button));
    s.getElementById('mode-heat')  ?.addEventListener('click', () => this._press(e.mode_button));
    s.getElementById('mode-auto')  ?.addEventListener('click', () => this._press(e.mode_button));
    ['low','mid','high','cont'].forEach(f =>
      s.getElementById(`fan-${f}`)?.addEventListener('click', () => this._press(e.fan_button))
    );
  }

  _updateStates() {
    if (!this._hass) return;
    const s = this.shadowRoot;
    const e = this._config.entities;
    const l = this._config.labels;
    if (!s) return;

    // Power
    const isPowered = this._isOn(e.power_switch);
    s.getElementById('power-btn')?.setAttribute('class', `power-btn${isPowered ? ' on' : ''}`);

    // Running pill
    const isRunning = this._isOn(e.run);
    const pill = s.getElementById('run-pill');
    const rt   = s.getElementById('run-text');
    if (pill) pill.className   = `run-pill${isRunning ? ' running' : ''}`;
    if (rt)   rt.textContent   = isRunning ? l.running : l.standby;

    // Temperature
    const tempEl = s.getElementById('temp-val');
    if (tempEl) {
      const tv = this._state(e.temp_sensor);
      const n  = parseFloat(tv);
      tempEl.innerHTML = (tv && !isNaN(n)) ? `${n.toFixed(1)}<sup>°C</sup>` : `--<sup>°C</sup>`;
    }

    // Mode
    const isCool = this._isOn(e.cool);
    const isHeat = this._isOn(e.heat);
    const isAuto = this._isOn(e.auto);
    s.getElementById('mode-cool')?.setAttribute('class', `mode-btn${isCool ? ' cool' : ''}`);
    s.getElementById('mode-heat')?.setAttribute('class', `mode-btn${isHeat ? ' heat' : ''}`);
    s.getElementById('mode-auto')?.setAttribute('class', `mode-btn${isAuto ? ' auto' : ''}`);
    const ml = s.getElementById('mode-label');
    if (ml) ml.textContent = isCool ? l.cool : isHeat ? l.heat : isAuto ? l.auto : '—';

    // Fan
    const fanMap = { low: e.fan_low, mid: e.fan_mid, high: e.fan_high, cont: e.fan_cont };
    Object.entries(fanMap).forEach(([k, ent]) =>
      s.getElementById(`fan-${k}`)?.setAttribute('class', `fan-btn${this._isOn(ent) ? ' active' : ''}`)
    );
    const fl = s.getElementById('fan-label');
    if (fl) fl.textContent = this._state(e.fan_mode) || '—';

    // Zones
    this._config.zones.forEach((zone, i) =>
      s.getElementById(`zone-${i}`)?.setAttribute('class', `zone-btn${this._isOn(zone.entity) ? ' on' : ''}`)
    );
  }

  getCardSize() { return 6; }
  static getStubConfig() { return {}; }
}

customElements.define('actron-wall-card', ActronWallCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'actron-wall-card',
  name: 'Actron Air Wall Panel',
  description: 'Wall panel style card for Actron Air ESPHome integration',
});