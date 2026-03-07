"""Config flow for Actron Air ESPHome integration."""

from __future__ import annotations

import logging
from typing import Any

_LOGGER = logging.getLogger(__name__)

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import HomeAssistant, callback
from homeassistant.data_entry_flow import FlowResult
from homeassistant.helpers import selector
from homeassistant.helpers.service_info.zeroconf import ZeroconfServiceInfo

from .const import (
    CONF_CURRENT_TEMP_SENSOR,
    CONF_CUSTOM_PRESETS,
    CONF_ENTITY_PREFIX,
    CONF_HUMIDITY_SENSOR,
    CONF_ZONE_COUNT,
    CONF_ZONE_NAMES,
    DEFAULT_ENTITY_PREFIX,
    DOMAIN,
    ENTITY_SUFFIXES,
    MAX_ZONE_COUNT,
    PRESET_ALL_ZONES,
)


class EntityNotFoundError(Exception):
    """Error to indicate entity was not found."""


async def validate_input(hass: HomeAssistant, data: dict[str, Any]) -> dict[str, Any]:
    """Validate the user input allows us to connect."""
    entity_prefix = data[CONF_ENTITY_PREFIX]
    _LOGGER.warning("entity_prefix: %s", entity_prefix)

    # Check if the setpoint temperature sensor exists
    temp_entity = f"sensor.{entity_prefix}_{ENTITY_SUFFIXES['setpoint_temp']}"
    if temp_entity not in hass.states.async_entity_ids("sensor"):
        raise EntityNotFoundError(f"Could not find {temp_entity}")

    return {"title": f"Actron Air ESPHome ({entity_prefix})"}


class ZonePresetFlowMixin:
    """Shared zone naming and preset management steps."""

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        """Initialise mixin state."""
        super().__init__(*args, **kwargs)
        self._zone_count: int = 0
        self._zone_names: dict[str, str] = {}
        self._custom_presets: dict[str, list[int]] = {}
        self._flow_data: dict[str, Any] = {}

    async def async_step_zone_names(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Configure zone names."""
        if user_input is not None:
            zone_names: dict[str, str] = {}
            for i in range(1, self._zone_count + 1):
                name = user_input.get(f"zone_{i}_name", "").strip()
                if name and name != f"Zone {i}":
                    zone_names[str(i)] = name
            self._zone_names = zone_names
            return await self.async_step_preset_menu()

        # Build schema with one text field per zone
        schema_dict: dict[vol.Marker, Any] = {}
        for i in range(1, self._zone_count + 1):
            default = self._zone_names.get(str(i), f"Zone {i}")
            schema_dict[
                vol.Optional(f"zone_{i}_name", default=default)
            ] = str

        return self.async_show_form(
            step_id="zone_names",
            data_schema=vol.Schema(schema_dict),
        )

    async def async_step_preset_menu(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Show menu to add presets or finish."""
        if user_input is not None:
            # Menu selection handled by HA menu system
            pass

        return self.async_show_menu(
            step_id="preset_menu",
            menu_options=["add_preset", "finish"],
            description_placeholders={
                "presets": ", ".join(self._custom_presets.keys()) if self._custom_presets else "None"
            },
        )

    async def async_step_add_preset(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Add a custom multi-zone preset."""
        errors: dict[str, str] = {}

        if user_input is not None:
            preset_name = user_input.get("preset_name", "").strip()
            preset_zones = user_input.get("preset_zones", [])

            if not preset_name:
                errors["preset_name"] = "preset_name_required"
            elif preset_name == PRESET_ALL_ZONES:
                errors["preset_name"] = "preset_name_reserved"
            elif preset_name in self._custom_presets:
                errors["preset_name"] = "preset_name_duplicate"
            elif preset_name in self._zone_names.values():
                errors["preset_name"] = "preset_name_conflicts_zone"
            elif any(
                preset_name == f"Zone {i}"
                for i in range(1, self._zone_count + 1)
                if str(i) not in self._zone_names
            ):
                errors["preset_name"] = "preset_name_conflicts_zone"

            if not preset_zones:
                errors["preset_zones"] = "preset_zones_required"

            if not errors:
                self._custom_presets[preset_name] = [
                    int(z) for z in preset_zones
                ]
                return await self.async_step_preset_menu()

        # Build zone options using zone names
        zone_options: dict[str, str] = {}
        for i in range(1, self._zone_count + 1):
            label = self._zone_names.get(str(i), f"Zone {i}")
            zone_options[str(i)] = label

        return self.async_show_form(
            step_id="add_preset",
            data_schema=vol.Schema(
                {
                    vol.Required("preset_name"): str,
                    vol.Required("preset_zones"): selector.SelectSelector(
                        selector.SelectSelectorConfig(
                            options=[
                                selector.SelectOptionDict(value=k, label=v)
                                for k, v in zone_options.items()
                            ],
                            multiple=True,
                        )
                    ),
                }
            ),
            errors=errors,
        )

    async def async_step_finish(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Finish the flow."""
        self._flow_data[CONF_ZONE_NAMES] = self._zone_names
        self._flow_data[CONF_CUSTOM_PRESETS] = self._custom_presets
        return self._finish_flow()

    def _finish_flow(self) -> FlowResult:
        """Create the entry. Implemented by subclass."""
        raise NotImplementedError


class ConfigFlow(ZonePresetFlowMixin, config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Actron Air ESPHome."""

    VERSION = 2

    def __init__(self) -> None:
        """Initialise config flow."""
        super().__init__()
        self._discovered_prefix: str | None = None

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Handle the initial step."""
        errors: dict[str, str] = {}

        if user_input is not None:
            try:
                info = await validate_input(self.hass, user_input)
            except EntityNotFoundError:
                errors["base"] = "entity_not_found"
            else:
                # Check for duplicate entries
                await self.async_set_unique_id(user_input[CONF_ENTITY_PREFIX])
                self._abort_if_unique_id_configured()

                self._flow_data = {**user_input}
                self._flow_data["_title"] = info["title"]
                self._zone_count = int(user_input[CONF_ZONE_COUNT])
                return await self.async_step_zone_names()

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required(
                        CONF_ENTITY_PREFIX, default=DEFAULT_ENTITY_PREFIX
                    ): str,
                    vol.Required(
                        CONF_ZONE_COUNT,
                    ): selector.NumberSelector(
                        selector.NumberSelectorConfig(
                            min=1,
                            max=MAX_ZONE_COUNT,
                            mode=selector.NumberSelectorMode.BOX,
                        )
                    ),
                    vol.Optional(CONF_CURRENT_TEMP_SENSOR): selector.EntitySelector(
                        selector.EntitySelectorConfig(
                            domain="sensor", device_class="temperature"
                        )
                    ),
                    vol.Optional(CONF_HUMIDITY_SENSOR): selector.EntitySelector(
                        selector.EntitySelectorConfig(
                            domain="sensor", device_class="humidity"
                        )
                    ),
                }
            ),
            errors=errors,
        )

    async def async_step_zeroconf(
        self, discovery_info: ZeroconfServiceInfo
    ) -> FlowResult:
        """Handle zeroconf discovery."""
        # Extract device name from TXT record or hostname
        name = discovery_info.properties.get("name")
        if not name:
            # Fallback to hostname (strip .local suffix)
            name = discovery_info.hostname.rstrip(".")
            if name.endswith(".local"):
                name = name[:-6]

        # Convert to entity prefix format (replace - with _)
        entity_prefix = name.replace("-", "_")

        # Set unique ID and abort if already configured
        await self.async_set_unique_id(entity_prefix)
        self._abort_if_unique_id_configured()

        # Store for later steps
        self.context["title_placeholders"] = {"name": name}
        self._discovered_prefix = entity_prefix

        return await self.async_step_discovery_confirm()

    async def async_step_discovery_confirm(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Confirm discovery and configure options."""
        errors: dict[str, str] = {}

        if user_input is not None:
            data = {
                CONF_ENTITY_PREFIX: self._discovered_prefix,
                **user_input,
            }
            try:
                info = await validate_input(self.hass, data)
            except EntityNotFoundError:
                errors["base"] = "entity_not_found"
            else:
                self._flow_data = {**data}
                self._flow_data["_title"] = info["title"]
                self._zone_count = int(data[CONF_ZONE_COUNT])
                return await self.async_step_zone_names()

        return self.async_show_form(
            step_id="discovery_confirm",
            data_schema=vol.Schema(
                {
                    vol.Required(
                        CONF_ZONE_COUNT,
                    ): selector.NumberSelector(
                        selector.NumberSelectorConfig(
                            min=1,
                            max=MAX_ZONE_COUNT,
                            mode=selector.NumberSelectorMode.BOX,
                        )
                    ),
                    vol.Optional(CONF_CURRENT_TEMP_SENSOR): selector.EntitySelector(
                        selector.EntitySelectorConfig(
                            domain="sensor", device_class="temperature"
                        )
                    ),
                    vol.Optional(CONF_HUMIDITY_SENSOR): selector.EntitySelector(
                        selector.EntitySelectorConfig(
                            domain="sensor", device_class="humidity"
                        )
                    ),
                }
            ),
            errors=errors,
            description_placeholders={"name": self._discovered_prefix},
        )

    def _finish_flow(self) -> FlowResult:
        """Create the config entry."""
        title = self._flow_data.pop("_title")
        return self.async_create_entry(title=title, data=self._flow_data)

    @staticmethod
    @callback
    def async_get_options_flow(
        config_entry: config_entries.ConfigEntry,
    ) -> config_entries.OptionsFlow:
        """Create the options flow."""
        return OptionsFlowHandler()


class OptionsFlowHandler(ZonePresetFlowMixin, config_entries.OptionsFlow):
    """Handle options flow for Actron Air ESPHome."""

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Manage the options."""
        if user_input is not None:
            self._flow_data = {**user_input}
            self._zone_count = int(user_input[CONF_ZONE_COUNT])
            # Pre-populate from existing config, filtering invalid zones
            existing_zone_names = self.config_entry.options.get(
                CONF_ZONE_NAMES,
                self.config_entry.data.get(CONF_ZONE_NAMES, {}),
            )
            self._zone_names = {
                k: v
                for k, v in existing_zone_names.items()
                if int(k) <= self._zone_count
            }
            existing_presets = self.config_entry.options.get(
                CONF_CUSTOM_PRESETS,
                self.config_entry.data.get(CONF_CUSTOM_PRESETS, {}),
            )
            self._custom_presets = {
                name: [z for z in zones if z <= self._zone_count]
                for name, zones in existing_presets.items()
                if any(z <= self._zone_count for z in zones)
            }
            return await self.async_step_zone_names()

        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema(
                {
                    vol.Required(
                        CONF_ZONE_COUNT,
                        default=self.config_entry.options.get(
                            CONF_ZONE_COUNT,
                            self.config_entry.data[CONF_ZONE_COUNT],
                        ),
                    ): selector.NumberSelector(
                        selector.NumberSelectorConfig(
                            min=1,
                            max=MAX_ZONE_COUNT,
                            mode=selector.NumberSelectorMode.BOX,
                        )
                    ),
                    vol.Optional(
                        CONF_CURRENT_TEMP_SENSOR,
                        default=self.config_entry.options.get(
                            CONF_CURRENT_TEMP_SENSOR,
                            self.config_entry.data.get(CONF_CURRENT_TEMP_SENSOR),
                        ),
                    ): selector.EntitySelector(
                        selector.EntitySelectorConfig(
                            domain="sensor", device_class="temperature"
                        )
                    ),
                    vol.Optional(
                        CONF_HUMIDITY_SENSOR,
                        default=self.config_entry.options.get(
                            CONF_HUMIDITY_SENSOR,
                            self.config_entry.data.get(CONF_HUMIDITY_SENSOR),
                        ),
                    ): selector.EntitySelector(
                        selector.EntitySelectorConfig(
                            domain="sensor", device_class="humidity"
                        )
                    ),
                }
            ),
        )

    def _finish_flow(self) -> FlowResult:
        """Create the options entry."""
        return self.async_create_entry(title="", data=self._flow_data)
