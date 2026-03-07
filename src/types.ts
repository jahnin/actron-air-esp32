import type { LovelaceCardConfig } from 'custom-card-helpers';

export interface ActronAirCardConfig extends LovelaceCardConfig {
  type: string;
  climate_entity: string;
}

export interface CardState {
  power: boolean;
  temperature: number;
  mode: 'cool' | 'heat' | 'auto' | 'off';
  fanSpeed: 'low' | 'mid' | 'high' | 'off';
  fanContinuous: boolean;
  run: boolean;
  timer: boolean;
  inside: boolean;
  zones: boolean[];
}
