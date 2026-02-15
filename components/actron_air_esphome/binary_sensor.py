"""Binary sensor platform for Actron Air ESPHome component."""

from typing import Any

import esphome.codegen as cg
import esphome.config_validation as cv
from esphome.components import binary_sensor

from . import ActronAirKeypad, CONF_ACTRON_AIR_ESPHOME_ID, actron_air_esphome_ns

DEPENDENCIES = ["actron_air_esphome"]

# C++ enum class for binary sensor IDs
BinarySensorId = actron_air_esphome_ns.enum("BinarySensorId", is_class=True)

# Sensor configuration keys
CONF_FAN_CONT = "fan_cont"
CONF_FAN_HIGH = "fan_high"
CONF_FAN_MID = "fan_mid"
CONF_FAN_LOW = "fan_low"
CONF_COOL = "cool"
CONF_AUTO_MODE = "auto_mode"
CONF_HEAT = "heat"
CONF_RUN = "run"
CONF_TIMER = "timer"
CONF_INSIDE = "inside"
CONF_ZONE_1 = "zone_1"
CONF_ZONE_2 = "zone_2"
CONF_ZONE_3 = "zone_3"
CONF_ZONE_4 = "zone_4"
CONF_ZONE_5 = "zone_5"
CONF_ZONE_6 = "zone_6"
CONF_ZONE_7 = "zone_7"
CONF_ZONE_8 = "zone_8"

# Mapping of config keys to C++ BinarySensorId enum values
SENSOR_MAP: list[tuple[str, Any]] = [
    (CONF_FAN_CONT, BinarySensorId.FAN_CONT),
    (CONF_FAN_HIGH, BinarySensorId.FAN_HIGH),
    (CONF_FAN_MID, BinarySensorId.FAN_MID),
    (CONF_FAN_LOW, BinarySensorId.FAN_LOW),
    (CONF_COOL, BinarySensorId.COOL),
    (CONF_AUTO_MODE, BinarySensorId.AUTO_MODE),
    (CONF_HEAT, BinarySensorId.HEAT),
    (CONF_RUN, BinarySensorId.RUN),
    (CONF_TIMER, BinarySensorId.TIMER),
    (CONF_INSIDE, BinarySensorId.INSIDE),
    (CONF_ZONE_1, BinarySensorId.ZONE_1),
    (CONF_ZONE_2, BinarySensorId.ZONE_2),
    (CONF_ZONE_3, BinarySensorId.ZONE_3),
    (CONF_ZONE_4, BinarySensorId.ZONE_4),
    (CONF_ZONE_5, BinarySensorId.ZONE_5),
    (CONF_ZONE_6, BinarySensorId.ZONE_6),
    (CONF_ZONE_7, BinarySensorId.ZONE_7),
    (CONF_ZONE_8, BinarySensorId.ZONE_8),
]

CONFIG_SCHEMA = cv.Schema(
    {
        cv.GenerateID(CONF_ACTRON_AIR_ESPHOME_ID): cv.use_id(ActronAirKeypad),
        cv.Optional(CONF_FAN_CONT): binary_sensor.binary_sensor_schema(),
        cv.Optional(CONF_FAN_HIGH): binary_sensor.binary_sensor_schema(),
        cv.Optional(CONF_FAN_MID): binary_sensor.binary_sensor_schema(),
        cv.Optional(CONF_FAN_LOW): binary_sensor.binary_sensor_schema(),
        cv.Optional(CONF_COOL): binary_sensor.binary_sensor_schema(),
        cv.Optional(CONF_AUTO_MODE): binary_sensor.binary_sensor_schema(),
        cv.Optional(CONF_HEAT): binary_sensor.binary_sensor_schema(),
        cv.Optional(CONF_RUN): binary_sensor.binary_sensor_schema(),
        cv.Optional(CONF_TIMER): binary_sensor.binary_sensor_schema(),
        cv.Optional(CONF_INSIDE): binary_sensor.binary_sensor_schema(),
        cv.Optional(CONF_ZONE_1): binary_sensor.binary_sensor_schema(),
        cv.Optional(CONF_ZONE_2): binary_sensor.binary_sensor_schema(),
        cv.Optional(CONF_ZONE_3): binary_sensor.binary_sensor_schema(),
        cv.Optional(CONF_ZONE_4): binary_sensor.binary_sensor_schema(),
        cv.Optional(CONF_ZONE_5): binary_sensor.binary_sensor_schema(),
        cv.Optional(CONF_ZONE_6): binary_sensor.binary_sensor_schema(),
        cv.Optional(CONF_ZONE_7): binary_sensor.binary_sensor_schema(),
        cv.Optional(CONF_ZONE_8): binary_sensor.binary_sensor_schema(),
    }
)


async def to_code(config: dict[str, Any]) -> None:
    parent = await cg.get_variable(config[CONF_ACTRON_AIR_ESPHOME_ID])

    for conf_key, sensor_id in SENSOR_MAP:
        if conf_key in config:
            sens = await binary_sensor.new_binary_sensor(config[conf_key])
            cg.add(parent.set_binary_sensor(sensor_id, sens))
