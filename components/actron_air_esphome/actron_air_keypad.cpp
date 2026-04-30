#include "actron_air_keypad.h"

namespace esphome {
namespace actron_air_esphome {

static const char *const TAG = "actron_air_esphome";

// Mapping from BinarySensorId to LedIndex with inversion flag
struct BinarySensorMapping {
  LedIndex led_index;
  bool invert;
};

// Static mapping table - order must match BinarySensorId enum
static constexpr std::array<BinarySensorMapping, BINARY_SENSOR_COUNT>
    BINARY_SENSOR_MAPPINGS = {{
        {LedIndex::FAN_CONT, false},
        {LedIndex::FAN_HIGH, false},
        {LedIndex::FAN_MID, false},
        {LedIndex::FAN_LOW, false},
        {LedIndex::COOL, false},
        {LedIndex::AUTO_MODE, false},
        {LedIndex::HEAT, false},
        {LedIndex::RUN, false},
        {LedIndex::TIMER, false},
        {LedIndex::INSIDE, false},
        {LedIndex::ZONE_1, false},
        {LedIndex::ZONE_2, false},
        {LedIndex::ZONE_3, false},
        {LedIndex::ZONE_4, false},
        {LedIndex::ZONE_5, true}, // Zones 5-8 have inverted logic
        {LedIndex::ZONE_6, true},
        {LedIndex::ZONE_7, true},
        {LedIndex::ZONE_8, true},
    }};

// Decode 7-segment pattern (GFEDCBA) to character
//    AAA
//   F   B
//    GGG
//   E   C
//    DDD
char ActronAirKeypad::decode_digit(uint8_t pattern) {
  switch (pattern) {
  case 0x37: return 'n';
  case 0x3F: return '0'; // ABCDEF
  case 0x06: return '1'; // BC
  case 0x5B: return '2'; // ABDEG
  case 0x4F: return '3'; // ABCDG
  case 0x66: return '4'; // BCFG
  case 0x6D: return '5'; // ACDFG
  case 0x07: return '7'; // ABC
  case 0x7C: return '6'; // CDEFG (no A)
  case 0x7F: return '8'; // ABCDEFG
  case 0x67: return '9'; // ABCFG (no D)
  case 0x6F: return '9'; // ABCDFG + D (9 with bottom bar)
  case 0x7D: return '6'; // ABCDEFG (6 with top bar)
  case 0x00: return ' '; // blank
  case 0x40: return '-'; // G (dash)
  case 0x79: return 'E'; // ADEFG
  case 0x73: return 'P'; // ABEFG
  case 0x5F: return 'S'; // AFGCD
  default:
    ESP_LOGE(TAG, "Unknown 7-segment pattern: 0x%02X", pattern);
    return '?';
  }
}

float ActronAirKeypad::get_display_value() const {
  using L = LedIndex;

  // Extract segment bits for each digit (GFEDCBA pattern)
  auto extract = [this](L a, L b, L c, L d, L e, L f, L g) {
    return static_cast<uint8_t>((get_pulse(g) << 6) | (get_pulse(f) << 5) |
                                (get_pulse(e) << 4) | (get_pulse(d) << 3) |
                                (get_pulse(c) << 2) | (get_pulse(b) << 1) |
                                get_pulse(a));
  };

  uint8_t d1 = extract(L::DIGIT1_A, L::DIGIT1_B, L::DIGIT1_C, L::DIGIT1_D,
                       L::DIGIT1_E, L::DIGIT1_F, L::DIGIT1_G);
  uint8_t d2 = extract(L::DIGIT2_A, L::DIGIT2_B, L::DIGIT2_C, L::DIGIT2_D,
                       L::DIGIT2_E, L::DIGIT2_F, L::DIGIT2_G);
  uint8_t d3 = extract(L::DIGIT3_A, L::DIGIT3_B, L::DIGIT3_C, L::DIGIT3_D,
                       L::DIGIT3_E, L::DIGIT3_F, L::DIGIT3_G);

  char c1 = decode_digit(d1);
  char c2 = decode_digit(d2);
  char c3 = decode_digit(d3);

  ESP_LOGD(TAG, "Segments: D1=0x%02X('%c') D2=0x%02X('%c') D3=0x%02X('%c') DP=%u",
           d1, c1, d2, c2, d3, c3, get_pulse(L::DP) ? 1 : 0);

  if (!std::isdigit(static_cast<unsigned char>(c1)) ||
      !std::isdigit(static_cast<unsigned char>(c2)) ||
      !std::isdigit(static_cast<unsigned char>(c3))) {
    ESP_LOGW(TAG, "Non-numeric display value: '%c%c%c' - returning -1", c1, c2, c3);
    return -1.0f;
  }

  int value = (c1 - '0') * 100 + (c2 - '0') * 10 + (c3 - '0');
  float display_value = static_cast<float>(value);

  if (get_pulse(L::DP)) {
    display_value *= 0.1f;
  }

  ESP_LOGD(TAG, "Display value: %.1f", display_value);
  return display_value;
}

void IRAM_ATTR ActronAirKeypad::handle_interrupt(ActronAirKeypad *arg) {
  auto now_us = micros();
  unsigned long delta_us = now_us - arg->last_intr_us_;
  arg->last_intr_us_ = now_us;

  // Increment total pulse count for activity monitoring
  arg->total_pulses_.fetch_add(1, std::memory_order_relaxed);

  // Classify the pulse
  char tag;


  if (delta_us < 200) {
    tag = 'G'; // Glitch - record but ignore
    if (!arg->delta_log_full_) {
      uint8_t i = arg->delta_log_idx_;
      arg->delta_log_us_[i]  = delta_us;
      arg->delta_log_tag_[i] = tag;
      i++;
      if (i >= DELTA_LOG_SIZE) { arg->delta_log_full_ = true; i = 0; }
      arg->delta_log_idx_ = i;
    }
    return;
  }

  if (delta_us > FRAME_BOUNDARY_US) {
    tag = 'F'; // Inter-frame gap
    arg->local_pulse_bits_ = 0;
    arg->num_low_pulses_.store(0, std::memory_order_relaxed);
    arg->has_data_error_.store(false, std::memory_order_relaxed);
  } else if (delta_us >= START_CONDITION_US) {
    tag = 'S'; // Start condition - reset staging buffer
    arg->has_data_error_.store(false, std::memory_order_relaxed);
    arg->local_pulse_bits_ = 0;
    arg->num_low_pulses_.store(0, std::memory_order_relaxed);
  } else {
    uint8_t idx = arg->num_low_pulses_.load(std::memory_order_relaxed);

    if (idx >= NPULSE) {
      tag = 'X'; // Overflow - too many pulses in frame
      arg->has_data_error_.store(true, std::memory_order_relaxed);
      arg->error_count_.fetch_add(1, std::memory_order_relaxed);
      arg->overflow_pulse_us_ = delta_us;
      arg->has_overflow_      = true;
    } else {
      // Classify as logic 0 or 1 based on pulse width
      uint8_t bit = (delta_us < PULSE_THRESHOLD_US) ? 1 : 0;
      tag = bit ? '1' : '0';

      if (bit) {
        arg->local_pulse_bits_ |= (1ULL << idx);
      }
      arg->num_low_pulses_.store(idx + 1, std::memory_order_relaxed);

      // Publish complete frame atomically when all bits received
      if (idx + 1 == NPULSE) {
        arg->pulse_bits_.store(arg->local_pulse_bits_, std::memory_order_release);
        arg->last_frame_pulse_count_ = idx + 1;
      }
      
      // Log sub-frame checkpoints
      if (idx + 1 == 20 || idx + 1 == NPULSE) {
        arg->last_checkpoint_pulses_ = idx + 1;
        arg->last_checkpoint_bits_   = arg->local_pulse_bits_;
        arg->has_checkpoint_         = true;
      }

      arg->do_work_.store(true, std::memory_order_release);
    }
  }

  // Record to delta log ring buffer (one-shot at boot, stops once full)
  if (!arg->delta_log_full_) {
    uint8_t i = arg->delta_log_idx_;
    arg->delta_log_us_[i]  = delta_us;
    arg->delta_log_tag_[i] = tag;
    i++;
    if (i >= DELTA_LOG_SIZE) { arg->delta_log_full_ = true; i = 0; }
    arg->delta_log_idx_ = i;
  }
}

void ActronAirKeypad::dump_delta_log() {
  ESP_LOGD(TAG, "========================================");
  ESP_LOGD(TAG, "  Raw pulse delta log (%u entries)", DELTA_LOG_SIZE);
  ESP_LOGD(TAG, "  G=glitch(<200us) S=start F=gap 1=logic1 0=logic0 X=overflow");
  ESP_LOGD(TAG, "  Expected: ~500us=logic1  ~1500us=logic0  ~2700-3500us=start  >3500us=gap");
  ESP_LOGD(TAG, "========================================");

  for (uint8_t i = 0; i < DELTA_LOG_SIZE; i++) {
    unsigned long us = delta_log_us_[i];
    char tag         = delta_log_tag_[i];

    const char *cls;
    switch (tag) {
      case 'G': cls = "GLITCH (ignored)"; break;
      case 'S': cls = "START CONDITION";  break;
      case 'F': cls = "INTER-FRAME GAP"; break;
      case '1': cls = "logic 1 (short)"; break;
      case '0': cls = "logic 0 (long)";  break;
      case 'X': cls = "OVERFLOW ERROR";  break;
      default:  cls = "unknown";          break;
    }

    ESP_LOGD(TAG, "  [%02u]  %c   %6lu us   %s", i, tag, us, cls);
  }

  ESP_LOGD(TAG, "========================================");
}

void ActronAirKeypad::setup() {
  ESP_LOGD(TAG, "setup() called");

  if (!pin_) {
    ESP_LOGE(TAG, "Pin not configured - cannot continue");
    mark_failed();
    return;
  }

  ESP_LOGD(TAG, "Calling pin_->setup()");
  pin_->setup();
  ESP_LOGD(TAG, "pin_->setup() complete");

  // Read and log initial pin state
  bool initial_level = pin_->digital_read();
  ESP_LOGD(TAG, "Initial GPIO level: %d (expect 1 = idle high)", initial_level ? 1 : 0);
  if (!initial_level) {
    ESP_LOGW(TAG, "GPIO is LOW at boot - signal may be absent or line is shorted");
  }

  // Explicitly set input mode before attaching interrupt
  ESP_LOGD(TAG, "Setting pin mode to INPUT");
  pin_->pin_mode(gpio::FLAG_INPUT);
  ESP_LOGD(TAG, "Pin mode set");

  // Safe cast with explicit null check
  auto *internal_pin = static_cast<InternalGPIOPin *>(pin_);
  if (internal_pin == nullptr) {
    ESP_LOGE(TAG, "Pin is not an InternalGPIOPin - interrupt cannot be attached");
    mark_failed();
    return;
  }

  ESP_LOGD(TAG, "Attaching interrupt on FALLING_EDGE");
  internal_pin->attach_interrupt(handle_interrupt, this,
                                 gpio::INTERRUPT_FALLING_EDGE);
  ESP_LOGD(TAG, "Interrupt attached successfully - ISR is live");

  last_work_us_         = micros();
  last_isr_report_ms_   = millis();
  last_isr_pulse_count_ = 0;
}

void ActronAirKeypad::loop() {
  unsigned long now_us = micros();
  uint32_t      now_ms = millis();

  if (has_checkpoint_) {
    has_checkpoint_ = false;
    // Log checkpoint pulses.
    ESP_LOGD(TAG, "Checkpoint: %u pulses, bits=%llu",last_checkpoint_pulses_, last_checkpoint_bits_); 
  }

  // One-shot delta log dump once ring buffer fills after boot
  if (delta_log_full_ && !delta_log_dumped_) {
    delta_log_dumped_ = true;
    dump_delta_log();
  }

  // Temporary: force dump even if not full yet
  if (now_ms - last_isr_report_ms_ >= 10000 && !delta_log_dumped_) {
    delta_log_dumped_ = true;
    dump_delta_log();
  }
  // ISR activity report every 5 seconds
  // Shows total ISR firing rate - should be ~450 pulses/sec if signal present
  // (41 pulses/frame × ~11 frames/sec based on 90ms inter-frame gap)
  if (now_ms - last_isr_report_ms_ >= 5000) {
    uint32_t current_total = total_pulses_.load(std::memory_order_relaxed);
    uint32_t delta_pulses  = current_total - last_isr_pulse_count_;
    ESP_LOGD(TAG, "ISR activity: %u pulses in last 5s (expect ~800 if signal present)",
             delta_pulses);
    if (delta_pulses == 0) {
      ESP_LOGW(TAG, "No ISR activity - check signal wire connection to GPIO4");
    }
    last_isr_pulse_count_ = current_total;
    last_isr_report_ms_   = now_ms;
  }

  // Log any ISR overflow detected since last loop iteration
  if (has_overflow_) {
    has_overflow_ = false;
    ESP_LOGW(TAG, "ISR pulse overflow: >%u pulses in frame "
                  "(overflow delta=%lu us, total errors=%u)",
             NPULSE, overflow_pulse_us_,
             error_count_.load(std::memory_order_relaxed));
  }

  // Log error count increases
  uint32_t current_errors = error_count_.load(std::memory_order_relaxed);
  if (current_errors != last_logged_error_count_) {
    ESP_LOGW(TAG, "Error count increased by %u (total: %u)",
             current_errors - last_logged_error_count_, current_errors);
    last_logged_error_count_ = current_errors;
  }

  if (do_work_.load(std::memory_order_acquire)) {
    do_work_.store(false, std::memory_order_relaxed);
    last_work_us_ = now_us;
    return;
  }

  unsigned long delta_us = now_us - last_work_us_;
  uint8_t num_pulses = num_low_pulses_.load(std::memory_order_acquire);

  if (delta_us > FRAME_TIMEOUT_US && num_pulses) {
    ESP_LOGVV(TAG, "Frame timeout: delta=%lu us, pulses=%u/%u",
              delta_us, num_pulses, NPULSE);

    if (num_pulses == NPULSE &&
        !has_data_error_.load(std::memory_order_acquire)) {
      uint64_t bits = pulse_bits_.load(std::memory_order_acquire);

      if (bits != pulses_) {
        // Log old and new bitstrings
        char old_bits[NPULSE + 1], new_bits[NPULSE + 1];
        for (std::size_t i = 0; i < NPULSE; ++i) {
          old_bits[i] = ((pulses_ >> i) & 1) ? '1' : '0';
          new_bits[i] = ((bits    >> i) & 1) ? '1' : '0';
        }
        old_bits[NPULSE] = '\0';
        new_bits[NPULSE] = '\0';

        ESP_LOGD(TAG, "Frame changed:");
        ESP_LOGD(TAG, "  Old: %s", old_bits);
        ESP_LOGD(TAG, "  New: %s", new_bits);

        // Log which specific bits changed
        for (std::size_t i = 0; i < NPULSE; ++i) {
          bool was = (pulses_ >> i) & 1;
          bool now_val = (bits >> i) & 1;
          if (was != now_val) {
            ESP_LOGD(TAG, "  Bit %02u changed: %u -> %u", i,
                     was ? 1 : 0, now_val ? 1 : 0);
          }
        }

        pulses_       = bits;
        has_new_data_ = true;
      } else {
        ESP_LOGVV(TAG, "Frame received but unchanged");
      }
    } else {
      ESP_LOGW(TAG, "Incomplete/errored frame discarded "
                    "(pulses: %u/%u, error: %u, delta: %lu us)",
               num_pulses, NPULSE,
               has_data_error_.load(std::memory_order_relaxed) ? 1 : 0,
               delta_us);

      ESP_LOGW(TAG, "Partial bits: %llu, last_frame_pulse_count: %u",
               pulse_bits_.load(std::memory_order_acquire),
               last_frame_pulse_count_);
    }

    // Reset pulse count for next frame.
    // NOTE: last_work_us_ is intentionally NOT reset here — the next
    // do_work_ signal from the ISR will update it naturally.
    num_low_pulses_.store(0, std::memory_order_relaxed);
  }

  if (!has_new_data_) {
    return;
  }

  has_new_data_ = false;
  ESP_LOGD(TAG, "Publishing new sensor data");

  if (bit_string_) {
    std::string text;
    text.reserve(NPULSE);
    for (std::size_t i = 0; i < NPULSE; ++i) {
      text += ((pulses_ >> i) & 1) ? '1' : '0';
    }
    ESP_LOGD(TAG, "Bitstring: %s", text.c_str());
    bit_string_->publish_state(text);
  }

  if (setpoint_temp_) {
    float temp = get_display_value();
    ESP_LOGD(TAG, "Setpoint temperature: %.1f", temp);
    setpoint_temp_->publish_state(temp);
  }

  if (error_count_sensor_) {
    uint32_t errs = error_count_.load(std::memory_order_relaxed);
    ESP_LOGD(TAG, "Error count: %u", errs);
    error_count_sensor_->publish_state(errs);
  }

  for (std::size_t i = 0; i < BINARY_SENSOR_COUNT; ++i) {
    if (binary_sensors_[i]) {
      const auto &mapping = BINARY_SENSOR_MAPPINGS[i];
      bool raw   = get_pulse(mapping.led_index);
      bool state = mapping.invert ? !raw : raw;
      ESP_LOGVV(TAG, "Binary sensor[%u]: raw=%u inverted=%u final=%u",
                i, raw ? 1 : 0, mapping.invert ? 1 : 0, state ? 1 : 0);
      binary_sensors_[i]->publish_state(state);
    }
  }
}

void ActronAirKeypad::dump_config() {
  ESP_LOGCONFIG(TAG, "Actron Air ESPHome:");
  LOG_PIN("  Pin: ", this->pin_);
  ESP_LOGCONFIG(TAG, "  FRAME_BOUNDARY_US:  %lu us", FRAME_BOUNDARY_US);
  ESP_LOGCONFIG(TAG, "  START_CONDITION_US: %lu us", START_CONDITION_US);
  ESP_LOGCONFIG(TAG, "  PULSE_THRESHOLD_US: %lu us", PULSE_THRESHOLD_US);
  ESP_LOGCONFIG(TAG, "  FRAME_TIMEOUT_US:   %lu us", FRAME_TIMEOUT_US);
  ESP_LOGCONFIG(TAG, "  NPULSE:             %u", NPULSE);
  ESP_LOGCONFIG(TAG, "  DELTA_LOG_SIZE:     %u entries", DELTA_LOG_SIZE);
}

} // namespace actron_air_esphome
} // namespace esphome
