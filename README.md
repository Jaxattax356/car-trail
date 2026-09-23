# The Car Trail

An Oregon Trail style road trip game, modernized with cars. Retrace the historic
2,000-mile Oregon Trail from Independence, Missouri to Oregon's Willamette Valley,
on the back roads, in a beat-up family car.

All artwork is procedurally rasterized, pixel by pixel, at 320x240 in the
dithered EGA/VGA style of the original game: flat skies with puffy clouds,
purple snow-capped peaks, streaky blue rivers, speckled meadows, white caption
plates and "Press SPACE BAR to continue".

## Play

Open `index.html` in any modern browser. No build step, no server and no
downloads are needed. It also works straight from `file://`.

It works with the keyboard, the mouse or a touch screen. Press a number key (or
click) to choose from a menu. While driving, press ENTER (or tap) to stop and
size up the situation.

## What's in it

Classic Oregon Trail mechanics, adapted for cars:

- **Occupations**: software engineer (most money), auto mechanic (2x points,
  better repairs) and college student (3x points, hardy on small meals).
- **Your car replaces the oxen**: a station wagon, hybrid hatchback, minivan or
  4x4 SUV, or a real-world performance car: Infiniti G37 Coupe, Infiniti Q50,
  Audi S4, BMW M3, BMW M5 or Audi RS6 Avant, each drawn from its real-life
  shape, color, wheels and trim. Each car has different mpg, tank size, trunk
  space, reliability, snow handling (rear-drive vs. quattro/AWD) and ground
  clearance.
- **Supplies**: gas, gas cans, food, warm clothing, ammunition, spare tires,
  batteries and fan belts. Prices rise the farther west you go.
- **Pace and rations**: steady, strenuous or grueling; filling, meager or bare bones.
- **Illness**: the flu, food poisoning, pneumonia, snakebites and, of course,
  dysentery. Rest, or pay for urgent care in town.
- **Flooded river crossings**: drive through, pay a toll bridge, take a detour or
  wait. *Turn around, don't drown!*
- **Forks in the road** at South Pass and the Blue Mountains, and the final choice
  at The Dalles.
- **Random events**: flat tires, dead batteries, speeding tickets, wrong turns,
  road construction, thieves, hailstorms, tornado warnings, blizzards,
  wildfires, lonely gas stations, hitchhikers and roadside attractions.
- Trading, talking to locals (with real trail history), resting at motels and
  working day jobs.
- **Scoring and a Top Ten list**. When your driver dies, you leave a
  tombstone with an epitaph that later trips will pass on the road.
- Your trip is saved automatically; continue it from the title screen.

### Mini-games

- **Hunting**: animals run across the field at three depths. You can only carry
  200 pounds of meat back to the car.
- **Fishing**: cast, wait for a bite, set the hook, then reel the fish in.
- **Roadside repair**: tighten the lug nuts before the needle leaves the green.
- **The Columbia River Highway**: a top-down drive down the twisting gorge road,
  dodging rockfalls, potholes, deer, slow trucks and oncoming traffic.

## Project layout

```
index.html          entry point (plain scripts, no modules, so file:// works)
css/style.css
js/core/            util, pixel raster library, bitmap font, audio, engine, UI widgets
js/data/            game configuration and the route (landmarks, history, map data)
js/game/sim.js      the simulation (pure logic, no DOM)
js/art/             procedural pixel art: cars, animals, scenes, travel strip, title, map
js/screens/         title, setup, store, trail menu, travel, landmarks, ending
js/minigames/       hunting, fishing, Columbia Gorge drive, roadside repair
tests/sim-test.js   headless simulation fuzz + balance tests (node)
tests/play-test.js  end-to-end browser playthrough (Playwright)
tests/preview.html  art preview page
```

## Tests

```
node tests/sim-test.js 600
```

This runs hundreds of randomized games through every branch of the simulation,
checking invariants after each step: no NaN, no negative supplies, gas within
tank capacity, and the game always terminates. It then reports balance
statistics for a sensible bot, per occupation and car.

```
node tests/play-test.js [seed] [occupation 1-3] [car 1-4] [month 1-5]
```

This is an end-to-end test in headless Chromium, using Playwright with a
virtual clock. A bot plays two complete trips through the real UI: shopping,
river crossings, breakdowns, all four mini-games, save and resume, roadside
memorials, and the ending. The test fails on any JavaScript error or if the game
ever gets stuck. Set `SHOTS=<dir>` to save a screenshot of every screen it visits.
