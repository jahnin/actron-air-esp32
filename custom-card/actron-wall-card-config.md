```

type: custom:actron-wall-card

entities:

&#x20; temp\_sensor: sensor.actron\_wifi\_setpoint\_temperature

&#x20; power\_switch: switch.actron\_wifi\_power

&#x20; temp\_up: button.actron\_wifi\_temp\_up

&#x20; temp\_down: button.actron\_wifi\_temp\_down

&#x20; fan\_button: button.actron\_wifi\_fan

&#x20; mode\_button: button.actron\_wifi\_mode

&#x20; fan\_mode: sensor.actron\_wifi\_fan\_mode

&#x20; cool: binary\_sensor.actron\_wifi\_cool

&#x20; heat: binary\_sensor.actron\_wifi\_heat

&#x20; auto: binary\_sensor.actron\_wifi\_auto

&#x20; run: binary\_sensor.actron\_wifi\_run

&#x20; fan\_low: binary\_sensor.actron\_wifi\_fan\_low

&#x20; fan\_mid: binary\_sensor.actron\_wifi\_fan\_mid

&#x20; fan\_high: binary\_sensor.actron\_wifi\_fan\_high

&#x20; fan\_cont: binary\_sensor.actron\_wifi\_fan\_cont

zones:

&#x20; - entity: switch.actron\_wifi\_zone\_1

&#x20;   name: Master

&#x20;   icon: zone

&#x20; - entity: switch.actron\_wifi\_zone\_2

&#x20;   name: Kids

&#x20; - entity: switch.actron\_wifi\_zone\_3

&#x20;   name: Office

&#x20; - entity: switch.actron\_wifi\_zone\_4

&#x20;   name: Study

&#x20; - entity: switch.actron\_wifi\_zone\_5

&#x20;   name: Living

labels:

&#x20; title: Actron Air

&#x20; running: Running

&#x20; standby: Standby

&#x20; setpoint: Setpoint

&#x20; adjust: Adjust

&#x20; mode\_section: Mode

&#x20; fan\_section: Fan

&#x20; zone\_section: Zones

&#x20; cool: Cool

&#x20; heat: Heat

&#x20; auto: Auto

&#x20; fan\_low: Low

&#x20; fan\_mid: Med

&#x20; fan\_high: High

&#x20; fan\_cont: Cont

icons:

&#x20; power: power

&#x20; cool: mdi:snowboard

&#x20; heat: heat

&#x20; auto: auto

&#x20; fan\_low: fan\_low

&#x20; fan\_mid: fan\_mid

&#x20; fan\_high: fan\_high

&#x20; fan\_cont: fan\_cont

&#x20; zone: zone

theme:

&#x20; card\_bg: rgba(12,16,28,0.75)

&#x20; card\_border: rgba(255,255,255,0.07)

&#x20; card\_radius: 24px

&#x20; card\_padding: 20px

&#x20; blur: 24px

&#x20; text\_primary: rgba(255,255,255,0.20)

&#x20; text\_secondary: rgba(255,255,255,0.35)

&#x20; text\_accent: rgba(255,255,255,0.7)

&#x20; title\_color: rgba(255,255,255,0.35)

&#x20; temp\_color: rgba(255,255,255,0.92)

&#x20; temp\_unit\_color: rgba(255,255,255,0.4)

&#x20; temp\_bg: rgba(255,255,255,0.04)

&#x20; power\_on\_bg: rgba(52,211,153,0.15)

&#x20; power\_on\_border: rgba(52,211,153,0.45)

&#x20; power\_on\_color: "#34d399"

&#x20; running\_color: "#34d399"

&#x20; running\_bg: rgba(52,211,153,0.1)

&#x20; running\_border: rgba(52,211,153,0.3)

&#x20; cool\_color: rgba(56,189,248,0.9)

&#x20; cool\_bg: rgba(56,189,248,0.12)

&#x20; cool\_border: rgba(56,189,248,0.4)

&#x20; heat\_color: rgba(251,146,60,0.9)

&#x20; heat\_bg: rgba(251,146,60,0.12)

&#x20; heat\_border: rgba(251,146,60,0.4)

&#x20; auto\_color: rgba(167,139,250,0.9)

&#x20; auto\_bg: rgba(167,139,250,0.12)

&#x20; auto\_border: rgba(167,139,250,0.4)

&#x20; fan\_active\_color: rgba(56,189,248,0.9)

&#x20; fan\_active\_bg: rgba(56,189,248,0.12)

&#x20; fan\_active\_border: rgba(56,189,248,0.35)

&#x20; zone\_on\_color: rgba(52,211,153,0.9)

&#x20; zone\_on\_bg: rgba(52,211,153,0.1)

&#x20; zone\_on\_border: rgba(52,211,153,0.38)

&#x20; btn\_bg: rgba(255,255,255,0.04)

&#x20; btn\_border: rgba(255,255,255,0.07)

&#x20; btn\_color: rgba(255,255,255,0.38)

&#x20; section\_label\_color: rgba(255,255,255,0.28)

&#x20; divider\_color: rgba(255,255,255,0.06)

&#x20; chip\_bg: rgba(255,255,255,0.04)

&#x20; chip\_border: rgba(255,255,255,0.07)

&#x20; chip\_text: rgba(255,255,255,0.35)

```



