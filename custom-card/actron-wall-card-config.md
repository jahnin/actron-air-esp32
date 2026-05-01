```
type: custom:actron-wall-card
entities:
  temp_sensor: sensor.actron_wifi_setpoint_temperature
  power_switch: switch.actron_wifi_power
  temp_up: button.actron_wifi_temp_up
  temp_down: button.actron_wifi_temp_down
  fan_button: button.actron_wifi_fan
  mode_button: button.actron_wifi_mode
  fan_mode: sensor.actron_wifi_fan_mode
  cool: binary_sensor.actron_wifi_cool
  heat: binary_sensor.actron_wifi_heat
  auto: binary_sensor.actron_wifi_auto
  run: binary_sensor.actron_wifi_run
  fan_low: binary_sensor.actron_wifi_fan_low
  fan_mid: binary_sensor.actron_wifi_fan_mid
  fan_high: binary_sensor.actron_wifi_fan_high
  fan_cont: binary_sensor.actron_wifi_fan_cont
zones:
  - entity: switch.actron_wifi_zone_1
    name: Master
    icon: zone
  - entity: switch.actron_wifi_zone_2
    name: Kids
  - entity: switch.actron_wifi_zone_3
    name: Office
  - entity: switch.actron_wifi_zone_4
    name: Study
  - entity: switch.actron_wifi_zone_5
    name: Living
labels:
  title: Actron Air
  running: Running
  standby: Standby
  setpoint: Setpoint
  adjust: Adjust
  mode_section: Mode
  fan_section: Fan
  zone_section: Zones
  cool: Cool
  heat: Heat
  auto: Auto
  fan_low: Low
  fan_mid: Med
  fan_high: High
  fan_cont: Cont
icons:
  power: power
  cool: mdi:snowboard
  heat: heat
  auto: auto
  fan_low: fan_low
  fan_mid: fan_mid
  fan_high: fan_high
  fan_cont: fan_cont
  zone: zone
theme:
  card_bg: rgba(12,16,28,0.75)
  card_border: rgba(255,255,255,0.07)
  card_radius: 24px
  card_padding: 20px
  blur: 24px
  text_primary: rgba(255,255,255,0.20)
  text_secondary: rgba(255,255,255,0.35)
  text_accent: rgba(255,255,255,0.7)
  title_color: rgba(255,255,255,0.35)
  temp_color: rgba(255,255,255,0.92)
  temp_unit_color: rgba(255,255,255,0.4)
  temp_bg: rgba(255,255,255,0.04)
  power_on_bg: rgba(52,211,153,0.15)
  power_on_border: rgba(52,211,153,0.45)
  power_on_color: "#34d399"
  running_color: "#34d399"
  running_bg: rgba(52,211,153,0.1)
  running_border: rgba(52,211,153,0.3)
  cool_color: rgba(56,189,248,0.9)
  cool_bg: rgba(56,189,248,0.12)
  cool_border: rgba(56,189,248,0.4)
  heat_color: rgba(251,146,60,0.9)
  heat_bg: rgba(251,146,60,0.12)
  heat_border: rgba(251,146,60,0.4)
  auto_color: rgba(167,139,250,0.9)
  auto_bg: rgba(167,139,250,0.12)
  auto_border: rgba(167,139,250,0.4)
  fan_active_color: rgba(56,189,248,0.9)
  fan_active_bg: rgba(56,189,248,0.12)
  fan_active_border: rgba(56,189,248,0.35)
  zone_on_color: rgba(52,211,153,0.9)
  zone_on_bg: rgba(52,211,153,0.1)
  zone_on_border: rgba(52,211,153,0.38)
  btn_bg: rgba(255,255,255,0.04)
  btn_border: rgba(255,255,255,0.07)
  btn_color: rgba(255,255,255,0.38)
  section_label_color: rgba(255,255,255,0.28)
  divider_color: rgba(255,255,255,0.06)
  chip_bg: rgba(255,255,255,0.04)
  chip_border: rgba(255,255,255,0.07)
  chip_text: rgba(255,255,255,0.35)

```
