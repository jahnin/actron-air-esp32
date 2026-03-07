import type { HomeAssistant, LovelaceCardEditor } from 'custom-card-helpers';
import { css, html, LitElement, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { ActronAirCardConfig } from './types';

@customElement('actron-air-esphome-card-editor')
export class ActronAirEsphomeCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config!: ActronAirCardConfig;

  public setConfig(config: ActronAirCardConfig): void {
    this._config = config;
  }

  private _climateEntityChanged(ev: CustomEvent): void {
    if (!this._config || !this.hass) return;
    const value = ev.detail.value;
    const event = new CustomEvent('config-changed', {
      detail: { config: { ...this._config, climate_entity: value } },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    return html`
      <div class="card-config">
        <div class="field">
          <ha-selector
            .hass=${this.hass}
            .selector=${{ entity: { domain: 'climate' } }}
            .value=${this._config.climate_entity || ''}
            .label=${'Climate Entity'}
            .required=${true}
            @value-changed=${this._climateEntityChanged}
          ></ha-selector>
        </div>

        <div class="note">
          <small>Zone names and zone count are configured in the integration settings (Settings → Devices & Services → Actron Air ESPHome → Configure).</small>
        </div>
      </div>
    `;
  }

  static styles = css`
    .card-config {
      padding: 16px;
    }

    .field {
      margin-bottom: 16px;
    }

    .note {
      margin-top: 16px;
      padding: 8px;
      background: var(--secondary-background-color, #f5f5f5);
      border-radius: 4px;
    }

    .note small {
      color: var(--secondary-text-color, #666);
      font-size: 12px;
    }
  `;
}

// Explicit registration to ensure element is defined after minification
if (!customElements.get('actron-air-esphome-card-editor')) {
  customElements.define('actron-air-esphome-card-editor', ActronAirEsphomeCardEditor);
}

declare global {
  interface HTMLElementTagNameMap {
    'actron-air-esphome-card-editor': ActronAirEsphomeCardEditor;
  }
}
