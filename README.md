# WiFi Control for Ducted Actron Air Conditioners using ESP32 and ESPHome.

This project enables WiFi control for Actron Air conditioning systems by interfacing an ESP32 running ESPHome directly with the existing wall panel hardware through Home Assistant. 

![](https://github.com/jahnin/actron-air-esp32/blob/main/images/actron-wall-card.png)

This project is based on:
- https://community.home-assistant.io/t/actron-aircon-esp32-controller-help/609062
- https://github.com/johnf/actron-air-esphome

### Key differences

See [debug.md](https://github.com/jahnin/actron-air-esp32/blob/main/debug.md) for more information.

```
### Finding 1: With NPULSE=40, bits identical at 20 and 40

Checkpoint: 20 pulses, bits=804096012400
Checkpoint: 40 pulses, bits=804096012400

Both halves identical → the mid-frame sync pulse was being treated as a **start condition**, resetting `local_pulse_bits_` to 0. The second half was all zeros, making it look like a repeat.

### Finding 2: With NPULSE=20, overflow errors

Checkpoint: 20 pulses, bits=483440
ISR pulse overflow: >20 pulses in frame (overflow delta=1503 us)
ISR pulse overflow: >20 pulses in frame (overflow delta=485 us)


Overflow deltas of ~490µs (logic 1) and ~1500µs (logic 0) confirm real data pulses arriving after bit 20 — the frame is genuinely more than 20 bits.

### Root Cause

The protocol structure is:

[INTER-FRAME GAP >3500µs]
[START pulse ~2700µs]
[20 data bits]
[MID-FRAME SYNC pulse ~2700µs]  ← was being treated as a new start, resetting buffer
[20 data bits]
[INTER-FRAME GAP ~230ms]

The ISR was treating the mid-frame sync as a start condition and resetting `local_pulse_bits_ = 0`, so the second 20 bits overwrote from position 0, making the full 40-bit frame appear to have identical first and second halves.

### Fix: Don't Reset Buffer on Mid-Frame Sync

Changed the start condition handling in `handle_interrupt`:

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

### Result: Two Halves Now Differ Correctly

Checkpoint: 20 pulses, bits=483440
Checkpoint: 40 pulses, bits=804091551856
```

# Actron specs
- Aircon Indoor/Outdoor Model
- LM24-8 Wall Controller (LM78Z4)
  ![](https://github.com/jahnin/actron-air-esp32/blob/main/images/wall-controller.jpg)

# Aircon Wall Panel
There are 4 wires that are connected to the wall panel controller

Power (+19V) This is the main power line from the indoor unit's control board. 
Purpose: Provides the voltage necessary to run the wall panel's LCD, backlight, and internal logic. It also carries a high-speed pulse train. It broadcasts the current state of the system (e.g., "The room is 22°C," "Compressor is ON," "Fan is High").

COM (Common / Ground) The reference point for the entire system. Purpose: Completes the circuit for both the Power and the Signal lines.

KEY (The Command Line) This is the "Input" from the wall panel back to the AC unit. 
Purpose: It handles the user's physical interactions. When you press a button on the panel, it modifies the electrical state of this wire (usually pulling it to ground or changing resistance) to tell the AC unit to change a setting. 
Interfacing: This is where your DAC and NPN Transistor are connected. By mimicking the electrical signature of a button press on this wire, the ESP32 can "force" the AC unit to turn on/off or change modes.

SENSE Connected to the internal temperature sensor.

# How does it work?
At a high level, the esp32 is connected to the Power line, key line and ground.
Status data is sent through the power line in the form of pulses(bits). For eg. which zone is on, current set point temperature, fan status(on/off), power status(on/off), etc.
The digital bits are read from the power line pulses and the current status for power, zones, temperature, fan, etc is decoded from these bits.

The key line is how you mimic a key press on the wall panel. Everytime you press a key, the voltage between the key line and the ground drops to a set value. For eg. 2.2V for fan, or 4.2V for zone1, etc. 
You measure this unique voltage for each button manually. The ESP32 circuit is then programmed to drop the voltage to the calculated unique voltage, between the key line and ground, to mimic a button press.

# Circuit
```
POWER ────┬──────────────────────┐
[19V]     │                    [4.7k]
       (Diode)                   │
       1N5817                    ├────────────────┐
          │                    [820R]             │
          ├─────────┬            │                │
          │         │            │                │
        [=+]      ┌─┴─┐ [5V OUT] │          ┌─────┴─────────────┐         ┌─────────────────┐
  25V   [CAP]     │DC-├──────────┼──────────┤ Pin 16 (5V)       ├─────────┤ Pin 5 (VCC)     │
100 Mf   [-]      │DC │          │          │                   │         │                 │
          │       └─┬─┘          │          │     ESP32-C3      │         │   DAC MCP4725   │
          │         │            │          │     SUPERMINI     │         │                 │
          │         │            │          │ Pin 12 (GPIO 3)   ├─────────┤ Pin 3 (SCL)     │
          │         │            │          │ Pin 10 (GPIO 10)  ├─────────┤ Pin 4 (SDA)     │
          │         │            │          │                   │         │                 │
          │         │            │          │ Pin 15 (GND)      │         │ Pin 2 (GND)     │
          │         │            │          └─────┬─────────────┘         └─────┬──────┬────┘
          │         │            │                │                             │      │ (Pin 1 VOUT)
          │         │            │                │                             │      ┴────────────────── [20k] ──────────────┬
COM ──────┴─────────┴────────────┴────────────────┴─────────────────────────────┴─────────────────────── ┬                     |
(Ground)                                                                                                 │ Emitter (E)         |
                                                                                                     ┌───┴───┐                 |
                                                                                                     │ BC549 |                 |
                                                                                                     ┤      B│─────────────────┴ 
                                                                                                     │ C     │
                                                                                                     └───┬───┘
                                                                                                         │ Collector (C)
KEY ─────────────────────────────────────────────────────────────────────────────────────────────────────┴
[5V]
```
# Built circuit 
(I switched the resistors to the values in the circuit above)
 ![](https://github.com/jahnin/actron-air-esp32/blob/main/images/circuit.png)

# Key concepts
## Voltage divider
A voltage divider is a simple linear circuit that turns a large voltage into a smaller one. By using two resistors in series, you can "tap into" the middle of the circuit to get a specific fraction of the input voltage. This is one of the most fundamental building blocks in electronics.

The circuit consists of an input voltage **Vin** and two resistors **R1** and **R2** connected in series. 
The output voltage ($V_{out}$) is measured across the second resistor ($R_2$).
As current flows through both resistors, each one uses up some of the voltage based on its resistance value. The ratio of the two resistors determines exactly how much voltage is dropped at each stage.

### The Formula to calculate the output voltage: 
$$V_{out} = V_{in} \cdot \frac{R_2}{R_1 + R_2}$$

Variable Definitions:
- $V_{in}$: The source (input) voltage.
- $R_1$: The resistor connected between the input voltage and the output node.
- $R_2$: The resistor connected between the output node and ground.
- $V_{out}$: The reduced voltage measured across $R_2$.

The easiest way to calculate the voltage drop you want to achieve is to use a voltage divider calculator. See, [Calculator](https://ohmslawcalculator.com/voltage-divider-calculator)

### Gotcha
In the circuit above, I'm dropping the 19v from the power line to 2.822v. The ESP32 C3 Supermini is able to decode the pulses accurately when the voltage is below 3v.
The project [johnf/actron-air-esphome](https://github.com/johnf/actron-air-esphome) drops the voltage to 3.3v, which is the max voltage that ESP32 C3 Supermini can work with. The bits were not accurate. I had a lot of 1's in the bitstream. 

## ESP32 Interrupt Service Routine (ISR)
The Interrupt Service Routine (ISR) captures the timing of signal edges. Since most pulse-encoded protocols (like IR remotes, DHT sensors, or PWM signals) rely on the duration of "High" and "Low" states, the goal is to measure the time elapsed between state changes.

When a pulse arrives at a GPIO pin, the ESP32 can trigger an ISR on a Rising, Falling, or Change edge. 
A digital signal is binary: it is either High (2.82V in my example) or Low (0V/Ground). The "edges" are the exact moments the signal transitions from one state to the other.
This project uses the falling edge(ie. transition from 2.82v to 0v). Inside that ISR, you record the current time using micros(). By subtracting the previous timestamp from the current one, you get the duration of the pulse(or width of the pulse). The width of the pulse denotes if the bit is a 0 or 1. 

### Gotcha
From **components/actron_air_esphome/actron_air_keypad.h**
- **PULSE_THRESHOLD_US = 1000:** This is the "divider." Any pulse shorter than this is a 0; any longer is a 1.
- **START_CONDITION_US = 2700:** A pulse of this length signals the beginning of a data transmission.
- **FRAME_BOUNDARY_US = 3500:** A pulse of this length (or longer) indicates the end of a message frame.

## Controlling voltage on the key line using the DAC and NPN transistor. 
We are using an NPN transistor to control voltage on the keyline using a Digital-to-Analog Converter(DAC), essentially turning the transistor into a voltage-controlled resistor.The ESP32 controls the voltage sent by the MCP4725 DAC to the base of the BC549 Transistor. The key line is 5V without any keys pressed.
Based on the voltage sent by the DAC to the base of the transistor, the voltage will drop linearly on the key line connected to the collector. 

For a more accurate drop in voltage, the better option will be to use resistors - See another version here. [Link](https://community.home-assistant.io/t/actron-aircon-esp32-controller-help/609062/213)

# Hardware Requirements
- ESP32 C3 SuperMini
- Circuit Boards
- MCP4725 DAC
- DC-DC Step-Down Power Supply Module - Accept 19v input and step down to 5V 
- BC549 NPN Transistor
- Resistors - 20kΩ, 4.7KΩ and 800Ω (Do not use 1KΩ as this does not drop the voltage to ~2.8V which is ideal)
- IN1N5817 Diode
- 50V 100MF capacitor

# Getting Started
1. Use a multimeter and measure the DC voltage between the power line and ground. This was 19V for me.
2. Measure the DC voltage between the Key line and ground. This was 5v for me.
3. Press and hold a button on the panel and simultaneously measure DC voltage between the Key line and ground. Make a note of the voltage. Repeat this for all buttons on the panel.
4. Build the circuit.
5. Install the Actron Air ESPHome integration through HACS. See [johnf/actron-air-esphome/README.md](https://github.com/johnf/actron-air-esphome/blob/main/README.md)
6. Configure ESPHome and initialize your ESP32 device. See [johnf/actron-air-esphome/README.md](https://github.com/johnf/actron-air-esphome/blob/main/README.md)
7. Copy and replace /config/esphome/components with the components folder [jahnin/actron-air-esp32](https://github.com/jahnin/actron-air-esp32/tree/main/components/actron_air_esphome).
8. In ESPHome builder, update the yaml with actron_air_keypad.yaml from this project. [actron_air_keypad.yaml](https://github.com/jahnin/actron-air-esp32/blob/main/actron_air_keypad.yaml)
9. For the custom card in home assistant,
    - Copy [actron-wall-card.js](https://github.com/jahnin/actron-air-esp32/blob/main/custom-card/actron-wall-card/actron-wall-card.js) to /config/www/actron-wall-card
    - Goto Settings-> Dashboards -> 3 dots on the right hand upper corner -> Resources -> Add resource
    - For URL type, "/local/actron-wall-card/actron-wall-card.js"
    - For Resource type, Select "JavaScript module"
    - Select Create.
    - Use the config file as reference to add and edit the card: [config.md](https://github.com/jahnin/actron-air-esp32/blob/main/custom-card/actron-wall-card-config.md)
10. Calculate DAC values that you need to substitute in the actron_air_keypad.yaml.

### Calculate DAC values
1. After connecting your circuit to the wires on the Wall panel
2. Go to Settings-> Devices & Services -> Actron Device -> DAC Output miliVolts
3. Manually type in a value and measure the voltage between the Key and Ground lines. Increase/Decrease the value until the voltage matches the voltage of a button press that you calculated in step 3.
4. Make a note of the DAC Output miliVolts for every button press voltage that you calculated earlier.
5. Substitue the DAC voltage in the actron_air_keypad.yaml.

# Debugging and Errors
I used Claude AI to debug some of the issues that I hit. These are summarized in the file, [debug.md](https://github.com/jahnin/actron-air-esp32/blob/main/debug.md)

## License

MIT License - Feel free to use and modify

## Thanks

This builds on the work of many others:

- <https://github.com/johnf/actron-air-esphome/blob/main/README.md>
- <https://community.home-assistant.io/t/actron-aircon-esp32-controller-help/609062>
- <https://github.com/kursancew/actron-air-wifi>
- <https://github.com/brentk7/Actron-Keypad>
- <https://github.com/cjd/Actron-Keypad>
- <https://github.com/LaughingLogic/Actron-Keypad>
