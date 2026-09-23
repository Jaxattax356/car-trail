/* The Car Trail - game configuration: occupations, cars, store items, pace,
 * rations, illnesses, weather tables. All money values are in cents.
 */
(function (root) {
  'use strict';
  const CT = root.CT;

  const CFG = {};

  CFG.occupations = {
    engineer: {
      id: 'engineer',
      title: 'software engineer from Boston',
      short: 'software engineer',
      money: 1200000,
      mult: 1,
      perk: 'Always has a charged phone, so you get lost less often.',
    },
    mechanic: {
      id: 'mechanic',
      title: 'auto mechanic from Detroit',
      short: 'auto mechanic',
      money: 600000,
      mult: 2,
      perk: 'Keeps the car running better, pays half price at repair shops, and is better at roadside repairs.',
    },
    student: {
      id: 'student',
      title: 'college student from Ohio',
      short: 'college student',
      money: 300000,
      mult: 3,
      perk: 'Years of instant ramen mean small meals hurt the party less.',
    },
  };
  CFG.occupationOrder = ['engineer', 'mechanic', 'student'];

  // Cars replace the ox team. rel = breakdown multiplier (lower is better),
  // wade = flood-water risk multiplier, snow = snow/ice risk multiplier.
  CFG.cars = {
    wagon: {
      id: 'wagon', name: 'station wagon', title: '1987 Wood-Panel Station Wagon',
      price: 120000, mpg: 17, tank: 18, cargo: 800, seats: 6, rel: 1.35, wade: 1.0, snow: 1.0, speed: 0.95, cond: 72,
      blurb: 'Cheap, roomy and full of family memories. Drinks gas and breaks down a lot.',
    },
    hatch: {
      id: 'hatch', name: 'hybrid hatchback', title: '2012 Hybrid Hatchback',
      price: 200000, mpg: 42, tank: 11, cargo: 450, seats: 5, rel: 1.0, wade: 1.45, snow: 1.35, speed: 1.0, cond: 84,
      blurb: 'Sips gas, but the small trunk and low ride make floods and snow risky.',
    },
    minivan: {
      id: 'minivan', name: 'minivan', title: '2009 Minivan',
      price: 300000, mpg: 22, tank: 20, cargo: 750, seats: 7, rel: 0.85, wade: 1.0, snow: 1.0, speed: 1.0, cond: 86,
      blurb: 'The sensible choice. Reliable, roomy and decent on gas.',
    },
    suv: {
      id: 'suv', name: '4x4 SUV', title: '2015 4x4 SUV',
      price: 500000, mpg: 16, tank: 24, cargo: 950, seats: 5, rel: 0.65, wade: 0.55, snow: 0.55, speed: 1.05, cond: 92,
      blurb: 'Tough, high off the ground and great in snow and floods. Thirsty.',
    },
  };
  CFG.carOrder = ['wagon', 'hatch', 'minivan', 'suv'];

  // Store items. `key` is the state field. Prices are per unit at Independence.
  CFG.items = [
    { id: 'cans', key: 'cans', name: 'Gas cans', unit: 'can', units: 'cans', price: 2500, max: 6,
      desc: 'Each gas can holds 5 extra gallons. Some stretches of road have no gas for hundreds of miles.' },
    { id: 'gas', key: 'gas', name: 'Gasoline', unit: 'gallon', units: 'gallons', price: 349, max: 999,
      desc: 'You can only carry as much gas as your tank and gas cans hold.' },
    { id: 'food', key: 'food', name: 'Food', unit: 'pound', units: 'pounds', price: 150, max: 2000,
      desc: 'Each person eats up to 3 pounds of food a day. Your car can only hold so much.' },
    { id: 'clothing', key: 'clothing', name: 'Warm clothing', unit: 'set', units: 'sets', price: 2500, max: 50,
      desc: 'The mountains get very cold. Each person needs at least 2 sets in freezing weather.' },
    { id: 'ammo', key: 'bullets', name: 'Ammunition', unit: 'box', units: 'boxes', price: 1800, max: 50, per: 20,
      desc: 'Each box holds 20 bullets for hunting. Hunting is a cheap way to get food.' },
    { id: 'tires', key: 'tires', name: 'Spare tires', unit: 'tire', units: 'tires', price: 9000, max: 3,
      desc: 'Back roads are hard on tires. Carry at least one spare.' },
    { id: 'batteries', key: 'batteries', name: 'Car batteries', unit: 'battery', units: 'batteries', price: 12000, max: 3,
      desc: 'Batteries die, especially in cold weather.' },
    { id: 'belts', key: 'belts', name: 'Fan belts', unit: 'belt', units: 'belts', price: 2500, max: 3,
      desc: 'A snapped fan belt leaves you stranded. They are cheap - bring one.' },
  ];
  CFG.itemById = {};
  CFG.items.forEach((it) => { CFG.itemById[it.id] = it; });

  CFG.paces = {
    steady: { id: 'steady', name: 'steady', miles: 130, health: 0, wear: 1.0, mpg: 1.0,
      desc: 'You drive about 6 hours a day, stopping often. Easy on people and the car.' },
    strenuous: { id: 'strenuous', name: 'strenuous', miles: 175, health: -2, wear: 1.6, mpg: 0.94,
      desc: 'You drive about 9 hours a day, starting early and stopping late. Tiring.' },
    grueling: { id: 'grueling', name: 'grueling', miles: 225, health: -4, wear: 2.4, mpg: 0.85,
      desc: 'You drive 12 hours a day or more, living on gas station coffee and speeding. Health and the car suffer.' },
  };
  CFG.paceOrder = ['steady', 'strenuous', 'grueling'];

  CFG.rations = {
    filling: { id: 'filling', name: 'filling', lbs: 3, health: 0.5, desc: 'big, generous meals.' },
    meager: { id: 'meager', name: 'meager', lbs: 2, health: -1.5, desc: 'small but adequate meals.' },
    bare: { id: 'bare', name: 'bare bones', lbs: 1, health: -3.5, desc: 'tiny meals; always hungry.' },
  };
  CFG.rationOrder = ['filling', 'meager', 'bare'];

  // `has` = phrase after "has", sev = health lost per day, days = duration.
  CFG.illnesses = [
    { id: 'flu', has: 'the flu', sev: [4, 7], days: [3, 6], w: 10 },
    { id: 'foodpoison', has: 'food poisoning', sev: [5, 9], days: [1, 3], w: 8 },
    { id: 'dysentery', has: 'dysentery', sev: [7, 12], days: [3, 6], w: 5 },
    { id: 'fever', has: 'a fever', sev: [4, 8], days: [2, 5], w: 7 },
    { id: 'exhaustion', has: 'exhaustion', sev: [3, 6], days: [2, 4], w: 6, when: 'tired' },
    { id: 'arm', has: 'a broken arm', sev: [2, 4], days: [5, 9], w: 3 },
    { id: 'ankle', has: 'a sprained ankle', sev: [1, 3], days: [3, 5], w: 4 },
    { id: 'heat', has: 'heatstroke', sev: [6, 10], days: [1, 3], w: 8, when: 'hot' },
    { id: 'frost', has: 'frostbite', sev: [5, 9], days: [3, 6], w: 8, when: 'cold' },
    { id: 'snake', has: 'a snakebite', sev: [7, 12], days: [2, 4], w: 3, when: 'west' },
    { id: 'carsick', has: 'carsickness', sev: [1, 3], days: [1, 2], w: 6 },
    { id: 'cold', has: 'a bad cold', sev: [2, 5], days: [3, 6], w: 8 },
    { id: 'pneumonia', has: 'pneumonia', sev: [9, 14], days: [4, 7], w: 4 },
    { id: 'appendicitis', has: 'appendicitis', sev: [11, 16], days: [3, 5], w: 2 },
  ];

  // Average daily high (F) on the plains, by month.
  CFG.monthTemps = [31, 36, 47, 58, 68, 78, 83, 81, 72, 60, 46, 34];
  // Chance of precipitation on a given day, by month.
  CFG.monthPrecip = [0.12, 0.14, 0.2, 0.26, 0.3, 0.26, 0.2, 0.18, 0.16, 0.15, 0.14, 0.13];

  // Travel regions: temperature offset, wetness, terrain.
  CFG.regions = {
    plains: { name: 'plains', tempOff: 0, wet: 1.0, mountain: false, speed: 1.0, wear: 1.0 },
    platte: { name: 'platte', tempOff: -3, wet: 0.8, mountain: false, speed: 1.0, wear: 1.0 },
    wyoming: { name: 'wyoming', tempOff: -9, wet: 0.6, mountain: false, speed: 0.95, wear: 1.15 },
    mountain: { name: 'mountain', tempOff: -15, wet: 0.9, mountain: true, speed: 0.8, wear: 1.4 },
    idaho: { name: 'idaho', tempOff: -4, wet: 0.55, mountain: false, speed: 1.0, wear: 1.05 },
    forest: { name: 'forest', tempOff: -10, wet: 1.0, mountain: true, speed: 0.8, wear: 1.3 },
    oregon: { name: 'oregon', tempOff: -2, wet: 0.7, mountain: false, speed: 1.0, wear: 1.0 },
    hood: { name: 'hood', tempOff: -14, wet: 1.3, mountain: true, speed: 0.75, wear: 1.4 },
  };

  CFG.startMonths = [2, 3, 4, 5, 6]; // March .. July, like the original

  CFG.repairPerPoint = 600; // cents per condition point at Independence prices
  CFG.motelPerNight = 9000;
  CFG.clinicPerPatient = 15000;
  CFG.towCost = 25000;
  CFG.barlowToll = 6000;
  CFG.carryLimit = 200; // pounds of meat you can haul back to the car from a hunt

  CFG.defaultTopTen = [
    { name: 'Ezra Meeker', score: 7650, occ: 'engineer' },
    { name: 'Tabitha Brown', score: 5694, occ: 'student' },
    { name: 'Sam Barlow', score: 4138, occ: 'mechanic' },
    { name: 'Jim Bridger', score: 2945, occ: 'mechanic' },
    { name: 'Narcissa Whitman', score: 2052, occ: 'engineer' },
    { name: 'John Bidwell', score: 1401, occ: 'student' },
    { name: 'Joe Meek', score: 1038, occ: 'mechanic' },
    { name: 'Jesse Applegate', score: 694, occ: 'engineer' },
    { name: 'Peter Burnett', score: 312, occ: 'student' },
    { name: 'Nancy Kelsey', score: 132, occ: 'engineer' },
  ];

  CFG.ratings = [
    { min: 3000, name: 'Road Warrior' },
    { min: 1000, name: 'Road Tripper' },
    { min: 0, name: 'Backseat Driver' },
  ];

  CT.CFG = CFG;
})(typeof window !== 'undefined' ? window : globalThis);
