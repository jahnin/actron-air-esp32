#!/bin/bash

set -e

if [ ! -d "cdeps/esphome-repo" ]; then
  git clone https://github.com/esphome/esphome.git cdeps/esphome-repo
fi

if [ ! -d "cdeps/ArduinoJson" ]; then
  git clone git@github.com:bblanchon/ArduinoJson.git cdeps/ArduinoJson
fi

# Set up Python virtual environment with uv
if [ ! -d ".venv" ]; then
  echo "Creating Python virtual environment..."
  uv venv
fi

echo "Installing ESPHome dependencies..."
uv pip install -r cdeps/esphome-repo/requirements.txt
uv pip install -e cdeps/esphome-repo

echo ""
echo "Development environment ready!"
echo "Activate with: source .venv/bin/activate"
