"""Actron Air ESPHome integration for Home Assistant."""

from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant

from .const import CONF_CUSTOM_PRESETS, CONF_ZONE_NAMES, DOMAIN

_LOGGER = logging.getLogger(__name__)

PLATFORMS: list[Platform] = [Platform.CLIMATE]

# Frontend card registration
CARD_URL = f"/local/{DOMAIN}/actron-air-esphome-card.js"


async def async_migrate_entry(hass: HomeAssistant, config_entry: ConfigEntry) -> bool:
    """Migrate old entry to new version."""
    if config_entry.version == 1:
        _LOGGER.debug("Migrating config entry from version 1 to 2")
        new_data = {**config_entry.data}
        new_data.setdefault(CONF_ZONE_NAMES, {})
        new_data.setdefault(CONF_CUSTOM_PRESETS, {})
        hass.config_entries.async_update_entry(
            config_entry, data=new_data, version=2
        )
        _LOGGER.debug("Migration to version 2 successful")

    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Actron Air ESPHome from a config entry."""
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = entry.data

    # Register frontend card (only once)
    await _async_register_frontend(hass)

    # Forward setup to platforms
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    # Reload on options change
    entry.async_on_unload(entry.add_update_listener(_async_update_options))

    return True


async def _async_update_options(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Handle options update."""
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    if unload_ok := await hass.config_entries.async_unload_platforms(entry, PLATFORMS):
        hass.data[DOMAIN].pop(entry.entry_id)

    return unload_ok


async def _async_register_frontend(hass: HomeAssistant) -> None:
    """Register the frontend card."""

    # Path to bundled card
    card_path = Path(__file__).parent / "frontend" / "actron-air-esphome-card.js"

    if not card_path.exists():
        _LOGGER.warning(
            "Actron Air ESPHome card not found at %s. Card will not be auto-registered.",
            card_path,
        )

        return

    # Register static path to serve the JS file
    await hass.http.async_register_static_paths(
        [StaticPathConfig(CARD_URL, str(card_path), cache_headers=False)]
    )

    # Add as extra JS module so it loads on all dashboards
    add_extra_js_url(hass, CARD_URL)

    _LOGGER.debug("Registered Actron Air ESPHome frontend card at %s", CARD_URL)
