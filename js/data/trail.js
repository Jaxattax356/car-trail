/* The Car Trail - the route. Follows the historic Oregon Trail by modern back roads:
 * Independence, Missouri to Oregon's Willamette Valley, with the classic forks.
 * Distances mirror the trail mileages; `lat`/`lon` drive the map screen.
 */
(function (root) {
  'use strict';
  const CT = root.CT;

  const N = {};
  function node(id, o) { N[id] = Object.assign({ id }, o); }

  node('independence', {
    name: 'Independence, Missouri', short: 'Independence', type: 'town', lat: 39.09, lon: -94.42,
    region: 'plains', price: 1.0, store: "Mel's Gas & Grocery", shop: "Luis's Auto Repair",
    next: [{ to: 'kansas', miles: 102 }],
  });
  node('kansas', {
    name: 'Kansas River crossing', short: 'Kansas River', type: 'river', lat: 39.06, lon: -95.68,
    region: 'plains', fish: 'kansas',
    river: { depth: [0.4, 2.4], length: [140, 260], toll: 2500, tollName: 'the Highway 24 toll bridge',
      detour: [40, 60], detourDays: 1, detourName: 'drive around through Topeka' },
    next: [{ to: 'bigblue', miles: 83 }],
  });
  node('bigblue', {
    name: 'Big Blue River crossing', short: 'Big Blue River', type: 'river', lat: 39.84, lon: -96.65,
    region: 'plains', fish: 'kansas',
    river: { depth: [0.2, 1.7], length: [90, 180], toll: 0, tollName: '',
      detour: [60, 90], detourDays: 1, detourName: 'drive the long way around through Marysville' },
    next: [{ to: 'kearney', miles: 119 }],
  });
  node('kearney', {
    name: 'Kearney, Nebraska', short: 'Kearney', type: 'town', lat: 40.7, lon: -99.08,
    region: 'plains', price: 1.1, store: 'Archway Stop-N-Shop', shop: 'Platte Valley Auto',
    next: [{ to: 'chimney', miles: 250 }],
  });
  node('chimney', {
    name: 'Chimney Rock', short: 'Chimney Rock', type: 'landmark', lat: 41.7, lon: -103.35,
    region: 'platte',
    next: [{ to: 'laramie', miles: 86 }],
  });
  node('laramie', {
    name: 'Fort Laramie, Wyoming', short: 'Fort Laramie', type: 'town', lat: 42.21, lon: -104.56,
    region: 'platte', price: 1.25, store: 'Old Bedlam Trading Post', shop: 'Fort Laramie Garage',
    next: [{ to: 'indrock', miles: 190 }],
  });
  node('indrock', {
    name: 'Independence Rock', short: 'Independence Rock', type: 'landmark', lat: 42.49, lon: -107.13,
    region: 'wyoming',
    next: [{ to: 'southpass', miles: 102 }],
  });
  node('southpass', {
    name: 'South Pass', short: 'South Pass', type: 'landmark', lat: 42.36, lon: -108.92,
    region: 'mountain',
    fork: true,
    next: [
      { to: 'greenriver', miles: 57, label: 'head for Green River crossing' },
      { to: 'bridger', miles: 125, label: 'head for Fort Bridger' },
    ],
  });
  node('greenriver', {
    name: 'Green River crossing', short: 'Green River', type: 'river', lat: 42.05, lon: -110.12,
    region: 'wyoming', fish: 'green',
    river: { depth: [0.6, 2.8], length: [160, 300], toll: 4000, tollName: 'the county toll bridge',
      detour: [70, 110], detourDays: 1, detourName: 'drive around through the town of Green River' },
    next: [{ to: 'soda', miles: 144 }],
  });
  node('bridger', {
    name: 'Fort Bridger, Wyoming', short: 'Fort Bridger', type: 'town', lat: 41.32, lon: -110.39,
    region: 'wyoming', price: 1.4, store: "Bridger's Trading Post", shop: 'Mountain Man Motors',
    next: [{ to: 'soda', miles: 162 }],
  });
  node('soda', {
    name: 'Soda Springs, Idaho', short: 'Soda Springs', type: 'landmark', lat: 42.65, lon: -111.6,
    region: 'mountain',
    next: [{ to: 'pocatello', miles: 57 }],
  });
  node('pocatello', {
    name: 'Fort Hall (Pocatello), Idaho', short: 'Fort Hall', type: 'town', lat: 42.87, lon: -112.45,
    region: 'idaho', price: 1.45, store: 'Fort Hall Mercantile', shop: 'Gate City Auto',
    next: [{ to: 'snake', miles: 182 }],
  });
  node('snake', {
    name: 'Snake River crossing', short: 'Snake River', type: 'river', lat: 42.95, lon: -115.3,
    region: 'idaho', fish: 'snake',
    river: { depth: [1.0, 3.4], length: [300, 500], toll: 6000, tollName: 'the Glenns Ferry toll bridge',
      detour: [90, 140], detourDays: 2, detourName: 'drive upriver to a free bridge' },
    next: [{ to: 'boise', miles: 114 }],
  });
  node('boise', {
    name: 'Fort Boise (Boise), Idaho', short: 'Fort Boise', type: 'town', lat: 43.62, lon: -116.2,
    region: 'idaho', price: 1.5, store: 'Capitol City Market', shop: 'Treasure Valley Tire & Auto',
    next: [{ to: 'bluemtns', miles: 160 }],
  });
  node('bluemtns', {
    name: 'Blue Mountains', short: 'Blue Mountains', type: 'landmark', lat: 45.6, lon: -118.4,
    region: 'forest',
    fork: true,
    next: [
      { to: 'wallawalla', miles: 55, label: 'head for Walla Walla' },
      { to: 'dalles', miles: 125, label: 'head for The Dalles' },
    ],
  });
  node('wallawalla', {
    name: 'Fort Walla Walla, Washington', short: 'Walla Walla', type: 'town', lat: 46.06, lon: -118.34,
    region: 'oregon', price: 1.55, store: 'Sweet Onion General Store', shop: 'Whitman Auto Works',
    next: [{ to: 'dalles', miles: 120 }],
  });
  node('dalles', {
    name: 'The Dalles, Oregon', short: 'The Dalles', type: 'town', lat: 45.6, lon: -121.18,
    region: 'oregon', price: 1.6, store: 'End of the Trail Market', shop: 'Gorge Garage', fish: 'columbia',
    final: true,
    next: [{ to: 'willamette', miles: 100 }],
  });
  node('willamette', {
    name: 'Willamette Valley, Oregon', short: 'Willamette Valley', type: 'end', lat: 45.36, lon: -122.61,
    region: 'hood',
    next: [],
  });

  // Order used for the map and for "landmarks passed" bookkeeping.
  const ORDER = ['independence', 'kansas', 'bigblue', 'kearney', 'chimney', 'laramie', 'indrock', 'southpass',
    'greenriver', 'bridger', 'soda', 'pocatello', 'snake', 'boise', 'bluemtns', 'wallawalla', 'dalles', 'willamette'];

  const TALK = {
    independence: [
      ['Ruth, a guide at the National Frontier Trails Museum, tells you:', 'Independence was called the Queen City of the Trails. Wagon trains left from here for Oregon, California and Santa Fe. You\'re doing it the easy way!'],
      ['Luis, a mechanic, tells you:', 'Carry a spare tire and a fan belt. Out west the back roads are rough and the towns are far apart. A couple of gas cans won\'t hurt either.'],
      ['Your cousin Darla says:', 'Two thousand miles in that thing? My great-great-grandmother walked it next to an ox cart. Leave too early and you\'ll hit snow in the mountains. Leave too late and you\'ll bake.'],
    ],
    kansas: [
      ['A park ranger tells you:', 'In the 1840s the Papin brothers ran a ferry here for pioneers. When the river floods, this low-water crossing ends up under several feet of water. Turn around, don\'t drown!'],
      ['A fisherman says:', 'Catfish are biting. And remember - two feet of moving water can float a car. I\'ve seen it happen. If it\'s deep, pay for the toll bridge.'],
      ['A truck driver tells you:', 'Kansas weather changes fast. Watch for thunderstorms and tornado warnings this time of year.'],
    ],
    bigblue: [
      ['A farmer named Hank says:', 'Pioneers camped at Alcove Spring near here. Somebody carved "J.F. Reed 26 May 1846" in the rock - that was the Donner Party, on their way to trouble.'],
      ['A teenager at the gas pump says:', 'The old bridge washed out years ago and there\'s no toll bridge. Wade it if it\'s low, or take the long way around through Marysville.'],
      ['A retired schoolteacher tells you:', 'The Big Blue can rise several feet overnight after a storm. If you wait a day or two, it usually goes back down.'],
    ],
    kearney: [
      ['A guide at the Archway museum tells you:', 'That big building spanning the interstate is the Great Platte River Road Archway. The Oregon, California and Mormon trails all followed the Platte River right through here.'],
      ['A waitress at the diner says:', 'Fort Kearny was built in 1848 to protect travelers. Nowadays folks come in March to watch half a million sandhill cranes.'],
      ['A trucker named Big Mike says:', 'Past here the towns get farther apart. From Fort Laramie on, fill your tank every chance you get.'],
    ],
    chimney: [
      ['A photographer tells you:', 'Chimney Rock is the landmark mentioned most in pioneer diaries. The spire used to be taller - wind and rain wear it down a little every year.'],
      ['A rancher says:', 'It\'s about 300 feet from the base to the tip. Pioneers could see it from 30 miles away. Took them days to reach it. Took you about an hour.'],
      ['A kid in another car shouts:', 'It looks like a giant upside-down ice cream cone!'],
    ],
    laramie: [
      ['A park ranger in a cavalry uniform tells you:', 'Fort Laramie started as a fur-trading post in 1834. The army bought it in 1849. The big white building is Old Bedlam, the oldest standing building in Wyoming.'],
      ['A mechanic at the gas station says:', 'From here on it\'s high desert. Long stretches with no gas at all. If your tank is small, buy some gas cans.'],
      ['A cyclist riding across the country says:', 'The wind in Wyoming never stops. It has blown straight into my face for three hundred miles.'],
    ],
    indrock: [
      ['A historian tells you:', 'Pioneers tried to reach Independence Rock by the Fourth of July so they\'d cross the mountains before the snow. Thousands carved their names here. They called it the Register of the Desert.'],
      ['A rock climber says:', 'The rock is about 130 feet high and more than a mile around. From the top you can see the whole Sweetwater River valley.'],
      ['A hiker says:', 'Don\'t go walking in the sagebrush in sandals. Rattlesnakes love it out here.'],
    ],
    southpass: [
      ['A highway worker tells you:', 'This is South Pass, the gentle gap across the Continental Divide, 7,412 feet up. It\'s so wide and flat that pioneers were surprised to learn they had crossed the Rockies.'],
      ['A sheep rancher says:', 'The road splits ahead. The shortcut past Green River saves miles, but there\'s no gas until Fort Hall. Fort Bridger is the long way, but it has a town.'],
      ['A trucker says:', 'Snow can close this road almost any month but July. If it\'s snowing, you\'ll need warm clothes - lots of them.'],
    ],
    greenriver: [
      ['A local historian tells you:', 'Pioneers paid up to $16 to be ferried across the Green River. Many carved their names on Names Hill just downstream. Jim Bridger\'s name is up there too.'],
      ['A fly fisherman says:', 'Best trout fishing in Wyoming. But the river is cold, fast and deep in spring. Don\'t drive through it unless it\'s really low.'],
      ['A rancher says:', 'The flooded road here gets deep after the snow melts. There\'s a toll bridge a few miles north if you have the money.'],
    ],
    bridger: [
      ['A man dressed as a mountain man tells you:', 'Jim Bridger opened a trading post here in 1843 to sell supplies to emigrants. His prices were high too!'],
      ['A store clerk says:', 'There\'s no gas at Soda Springs worth mentioning. Fill up here - the next real town is Fort Hall.'],
      ['A tourist from Germany says:', 'Everything in America is so far apart! We have driven four hundred miles and seen six cows.'],
    ],
    soda: [
      ['A park worker tells you:', 'The springs here are naturally fizzy. Pioneers called them Beer Springs. And the geyser in town erupts every hour, on the hour.'],
      ['A retired miner says:', 'Our geyser is "captive" - they capped it in 1937 and put it on a timer. The only one like it in the world.'],
      ['A waitress says:', 'Fort Hall is just up the road in Pocatello. It\'s the last big town for a long while. Stock up there.'],
    ],
    pocatello: [
      ['A railroad worker tells you:', 'Fort Hall was where pioneers decided - Oregon or California. Lots of wagons turned south here. There\'s a replica of the fort in town.'],
      ['A college student says:', 'Next is the Snake River. No bridge at Three Island Crossing, but there\'s a toll bridge. It isn\'t cheap.'],
      ['A mechanic says:', 'Lots of sharp lava rock west of here. Tires hate it.'],
    ],
    snake: [
      ['A state park ranger tells you:', 'This is Three Island Crossing. Pioneers used the islands as stepping stones to ford the Snake. Many drowned. About half chose to stay on the south side instead.'],
      ['A fisherman says:', 'You can catch sturgeon in the Snake - some are as long as your car. Good luck landing one.'],
      ['A farmer says:', 'The water runs deep and fast here in spring. Drive through it at your own risk.'],
    ],
    boise: [
      ['A state worker tells you:', 'Old Fort Boise was a Hudson\'s Bay Company post. Today Boise is the capital of Idaho, and the capitol building is heated by natural hot springs!'],
      ['A bike messenger says:', 'The Blue Mountains are next. Steep grades and sharp curves. Check your brakes and keep warm clothes handy.'],
      ['A potato farmer says:', 'Buy your food here. Prices only go up the farther west you go.'],
    ],
    bluemtns: [
      ['A forest ranger tells you:', 'Pioneers had to cut a road through these forests with axes. Now the highway climbs over Deadman Pass. The grades are so steep that trucks burn up their brakes.'],
      ['A hunter says:', 'Lots of elk in these woods, and bears too. Good hunting if you brought bullets.'],
      ['A trucker says:', 'The road splits here. Walla Walla has a town and supplies. The road straight to The Dalles is shorter.'],
    ],
    wallawalla: [
      ['A winemaker tells you:', 'Marcus and Narcissa Whitman built a mission near here in 1836. Today the valley is famous for wine and sweet onions.'],
      ['A wheat farmer says:', 'The Dalles is 120 miles west, along the Columbia River. The wind will push you along.'],
      ['A professor says:', 'Fort Walla Walla was a Hudson\'s Bay trading post on the Columbia. Pioneers bought supplies there before the last push.'],
    ],
    dalles: [
      ['A museum guide tells you:', 'The Dalles was the end of the overland trail. Pioneers either floated down the dangerous Columbia River on rafts, or paid to take the Barlow Road over Mount Hood.'],
      ['A windsurfer says:', 'The old Columbia River Highway is the most beautiful road in America - waterfalls, cliffs and tunnels. It\'s also narrow, twisty and full of rockfalls. Drive carefully!'],
      ['A toll booth attendant says:', 'Sam Barlow opened his toll road over Mount Hood in 1846. It costs $60 today. It\'s slower and the weather can turn, but there\'s no traffic.'],
    ],
  };

  // Rough state borders & rivers for the map (lat, lon).
  const MAP = {
    bounds: { latMin: 37.6, latMax: 47.4, lonMin: -124.4, lonMax: -93.2 },
    states: [
      // Each is a polyline of [lat, lon]
      [[40.0, -95.3], [40.0, -102.05]], // KS/NE
      [[37.6, -94.62], [39.1, -94.6], [39.6, -94.9], [40.0, -95.3]], // MO/KS (Missouri River)
      [[37.6, -102.05], [41.0, -102.05], [41.0, -104.05], [43.0, -104.05]], // KS-CO / NE-WY
      [[43.0, -104.05], [43.0, -98.5], [42.7, -96.5]], // NE/SD
      [[41.0, -104.05], [41.0, -111.05], [42.0, -111.05], [45.0, -111.05]], // WY/CO/UT/ID
      [[45.0, -104.05], [45.0, -111.05]], // WY/MT
      [[43.0, -104.05], [45.0, -104.05]], // WY/SD
      [[42.0, -111.05], [42.0, -120.0], [42.0, -124.2]], // ID/UT/NV, OR/CA
      [[42.0, -117.03], [43.8, -117.03], [44.3, -117.2], [45.6, -116.6], [46.0, -116.9], [46.0, -117.03], [47.4, -117.04]], // OR-ID / WA-ID
      [[46.0, -116.9], [46.0, -119.0], [45.9, -119.6], [45.7, -120.6], [45.6, -121.2], [45.7, -122.0], [45.6, -122.8], [46.2, -123.9]], // OR/WA (Columbia)
      [[45.0, -111.05], [44.5, -111.4], [44.4, -112.3], [44.6, -113.2], [45.7, -114.5], [46.6, -114.6], [47.4, -115.7]], // ID/MT
    ],
    rivers: [
      [[39.1, -94.6], [39.05, -95.7], [39.2, -96.6], [39.4, -97.5]], // Kansas
      [[40.7, -96.0], [40.7, -98.4], [41.1, -100.8], [41.6, -103.2], [42.2, -104.6], [42.6, -106.3]], // Platte / N. Platte
      [[42.9, -112.4], [42.6, -113.8], [42.6, -114.8], [42.95, -115.3], [43.7, -116.9], [44.3, -117.2], [45.6, -116.6]], // Snake
      [[46.2, -119.0], [45.9, -119.6], [45.7, -120.6], [45.6, -121.2], [45.6, -122.3], [46.2, -123.9]], // Columbia
      [[42.0, -110.1], [41.5, -109.4], [41.0, -109.6]], // Green
    ],
    coast: [[47.4, -124.6], [46.2, -123.95], [45.0, -124.0], [43.0, -124.4], [42.0, -124.25], [37.6, -123.0]],
  };

  CT.TRAIL = { nodes: N, order: ORDER, talk: TALK, map: MAP, start: 'independence', end: 'willamette' };
})(typeof window !== 'undefined' ? window : globalThis);
