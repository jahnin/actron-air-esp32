#pragma once

#include <array>
#include <atomic>
#include <cstddef>
#include <cstdint>

#include "esphome/components/binary_sensor/binary_sensor.h"
#include "esphome/components/sensor/sensor.h"
#include "esphome/components/text_sensor/text_sensor.h"
#include "esphome/core/component.h"
#include "esphome/core/gpio.h"
#include "esphome/core/hal.h"

namespace esphome {
namespace actron_air_esphome {

// Protocol timing constants (microseconds)
//
// Pulse classification:
//   < 200us              : glitch, ignored
//   200 - 1100us         : logic 1 (short pulse)
//   1100 - 2700us        : logic 0 (long pulse)
//   2700 - 3500us        : start condition
//   > 3500us             : inter-frame gap
//
// Expected frame: 1 start pulse + 40 data pulses
// Typical frame width: 20000us (all 1s) to 45000us (all 0s)
// Gap between frames: ~90000us
constexpr unsigned long FRAME_BOUNDARY_US  = 3500;
constexpr unsigned long START_CONDITION_US = 2700;
constexpr unsigned long PULSE_THRESHOLD_US = 1100;
constexpr unsigned long FRAME_TIMEOUT_US   = 50000;

// Protocol frame size (40 bits per frame)
constexpr std::size_t NPULSE = 40;

// Delta log ring buffer size.
// 100 entries covers ~2 full frames (41 pulses each) plus inter-frame gaps,
// giving enough context to see the full frame structure and any errors.
constexpr uint8_t DELTA_LOG_SIZE = 50;

// LED/segment bit indices in the protocol frame.
// Status LEDs (modes, fan speeds, zones) and 7-segment display segments.
// Digit segments follow standard naming: A-G where A is top, G is middle.
// NOTE: These indices are under active verification - do not treat as final.
enum class LedIndex : std::size_t {
  // Mode indicators
  COOL      = 0,
  AUTO_MODE = 1,
  RUN       = 3,
  HEAT      = 15,

  // Fan speed indicators
  FAN_CONT = 8,
  FAN_HIGH = 9,
  FAN_MID  = 10,
  FAN_LOW  = 11,

  // Zone indicators (1-8)
  // NOTE: Zone indices under verification - may not be correct
  ZONE_1 = 21,
  ZONE_2 = 14,
  ZONE_3 = 12,
  ZONE_4 = 13,
  ZONE_5 = 2,
  ZONE_6 = 6,
  ZONE_7 = 5,
  ZONE_8 = 4,

  // Other status indicators
  TIMER  = 7,
  INSIDE = 33,

  // 7-segment display - Digit 1 (leftmost)
  // NOTE: Segment indices under verification - may not be correct
  DIGIT1_A = 39,
  DIGIT1_B = 35,
  DIGIT1_C = 34,
  DIGIT1_D = 32,
  DIGIT1_E = 36,
  DIGIT1_F = 38,
  DIGIT1_G = 37,

  // 7-segment display - Digit 2 (middle)
  DIGIT2_A = 31,
  DIGIT2_B = 24,
  DIGIT2_C = 29,
  DIGIT2_D = 30,
  DIGIT2_E = 27,
  DIGIT2_F = 25,
  DIGIT2_G = 26,

  // 7-segment display - Digit 3 (rightmost)
  DIGIT3_A = 20,
  DIGIT3_B = 19,
  DIGIT3_C = 16,
  DIGIT3_D = 23,
  DIGIT3_E = 22,
  DIGIT3_F = 17,
  DIGIT3_G = 18,

  // Decimal point (between digit 2 and 3)
  DP = 28,
};

// Binary sensor identifiers for array indexing
enum class BinarySensorId : uint8_t {
  FAN_CONT,
  FAN_HIGH,
  FAN_MID,
  FAN_LOW,
  COOL,
  AUTO_MODE,
  HEAT,
  RUN,
  TIMER,
  INSIDE,
  ZONE_1,
  ZONE_2,
  ZONE_3,
  ZONE_4,
  ZONE_5,
  ZONE_6,
  ZONE_7,
  ZONE_8,
  COUNT  // Must be last - used for array sizing
};

// Number of binary sensors
constexpr std::size_t BINARY_SENSOR_COUNT =
    static_cast<std::size_t>(BinarySensorId::COUNT);

/// ESPHome component that decodes Actron Air keypad display data.
///
/// Captures a pulse train from the keypad's display wire and decodes it to
/// extract temperature setpoint, mode indicators, fan speeds, and zone states.
class ActronAirKeypad : public Component {
public:
  void setup() override;
  void loop() override;
  void dump_config() override;
  float get_setup_priority() const override { return setup_priority::IO; }

  void set_pin(GPIOPin *pin) { pin_ = pin; }

  // Sensor setters
  void set_setpoint_temp_sensor(sensor::Sensor *s) { setpoint_temp_ = s; }
  void set_error_count_sensor(sensor::Sensor *s) { error_count_sensor_ = s; }
  void set_bit_string_sensor(text_sensor::TextSensor *s) { bit_string_ = s; }

  void set_binary_sensor(BinarySensorId id, binary_sensor::BinarySensor *s) {
    binary_sensors_[static_cast<std::size_t>(id)] = s;
  }

private:
  static void IRAM_ATTR handle_interrupt(ActronAirKeypad *arg);
  void process_frame();
  float get_display_value() const;
  static char decode_digit(uint8_t segment_bits);
  void dump_delta_log();

  bool get_pulse(LedIndex idx) const {
    return (pulses_ >> static_cast<std::size_t>(idx)) & 1;
  }

  GPIOPin *pin_{nullptr};

  // Sensors
  sensor::Sensor *setpoint_temp_{nullptr};
  sensor::Sensor *error_count_sensor_{nullptr};
  text_sensor::TextSensor *bit_string_{nullptr};

  std::array<binary_sensor::BinarySensor *, BINARY_SENSOR_COUNT>
      binary_sensors_{};

  // Protocol state (main loop only)
  uint64_t pulses_{0};
  bool has_new_data_{false};

  // ISR-only state (not shared with loop)
  volatile unsigned long last_intr_us_{0};
  uint64_t local_pulse_bits_{0};
  uint8_t last_frame_pulse_count_{0};
  volatile uint8_t  last_checkpoint_pulses_{0};
  volatile uint64_t last_checkpoint_bits_{0};
  volatile bool     has_checkpoint_{false};

  // ISR -> loop overflow signalling
  volatile bool has_overflow_{false};
  volatile unsigned long overflow_pulse_us_{0};

  // Raw delta ring buffer - ISR writes, loop reads once full.
  // Each entry stores the raw delta in us plus a classification tag:
  //   'G' = glitch     (< 200us,      ignored)
  //   '1' = logic 1    (< 1100us,     short pulse)
  //   '0' = logic 0    (1100-2700us,  long pulse)
  //   'S' = start      (2700-3500us,  frame start condition)
  //   'F' = gap        (> 3500us,     inter-frame gap)
  //   'X' = overflow   (too many pulses in frame)
  volatile unsigned long delta_log_us_[DELTA_LOG_SIZE]{};
  volatile char          delta_log_tag_[DELTA_LOG_SIZE]{};
  volatile uint8_t       delta_log_idx_{0};
  volatile bool          delta_log_full_{false};
  bool                   delta_log_dumped_{false};  // Only dump once at boot

  // Error rate tracking (loop only)
  uint32_t last_logged_error_count_{0};

  // ISR activity tracking (loop only)
  uint32_t last_isr_report_ms_{0};
  uint32_t last_isr_pulse_count_{0};

  // Loop-only state
  unsigned long last_work_us_{0};

  // Atomic shared state (ISR writes, loop reads)
  std::atomic<uint64_t> pulse_bits_{0};
  std::atomic<uint8_t>  num_low_pulses_{0};
  std::atomic<uint32_t> error_count_{0};
  std::atomic<uint32_t> total_pulses_{0};   // Total ISR firing count for activity monitoring
  std::atomic<bool>     do_work_{false};
  std::atomic<bool>     has_data_error_{false};
};

} // namespace actron_air_esphome
} // namespace esphome
