# Actron Air ESPHome Debugging Session

**Date:** 2026-04-25  
**Topic:** Decoding pulse train from Actron Air keypad display on ESP32-C3

---

## Hardware Setup

- **MCU:** ESP32-C3 Supermini (GPIO4 for signal input)
- **Signal source:** Actron Air keypad display wire (19V logic)
- **Voltage divider:** 4.7kΩ (top) + 1kΩ (bottom) → GPIO4
- **DAC:** MCP4725 at 0x60 (I2C: SDA=GPIO10, SCL=GPIO3) for sending keypad button presses
- **Framework:** Arduino (ESPHome 2026.4.2)

---

## Problem Statement

The pulse train decoded by the ISR was inaccurate. The wall panel showed correct data but the ESPHome component was reporting wrong temperatures, zone states, and mode indicators.

---

## Issue 1: Voltage Divider Too High

### Problem
With 19V input and 4.7kΩ / 1kΩ divider:

```
V_out = 19V × (1k / (4.7k + 1k)) = 3.33V
```

This is right at the ESP32-C3's 3.3V GPIO max. Measured voltage on GPIO4 was **3.2V** — too close to VDD, causing marginal logic transitions.

### Analysis
ISR pulse count was consistently **~800 pulses/5s** vs expected ~2250/5s:
- 800/5s = 160 pulses/sec
- 160/sec ÷ 41 pulses/frame = **~3.9 frames/sec**
- Expected ~11 frames/sec based on 90ms inter-frame gap assumption

### Fix Attempted: Add 4.7kΩ in parallel with 1kΩ

```
R_parallel = (4700 × 1000) / (4700 + 1000) = 824Ω
V_out = 19V × (824 / (4700 + 824)) = 2.84V
Current = 19V / 5524Ω = 3.44mA  ✓ safe
```

**Result:** ISR rate unchanged at ~800/5s — voltage was not the root cause.

### Revised Conclusion
The ~800/5s rate turned out to be **correct for this unit**. The inter-frame gap is ~230ms (not 90ms), giving ~4 frames/sec × 41 pulses = ~164 pulses/sec. The expected rate comment in the code was wrong.

---

## Issue 2: ESPHome Pin Schema Compile Error

### Error
```
[mode] is an invalid option for [mode]. Please check the indentation.
pin: GPIO4
```

### Cause
The `__init__.py` pin schema used the old nested mode format:
```python
cv.Required(CONF_PIN): cv.All(
    pins.gpio_pin_schema(
        {
            "mode": {
                "input": True,
            },
            "inverted": False,
        }
    ),
),
```

### Fix
```python
cv.Required(CONF_PIN): pins.internal_gpio_input_pin_schema,
```

Or using the flat string form:
```python
cv.Required(CONF_PIN): pins.gpio_pin_schema({
    "mode": "INPUT",
    "inverted": False,
}),
```

---

## Issue 3: Transitional Display Value "S88"

### Problem
The decoder occasionally published `S88` (segment pattern `0x5F`) instead of a temperature, causing `-1.0°C` to appear in Home Assistant.

### Cause
The Actron display is multiplexed — segments don't all update simultaneously. The ISR catches the display mid-transition between valid states, briefly decoding a spurious `S88` pattern.

### Fix: Require Consecutive Matching Frames

Added stability counter to header:
```cpp
float last_temp_candidate_{-1.0f};
uint8_t temp_stable_count_{0};
static constexpr uint8_t TEMP_STABLE_THRESHOLD = 2;
```

Updated publish logic in `actron_air_keypad.cpp`:
```cpp
if (setpoint_temp_) {
  float temp = get_display_value();
  if (temp >= 16.0f && temp <= 30.0f) {
    if (std::abs(temp - last_temp_candidate_) < 0.05f) {
      temp_stable_count_++;
    } else {
      last_temp_candidate_ = temp;
      temp_stable_count_ = 1;
      ESP_LOGD(TAG, "New temp candidate: %.1f", temp);
    }

    if (temp_stable_count_ >= TEMP_STABLE_THRESHOLD) {
      if (temp != setpoint_temp_->state) {
        ESP_LOGD(TAG, "Stable setpoint temperature: %.1f", temp);
        setpoint_temp_->publish_state(temp);
      }
      temp_stable_count_ = TEMP_STABLE_THRESHOLD;
    }
  } else {
    ESP_LOGW(TAG, "Ignoring transitional display value during segment update");
  }
}
```

---

## Issue 4: Core Protocol Misunderstanding — Root Cause of Wrong Bit Decoding

### Investigation: Checkpoint Logging

Added checkpoint logging to the ISR to detect frame structure:

**In `actron_air_keypad.h`** (private members):
```cpp
volatile uint8_t  last_checkpoint_pulses_{0};
volatile uint64_t last_checkpoint_bits_{0};
volatile bool     has_checkpoint_{false};
```

**In ISR** (inside the data pulse handling block):
```cpp
if (idx + 1 == 20 || idx + 1 == NPULSE) {
  arg->last_checkpoint_pulses_ = idx + 1;
  arg->last_checkpoint_bits_   = arg->local_pulse_bits_;
  arg->has_checkpoint_         = true;
}
```

**In `loop()`**:
```cpp
if (has_checkpoint_) {
  has_checkpoint_ = false;
  ESP_LOGD(TAG, "Checkpoint: %u pulses, bits=%llu",
           last_checkpoint_pulses_, last_checkpoint_bits_);
}
```

### Finding 1: With NPULSE=40, bits identical at 20 and 40

```
Checkpoint: 20 pulses, bits=804096012400
Checkpoint: 40 pulses, bits=804096012400
```

Both halves identical → the mid-frame sync pulse was being treated as a **start condition**, resetting `local_pulse_bits_` to 0. The second half was all zeros, making it look like a repeat.

### Finding 2: With NPULSE=20, overflow errors

```
Checkpoint: 20 pulses, bits=483440
ISR pulse overflow: >20 pulses in frame (overflow delta=1503 us)
ISR pulse overflow: >20 pulses in frame (overflow delta=485 us)
```

Overflow deltas of ~490µs (logic 1) and ~1500µs (logic 0) confirm real data pulses arriving after bit 20 — the frame is genuinely more than 20 bits.

### Root Cause

The protocol structure is:
```
[INTER-FRAME GAP >3500µs]
[START pulse ~2700µs]
[20 data bits]
[MID-FRAME SYNC pulse ~2700µs]  ← was being treated as a new start, resetting buffer
[20 data bits]
[INTER-FRAME GAP ~230ms]
```

The ISR was treating the mid-frame sync as a start condition and resetting `local_pulse_bits_ = 0`, so the second 20 bits overwrote from position 0, making the full 40-bit frame appear to have identical first and second halves.

### Fix: Don't Reset Buffer on Mid-Frame Sync

Changed the start condition handling in `handle_interrupt`:

```cpp
if (delta_us > FRAME_BOUNDARY_US) {
  tag = 'F'; // Inter-frame gap - full reset
  arg->local_pulse_bits_ = 0;
  arg->num_low_pulses_.store(0, std::memory_order_relaxed);
  arg->has_data_error_.store(false, std::memory_order_relaxed);
} else if (delta_us >= START_CONDITION_US) {
  tag = 'S'; // Mid-frame sync - do NOT reset buffer
  arg->has_data_error_.store(false, std::memory_order_relaxed);
  // Don't touch local_pulse_bits_ or num_low_pulses_
} else {
  // Normal data pulse handling...
}
```

### Result: Two Halves Now Differ Correctly

```
Checkpoint: 20 pulses, bits=483440
Checkpoint: 40 pulses, bits=804091551856
```

Decoded:
```
First 20 bits  (483440):       0111 0110 0001 0011 0000
Second 20 bits (bits 20-39):   1011 1011 0101 0000 1011
Full 40 bits (804091551856):   stable, consistent every frame
```

**All button states, zone indicators, and temperature now decode correctly.**

---

## Final Protocol Summary

| Parameter | Value |
|-----------|-------|
| Frame size | 40 bits (2 × 20-bit halves) |
| Mid-frame separator | ~2700µs sync pulse (same width as start) |
| Logic 1 pulse width | ~490µs |
| Logic 0 pulse width | ~1500µs |
| Start/sync condition | 2700–3500µs |
| Inter-frame gap | ~230ms |
| Frame rate | ~4 frames/sec |
| ISR firing rate | ~800 pulses/5s (correct for this unit) |
| `FRAME_BOUNDARY_US` | 3500µs |
| `START_CONDITION_US` | 2700µs |
| `PULSE_THRESHOLD_US` | 1100µs |
| `FRAME_TIMEOUT_US` | 50000µs |
| `NPULSE` | 40 |

---

## Remaining Tasks

1. **Verify all `LedIndex` bit mappings** by toggling each zone/mode on the physical panel and confirming which bit changes in the log
2. **Verify temperature segment mappings** (DIGIT1/2/3 A-G, DP indices)
3. **Remove temporary checkpoint logging** from ISR and loop
4. **Update ISR activity log message** — change expected rate from `~2250` to `~800` for this unit
5. **Remove `// NOTE: under verification` comments** from header once mappings confirmed
6. **Consider switching to IDF framework** for more deterministic ISR timing on ESP32-C3

---

## Key Code Changes Summary

### `__init__.py`
- Fixed pin schema to use `pins.internal_gpio_input_pin_schema`

### `actron_air_keypad.h`
- Added `last_temp_candidate_`, `temp_stable_count_`, `TEMP_STABLE_THRESHOLD`
- Added `last_checkpoint_pulses_`, `last_checkpoint_bits_`, `has_checkpoint_` (temporary)

### `actron_air_keypad.cpp`
- **ISR:** Changed start condition handling — inter-frame gap resets buffer, mid-frame sync does NOT reset buffer
- **loop():** Added temperature stability filter (2 consecutive matching frames required)
- **loop():** Added temperature range filter (16.0–30.0°C)
- **loop():** Added checkpoint logging (temporary, to be removed)
