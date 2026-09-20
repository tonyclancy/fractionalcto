'use strict';
// Content only: append a definition to extend the campaign; identifiers stay stable.
const LEVEL_THEMES={verdant:0,forge:1,abyss:2,reef:3,storm:4,core:5};
const BOSS_KINDS={warden:0,cathedral:1,sovereign:2,monarch:3,regent:4,mother:5};
// Reusable habitat and encounter definitions: a level selects these by stable ID.
// Asset selection remains independent, so a biome can support many authored routes.
const ENVIRONMENTS=freezeContent({
 'stellar-corona':{label:'STELLAR CORONA',medium:'air',heat:1,clouds:0,water:0},
 'high-atmosphere':{augmentation:'orbital',label:'HIGH ATMOSPHERE',medium:'air',heat:0,clouds:.95,water:0},
 'low-atmosphere':{label:'LOW ATMOSPHERE',medium:'air',heat:0,clouds:1,water:0},
 'surface':{label:'PLANET SURFACE',medium:'air',heat:.18,clouds:.45,water:0},
 'underground':{label:'UNDERGROUND',medium:'air',heat:.8,clouds:0,water:0},
 'undersea':{label:'SUBSURFACE OCEAN',medium:'water',heat:0,clouds:0,water:.8},
 'deep-underground':{label:'DEEP UNDERGROUND',medium:'air',heat:1,clouds:0,water:0},
 'deep-undersea':{augmentation:'pressure',label:'ABYSSAL SEA',medium:'water',heat:0,clouds:0,water:1}
});
// Each encounter carries an explicit learnable technique. New worlds reuse
// a tested combat rule independently of their species, palette and climate.
const BOSS_TECHNIQUES=freezeContent({
 'bait-charge':{cue:'MOUTH AND WINGS CHARGE',response:'DODGE THE CHARGE · TURN AND AIM',reward:'OPEN MOUTH · BONUS DAMAGE'},
 'dismantle':{cue:'BATTERY PORTS OPEN',response:'BREAK BATTERIES · FLANK THE REACTOR',reward:'CORE EXPOSED · FOLLOW ITS PULSE GAP'},
 'cut-pressure':{cue:'SIPHON FILLS',response:'CROSS THE STREAM · ATTACK BETWEEN BURSTS',reward:'PRESSURE RELEASE · MANTLE EXPOSED'},
 'break-knots':{cue:'THREE TIDE KNOTS GROW',response:'BREAK THE KNOTS · FOLLOW THE RING GAPS',reward:'CURRENT STOPS · LONGER DAMAGE WINDOW'},
 'escape-maw':{cue:'MAW OPENS OR SPORE PODS GROW',response:'ESCAPE THE PULL · KEEP A CLEAR CORRIDOR',reward:'MAW RECOVERS · ATTACK THE OPENING'},
 'bait-capacitor':{cue:'CAPACITOR LIGHTS',response:'SIDESTEP THE BURST · BAIT THE SWEEP',reward:'ARMOR VENT OPENS · AIM PRECISELY'},
 'break-brood':{cue:'GUARDIANS EMERGE',response:'BREAK THE BROOD · EVADE THE CLAW COMBO',reward:'SHROUD BREAKS · QUEEN EXPOSED'}
});
function bossTechnique(l){return BOSS_TECHNIQUES[l.encounterDirector==='tide-knots'?'break-knots':bossEncounterProfile(l).technique];}
const BOSS_ENCOUNTERS=freezeContent({
 warden:{technique:'bait-charge',anatomy:'Armoured four-winged sky hunter',inspiration:'dragonfly / mantis',habitat:'air',power:'furnace-gale',signature:'FURNACE GALE',cooldown:5.8,phaseStep:.6,warning:1.45},
 cathedral:{technique:'dismantle',anatomy:'Sectional engine guardian',inspiration:'industrial turbine / armoured beetle',habitat:'air',power:'reactor-siege',signature:'REACTOR OVERDRIVE',cooldown:5.6,phaseStep:.5,warning:1.5},
 sovereign:{technique:'cut-pressure',anatomy:'Wide undulating pressure fins',inspiration:'manta ray / deep-sea shark',habitat:'water',power:'tidal-pressure',signature:'TIDAL PRESSURE',cooldown:5.6,phaseStep:.5,warning:1.65},
 monarch:{technique:'escape-maw',anatomy:'Chambered mantle and grasping feeding arms',inspiration:'nautilus / octopus',habitat:'water',power:'abyssal-maw',signature:'ABYSSAL MAW',cooldown:4.6,phaseStep:.4,warning:1.6},
 regent:{technique:'bait-capacitor',anatomy:'Gyroscopic armoured storm machine',inspiration:'gyroscope / storm cell',habitat:'air',power:'ion-sweep',signature:'ION SHEAR',cooldown:3.9,phaseStep:.35,warning:1.9},
 mother:{technique:'break-brood',anatomy:'Compound eyes, six legs, two wings and halteres',inspiration:'horsefly / parasitoid wasp',habitat:'air',power:'brood-tempest',signature:'BROOD TEMPEST',cooldown:5.1,phaseStep:.4,warning:1.85}
});
function bossEncounterProfile(l){return l.encounterProfile||BOSS_ENCOUNTERS[l.encounter||l.bossKind];}
// Shared tuning keeps future encounters within the same learnable combat rhythm.
const COMBAT_BALANCE=freezeContent({bossHealth:.9,salvoRest:1.25,specialRest:1.15,hitGrace:2.4,shieldGrace:1.5,breathTracking:.55,enemyWindup:.48,enemyShotClearance:180});
const WATER_HANDLING=freezeContent({pilotSpeed:.9,acceleration:.065,braking:.09,reversal:.05,touchBuffer:.04,enemyMotion:.78,bossMotion:.84});
const GAME_RULESET='2026-09-boss-techniques-v37';
const CAMPAIGN_ID='vanguard-main';
function validateLevels(definitions){
 const ids=new Set(),loot=new Set(['orb','speed','power','helix','wave','beam','missile','spread','companion','shield','frontShield','repair','nova','rescue']);
 const finite=n=>typeof n==='number'&&Number.isFinite(n);
 const ordered=a=>a.every((n,i)=>finite(n)&&n>=0&&(!i||n>a[i-1]));
 const fail=(l,message)=>{throw new Error('Invalid level '+(l?.id||'?')+': '+message)};
 if(!Array.isArray(definitions)||!definitions.length)throw new Error('Campaign needs at least one level');
 for(const l of definitions){
  if(typeof l.id!=='string'||!/^[a-z0-9-]+$/.test(l.id)||ids.has(l.id))fail(l,'unique stable id required');ids.add(l.id);
  if(!Number.isInteger(l.revision)||l.revision<1)fail(l,'positive revision required');
  if(!Object.prototype.hasOwnProperty.call(LEVEL_THEMES,l.theme)||!Object.prototype.hasOwnProperty.call(BOSS_KINDS,l.bossKind))fail(l,'unknown theme or boss behavior');
  if(![l.name,l.short,l.boss,l.color,l.fog,l.sky,l.planet].every(v=>typeof v==='string'&&v.length))fail(l,'missing presentation fields');
  if(!finite(l.duration)||l.duration<=0||!finite(l.hp)||l.hp<=0||!finite(l.bossRadius)||l.bossRadius<=0||!finite(l.difficulty)||l.difficulty<0||l.difficulty>5)fail(l,'invalid duration, health, radius or difficulty');
  if(!Number.isInteger(l.music)||l.music<0||l.music>5)fail(l,'unknown music profile');
  if(!Array.isArray(l.checkpoints)||l.checkpoints.length!==4||l.checkpoints[0]!==0||!ordered(l.checkpoints)||l.checkpoints[3]>=l.duration)fail(l,'four ordered checkpoints required');
  if(!Array.isArray(l.waves)||!ordered(l.waves)||l.waves.some(at=>at>=l.duration))fail(l,'invalid wave times');
  if(!Array.isArray(l.routes)||!l.routes.length||l.routes.some(y=>!finite(y)||y<70||y>690))fail(l,'invalid flight routes');
  if(!Array.isArray(l.roster)||!l.roster.length||l.roster.some(t=>!Number.isInteger(t)||t<0||t>3))fail(l,'invalid enemy roster');
  if(!Array.isArray(l.models)||l.models.length!==4||l.models.some(name=>!(name in meshes)))fail(l,'unknown enemy model');
  if(typeof alienBossDesigns!=='undefined'&&l.medium){const b=alienBossDesigns[BOSS_KINDS[l.bossKind]];if(b&&b.habitat!==l.medium)fail(l,'boss habitat mismatch');}
  if(typeof faunaCatalog!=='undefined'&&l.medium){for(const name of [...l.models,...(l.escortEncounter?[l.escortEncounter.model,l.escortEncounter.escort]:[])]){const f=faunaCatalog[name];if(f&&f.habitat!==l.medium)fail(l,'fauna habitat mismatch: '+name);}}
  if(l.escortEncounter&&(!(l.escortEncounter.model in meshes)||!(l.escortEncounter.escort in meshes)||l.escortEncounter.count<1||l.escortEncounter.count>6))fail(l,'invalid escort encounter');
  if(!Array.isArray(l.broodWaves)||l.broodWaves.some(i=>!Number.isInteger(i)||i<0||i>=l.waves.length))fail(l,'invalid brood wave index');
  if(!Array.isArray(l.supplies)||!Array.isArray(l.recovery)||l.recovery.length!==2)fail(l,'supply and recovery definitions required');
  for(const d of [...l.supplies,...l.recovery])if(!loot.has(d.type)||!finite(d.y)||d.y<42||d.y>718)fail(l,'invalid pickup');
  if(!ordered(l.supplies.map(d=>d.at))||l.supplies.some(d=>d.at>=l.duration))fail(l,'invalid supply times');
  if(l.recovery.some(d=>!finite(d.x)||d.x<270||d.x>900))fail(l,'recovery pickup out of reach');
  if(l.scrollAxis&&!['up','down'].includes(l.scrollAxis))fail(l,'invalid scroll axis');
  if(l.environment&&!ENVIRONMENTS[l.environment])fail(l,'unknown environment');
  if(l.gravityWell&&(!Array.isArray(l.gravityWell.center)||l.gravityWell.center.length!==2||l.gravityWell.center.some(n=>!Number.isFinite(n)||n<=0||n>=1)||!(l.gravityWell.radius>0&&l.gravityWell.radius<.2)||!(l.gravityWell.lensing>=0&&l.gravityWell.lensing<=2)||!(l.gravityWell.tidalPeriod>=8)))fail(l,'invalid gravitational view');
  if(l.flightRoute){const r=l.flightRoute;if(!finite(r.period)||r.period<10||!finite(r.drive)||r.drive<=0||!finite(r.speed)||r.speed<100||r.speed>500||!Array.isArray(r.points)||r.points.length<4||r.points.some(p=>!Array.isArray(p)||p.length!==2||p.some(v=>!finite(v))))fail(l,'invalid boss flight route');}
  if(l.bossPalette&&(!Array.isArray(l.bossPalette)||l.bossPalette.length!==3||l.bossPalette.some(v=>!finite(v)||v<.3||v>1.5)))fail(l,'invalid boss palette');
  const encounter=bossEncounterProfile(l);if(!bossTechnique(l))fail(l,'encounter needs a supported player technique');if(!encounter||encounter.habitat!==(l.medium||encounter.habitat))fail(l,'encounter habitat mismatch');
  if(!Object.values(BOSS_ENCOUNTERS).some(e=>e.power===encounter.power)||!finite(encounter.cooldown)||encounter.cooldown<3||!finite(encounter.warning)||encounter.warning<1||!finite(encounter.phaseStep))fail(l,'invalid encounter profile');
  if(l.atmosphere&&['heat','clouds'].some(k=>!finite(l.atmosphere[k])||l.atmosphere[k]<0||l.atmosphere[k]>1))fail(l,'atmosphere heat/clouds must be between 0 and 1');
  if(l.entrySides&&(!Array.isArray(l.entrySides)||!l.entrySides.length||l.entrySides.some(side=>!['right','left','top','bottom'].includes(side))))fail(l,'invalid entry side');
  if(l.challenge){const c=l.challenge;if(typeof c.title!=='string'||!finite(c.at)||!finite(c.end)||c.at<0||c.end<=c.at||c.end>=l.duration||!Array.isArray(c.waves)||!ordered(c.waves)||c.waves.some(t=>t<c.at||t>c.end)||!Array.isArray(c.types)||!c.types.length||c.types.some(t=>!Number.isInteger(t)||t<0||t>3)||!Number.isInteger(c.count)||c.count<1||c.count>6||!finite(c.speed)||c.speed<.5||c.speed>2)fail(l,'invalid mid-sector challenge');}
  if(l.pacing){const p=l.pacing;if(!finite(p.pickupGap)||p.pickupGap<1.5||p.pickupGap>5||!Number.isInteger(p.maxPickups)||p.maxPickups<1||p.maxPickups>2||!Number.isInteger(p.maxActiveEnemies)||p.maxActiveEnemies<5||p.maxActiveEnemies>18||!finite(p.pickupX)||p.pickupX<420||p.pickupX>900||typeof p.preBossRelief!=='boolean')fail(l,'invalid readability pacing');}
  if(!Array.isArray(l.obstacles)||!ordered(l.obstacles.map(o=>o.at)))fail(l,'invalid obstacle timing');
  if(l.enemyHealthScale!==undefined&&(!finite(l.enemyHealthScale)||l.enemyHealthScale<1||l.enemyHealthScale>2))fail(l,'invalid enemy health scale');
  if(l.bossArmor!==undefined&&(!finite(l.bossArmor)||l.bossArmor<1||l.bossArmor>2))fail(l,'boss armor must be between 1 and 2');
  if(l.siege!==undefined&&(typeof l.siege!=='boolean'||l.siege&&l.bossKind!=='cathedral'))fail(l,'capital siege requires a Cathedral hull');
  if(l.obstacleAttachment&&!['boundary','free'].includes(l.obstacleAttachment))fail(l,'unknown obstacle attachment');
  for(const o of l.obstacles){if(o.at>=l.duration||!Array.isArray(o.parts)||!o.parts.length||!finite(o.width)||o.width<=0)fail(l,'invalid obstacle');for(const p of o.parts){if(![p.x,p.y,p.w,p.h].every(finite)||p.x<0||p.y<0||p.w<=0||p.h<=0||p.y+p.h>760)fail(l,'invalid obstacle geometry');if(l.obstacleAttachment==='boundary'&&(typeof p.ceiling!=='boolean'||(p.ceiling?p.y!==0:p.y+p.h!==760)))fail(l,'obstacle must connect to the scenery boundary');}}
 }
 return definitions;
}
function freezeContent(value){if(value&&typeof value==='object'){Object.values(value).forEach(freezeContent);Object.freeze(value);}return value;}
const levelDefinitions=[
  {
    "name": "THE VERDANT REACH",
    "short": "VERDANT REACH",
    "color": "#83ffd6",
    "fog": "#123c45",
    "sky": "#06121e",
    "planet": "#20606a",
    "boss": "THE HIVE WARDEN",
    "hp": 1050,
    "bossArmor": 1,
    "id": "verdant-reach",
    "revision": 5,
    "theme": "verdant",
    "bossKind": "warden",
    "music": 0,
    "difficulty": 0,
    "duration": 56,
    "checkpoints": [
      0,
      14,
      28,
      42
    ],
    "bossRadius": 105,
    "roster": [
      1,
      1,
      3,
      1
    ],
    "models": [
      "fighter",
      "squid",
      "gunship",
      "octopus"
    ],
    "broodWaves": [
      4,
      9
    ],
    "routes": [
      190,
      390,
      560,
      280,
      470,
      150,
      610,
      350
    ],
    "waves": [
      1,
      4.775,
      8.455625000000001,
      12.044234375000002,
      15.543128515625002,
      18.954550302734376,
      22.280686545166017,
      25.523669381536866,
      28.685577646998443,
      31.768438205823482,
      34.774227250677896,
      37.70487156941095,
      40.56224978017568,
      43.348193535671285,
      46.0644886972795,
      48.712876479847516,
      51.29505456785133
    ],
    "obstacles": [
      {
        "at": 6,
        "gap": 380,
        "open": 330,
        "parts": [
          {
            "x": 0,
            "y": 550,
            "w": 190,
            "h": 210,
            "ceiling": false
          },
          {
            "x": 150,
            "y": 440,
            "w": 120,
            "h": 320,
            "ceiling": false
          },
          {
            "x": 270,
            "y": 600,
            "w": 150,
            "h": 160,
            "ceiling": false
          }
        ],
        "width": 420
      },
      {
        "at": 16,
        "gap": 245,
        "open": 300,
        "parts": [
          {
            "x": 0,
            "y": 0,
            "w": 260,
            "h": 180,
            "ceiling": true
          },
          {
            "x": 175,
            "y": 140,
            "w": 100,
            "h": 150,
            "ceiling": true
          }
        ],
        "width": 275
      },
      {
        "at": 27,
        "gap": 500,
        "open": 300,
        "parts": [
          {
            "x": 0,
            "y": 610,
            "w": 125,
            "h": 150,
            "ceiling": false
          },
          {
            "x": 110,
            "y": 520,
            "w": 240,
            "h": 240,
            "ceiling": false
          },
          {
            "x": 260,
            "y": 0,
            "w": 130,
            "h": 170,
            "ceiling": true
          }
        ],
        "width": 390
      },
      {
        "at": 38,
        "gap": 345,
        "open": 280,
        "parts": [
          {
            "x": 0,
            "y": 0,
            "w": 130,
            "h": 240,
            "ceiling": true
          },
          {
            "x": 110,
            "y": 0,
            "w": 230,
            "h": 130,
            "ceiling": true
          },
          {
            "x": 220,
            "y": 530,
            "w": 170,
            "h": 230,
            "ceiling": false
          }
        ],
        "width": 390
      }
    ],
    "supplies": [
      {
        "at": 3,
        "type": "speed",
        "y": 350
      },
      {
        "at": 6.25,
        "type": "frontShield",
        "y": 380
      },
      {
        "at": 9.5,
        "type": "helix",
        "y": 250
      },
      {
        "at": 11,
        "type": "orb",
        "y": 380
      },
      {
        "at": 16,
        "type": "companion",
        "y": 480
      },
      {
        "at": 22.5,
        "type": "power",
        "y": 370
      },
      {
        "at": 29,
        "type": "shield",
        "y": 230
      },
      {
        "at": 35.5,
        "type": "wave",
        "y": 460
      },
      {
        "at": 42,
        "type": "repair",
        "y": 330
      },
      {
        "at": 48.5,
        "type": "nova",
        "y": 380
      }
    ],
    "recovery": [
      {
        "type": "power",
        "x": 410,
        "y": 340
      },
      {
        "type": "shield",
        "x": 550,
        "y": 410
      }
    ],
    "challenge": {
      "title": "HIVE AMBUSH",
      "at": 24,
      "end": 36,
      "waves": [
        25,
        27,
        29
      ],
      "types": [
        1,
        3
      ],
      "count": 3,
      "speed": 1.18,
      "gate": false
    }
  },
  {
    "name": "THE EMBER FORGE",
    "short": "EMBER FORGE",
    "color": "#ffbc78",
    "fog": "#542338",
    "sky": "#180b21",
    "planet": "#9e463a",
    "boss": "IRON CATHEDRAL",
    "hp": 1550,
    "bossArmor": 1.03,
    "id": "ember-forge",
    "revision": 3,
    "theme": "forge",
    "bossKind": "cathedral",
    "music": 1,
    "difficulty": 1,
    "duration": 56,
    "checkpoints": [
      0,
      14,
      28,
      42
    ],
    "bossRadius": 142,
    "roster": [
      0,
      2,
      0,
      2
    ],
    "models": [
      "forgeInterceptor",
      "squid",
      "forgeBarge",
      "octopus"
    ],
    "broodWaves": [],
    "routes": [
      190,
      390,
      560,
      280,
      470,
      150,
      610,
      350
    ],
    "waves": [
      1,
      4.425,
      7.764374999999999,
      11.020265624999999,
      14.194758984375,
      17.289890009765625,
      20.307642759521485,
      23.249951690533447,
      26.11870289827011,
      28.91573532581336,
      31.642841942668024,
      34.301770894101324,
      36.89422662174879,
      39.42187095620507,
      41.886324182299944,
      44.28916607774244,
      46.63193692579888,
      48.91613850265391,
      51.14323504008756
    ],
    "obstacles": [
      {
        "at": 5,
        "gap": 270,
        "open": 300,
        "parts": [
          {
            "x": 0,
            "y": 0,
            "w": 310,
            "h": 140,
            "ceiling": true
          },
          {
            "x": 55,
            "y": 115,
            "w": 110,
            "h": 180,
            "ceiling": true
          }
        ],
        "width": 310
      },
      {
        "at": 14,
        "gap": 490,
        "open": 280,
        "parts": [
          {
            "x": 0,
            "y": 575,
            "w": 310,
            "h": 185,
            "ceiling": false
          },
          {
            "x": 110,
            "y": 460,
            "w": 110,
            "h": 115,
            "ceiling": false
          }
        ],
        "width": 310
      },
      {
        "at": 25,
        "gap": 300,
        "open": 260,
        "parts": [
          {
            "x": 0,
            "y": 0,
            "w": 140,
            "h": 230,
            "ceiling": true
          },
          {
            "x": 110,
            "y": 0,
            "w": 240,
            "h": 110,
            "ceiling": true
          },
          {
            "x": 260,
            "y": 535,
            "w": 130,
            "h": 225,
            "ceiling": false
          }
        ],
        "width": 390
      },
      {
        "at": 36,
        "gap": 470,
        "open": 260,
        "parts": [
          {
            "x": 0,
            "y": 590,
            "w": 160,
            "h": 170,
            "ceiling": false
          },
          {
            "x": 140,
            "y": 510,
            "w": 180,
            "h": 250,
            "ceiling": false
          },
          {
            "x": 300,
            "y": 0,
            "w": 110,
            "h": 240,
            "ceiling": true
          }
        ],
        "width": 410
      }
    ],
    "supplies": [
      {
        "at": 3,
        "type": "speed",
        "y": 250
      },
      {
        "at": 6.25,
        "type": "frontShield",
        "y": 380
      },
      {
        "at": 9.5,
        "type": "missile",
        "y": 480
      },
      {
        "at": 11,
        "type": "orb",
        "y": 380
      },
      {
        "at": 16,
        "type": "power",
        "y": 370
      },
      {
        "at": 22.5,
        "type": "companion",
        "y": 230
      },
      {
        "at": 29,
        "type": "repair",
        "y": 460
      },
      {
        "at": 35.5,
        "type": "beam",
        "y": 330
      },
      {
        "at": 42,
        "type": "shield",
        "y": 380
      },
      {
        "at": 48.5,
        "type": "nova",
        "y": 350
      }
    ],
    "recovery": [
      {
        "type": "power",
        "x": 410,
        "y": 340
      },
      {
        "type": "shield",
        "x": 550,
        "y": 410
      }
    ],
    "challenge": {
      "title": "FOUNDRY KILL CORRIDOR",
      "at": 24,
      "end": 36,
      "waves": [
        25,
        27,
        29
      ],
      "types": [
        0,
        2
      ],
      "count": 3,
      "speed": 1.18,
      "gate": true
    }
  },
  {
    "name": "THE PALE ABYSS",
    "short": "PALE ABYSS",
    "color": "#a9acff",
    "fog": "#262450",
    "sky": "#080c25",
    "planet": "#554a9b",
    "boss": "THE VOID SOVEREIGN",
    "hp": 2050,
    "bossArmor": 1.08,
    "id": "pale-abyss",
    "revision": 5,
    "theme": "abyss",
    "bossKind": "sovereign",
    "music": 2,
    "difficulty": 2,
    "duration": 56,
    "checkpoints": [
      0,
      14,
      28,
      42
    ],
    "bossRadius": 118,
    "roster": [
      3,
      1,
      3,
      3
    ],
    "models": [
      "riftSkimmer",
      "abyssRay",
      "riftBastion",
      "lanternScarab"
    ],
    "broodWaves": [],
    "routes": [
      190,
      390,
      560,
      280,
      470,
      150,
      610,
      350
    ],
    "waves": [
      1,
      4.074999999999999,
      7.073124999999999,
      9.996296874999999,
      12.846389453125,
      15.625229716796873,
      18.33459897387695,
      20.976233999530027,
      23.551828149541777,
      26.06303244580323,
      28.51145663465815,
      30.898670218791693,
      33.2262034633219,
      35.49554837673885,
      37.70815966732038,
      39.86545567563737,
      41.968819283746434,
      44.019598801652776,
      46.019108831611454,
      47.96863111082117,
      49.86941533305064,
      51.72267994972437
    ],
    "obstacles": [
      {
        "at": 4,
        "gap": 440,
        "open": 280,
        "parts": [
          {
            "x": 0,
            "y": 590,
            "w": 110,
            "h": 170,
            "ceiling": false
          },
          {
            "x": 85,
            "y": 475,
            "w": 105,
            "h": 285,
            "ceiling": false
          },
          {
            "x": 170,
            "y": 555,
            "w": 130,
            "h": 205,
            "ceiling": false
          }
        ],
        "width": 300
      },
      {
        "at": 14,
        "gap": 260,
        "open": 270,
        "parts": [
          {
            "x": 0,
            "y": 0,
            "w": 100,
            "h": 150,
            "ceiling": true
          },
          {
            "x": 80,
            "y": 0,
            "w": 120,
            "h": 280,
            "ceiling": true
          },
          {
            "x": 180,
            "y": 0,
            "w": 130,
            "h": 190,
            "ceiling": true
          }
        ],
        "width": 310
      },
      {
        "at": 24,
        "gap": 500,
        "open": 260,
        "parts": [
          {
            "x": 0,
            "y": 0,
            "w": 150,
            "h": 175,
            "ceiling": true
          },
          {
            "x": 160,
            "y": 570,
            "w": 130,
            "h": 190,
            "ceiling": false
          },
          {
            "x": 270,
            "y": 485,
            "w": 100,
            "h": 275,
            "ceiling": false
          }
        ],
        "width": 370
      },
      {
        "at": 35,
        "gap": 310,
        "open": 250,
        "parts": [
          {
            "x": 0,
            "y": 560,
            "w": 125,
            "h": 200,
            "ceiling": false
          },
          {
            "x": 105,
            "y": 625,
            "w": 190,
            "h": 135,
            "ceiling": false
          },
          {
            "x": 220,
            "y": 0,
            "w": 140,
            "h": 265,
            "ceiling": true
          }
        ],
        "width": 360
      }
    ],
    "supplies": [
      {
        "at": 3,
        "type": "speed",
        "y": 480
      },
      {
        "at": 6.25,
        "type": "frontShield",
        "y": 380
      },
      {
        "at": 9.5,
        "type": "wave",
        "y": 370
      },
      {
        "at": 11,
        "type": "orb",
        "y": 380
      },
      {
        "at": 16,
        "type": "companion",
        "y": 230
      },
      {
        "at": 22.5,
        "type": "power",
        "y": 460
      },
      {
        "at": 29,
        "type": "shield",
        "y": 330
      },
      {
        "at": 35.5,
        "type": "helix",
        "y": 380
      },
      {
        "at": 42,
        "type": "repair",
        "y": 350
      },
      {
        "at": 48.5,
        "type": "nova",
        "y": 250
      }
    ],
    "recovery": [
      {
        "type": "power",
        "x": 410,
        "y": 340
      },
      {
        "type": "shield",
        "x": 550,
        "y": 410
      }
    ],
    "challenge": {
      "title": "ABYSS WINGSTORM",
      "at": 24,
      "end": 36,
      "waves": [
        24.5,
        26.5,
        28.5,
        30.5
      ],
      "types": [
        1,
        3
      ],
      "count": 3,
      "speed": 1.18,
      "gate": false
    },
    "entrySides": [
      "right",
      "right",
      "left",
      "right",
      "right",
      "top"
    ]
  },
  {
    "name": "THE LUMEN REEF",
    "short": "LUMEN REEF",
    "color": "#80e8ed",
    "fog": "#123c48",
    "sky": "#03131e",
    "planet": "#80e8ed",
    "boss": "THE TIDAL MONARCH",
    "hp": 2550,
    "bossArmor": 1.13,
    "id": "lumen-reef",
    "revision": 1,
    "theme": "reef",
    "scrollAxis": "down",
    "bossKind": "monarch",
    "music": 3,
    "difficulty": 3,
    "duration": 64,
    "checkpoints": [
      0,
      16,
      32,
      48
    ],
    "bossRadius": 122,
    "roster": [
      1,
      3,
      1,
      1
    ],
    "models": [
      "reefCrab",
      "reefGlider",
      "reefCrab",
      "reefCrab"
    ],
    "broodWaves": [],
    "routes": [
      220,
      480,
      340,
      560,
      270,
      420,
      180,
      510
    ],
    "waves": [
      1.0,
      3.65,
      6.3,
      8.95,
      11.6,
      14.25,
      16.9,
      19.55,
      22.2,
      24.85,
      27.5,
      30.15,
      32.8,
      35.45,
      38.1,
      40.75,
      43.4,
      46.05,
      48.7,
      51.35,
      54.0,
      56.65,
      59.3
    ],
    "obstacles": [
      {
        "at": 6,
        "gap": 380,
        "open": 300,
        "width": 330,
        "parts": [
          {
            "x": 0,
            "y": 525,
            "w": 120,
            "h": 235,
            "ceiling": false
          },
          {
            "x": 105,
            "y": 595,
            "w": 120,
            "h": 165,
            "ceiling": false
          },
          {
            "x": 210,
            "y": 630,
            "w": 120,
            "h": 130,
            "ceiling": false
          }
        ]
      },
      {
        "at": 18,
        "gap": 380,
        "open": 300,
        "width": 330,
        "parts": [
          {
            "x": 0,
            "y": 0,
            "w": 120,
            "h": 255,
            "ceiling": true
          },
          {
            "x": 105,
            "y": 0,
            "w": 120,
            "h": 185,
            "ceiling": true
          },
          {
            "x": 210,
            "y": 0,
            "w": 120,
            "h": 150,
            "ceiling": true
          }
        ]
      },
      {
        "at": 38,
        "gap": 380,
        "open": 300,
        "width": 330,
        "parts": [
          {
            "x": 0,
            "y": 485,
            "w": 120,
            "h": 275,
            "ceiling": false
          },
          {
            "x": 105,
            "y": 555,
            "w": 120,
            "h": 205,
            "ceiling": false
          },
          {
            "x": 210,
            "y": 590,
            "w": 120,
            "h": 170,
            "ceiling": false
          }
        ]
      },
      {
        "at": 50,
        "gap": 380,
        "open": 300,
        "width": 330,
        "parts": [
          {
            "x": 0,
            "y": 0,
            "w": 120,
            "h": 235,
            "ceiling": true
          },
          {
            "x": 105,
            "y": 0,
            "w": 120,
            "h": 165,
            "ceiling": true
          },
          {
            "x": 210,
            "y": 0,
            "w": 120,
            "h": 130,
            "ceiling": true
          }
        ]
      }
    ],
    "supplies": [
      {
        "at": 3,
        "type": "orb",
        "y": 380
      },
      {
        "at": 7,
        "type": "speed",
        "y": 340
      },
      {
        "at": 12,
        "type": "wave",
        "y": 400
      },
      {
        "at": 20,
        "type": "shield",
        "y": 330
      },
      {
        "at": 26,
        "type": "power",
        "y": 370
      },
      {
        "at": 35,
        "type": "frontShield",
        "y": 380
      },
      {
        "at": 44,
        "type": "repair",
        "y": 360
      },
      {
        "at": 51,
        "type": "companion",
        "y": 380
      },
      {
        "at": 57,
        "type": "nova",
        "y": 400
      }
    ],
    "recovery": [
      {
        "type": "power",
        "x": 410,
        "y": 340
      },
      {
        "type": "shield",
        "x": 550,
        "y": 410
      }
    ],
    "challenge": {
      "title": "TIDAL NARROWS",
      "at": 27,
      "end": 40,
      "waves": [
        28,
        31,
        34,
        37
      ],
      "types": [
        1,
        3
      ],
      "count": 3,
      "speed": 1.12,
      "gate": false
    },
    "background": "reef",
    "entrySides": [
      "right",
      "right",
      "top",
      "right",
      "left",
      "right",
      "bottom",
      "right"
    ]
  },
  {
    "name": "THE TEMPEST CITADEL",
    "short": "TEMPEST CITADEL",
    "color": "#d0b7ff",
    "fog": "#343056",
    "sky": "#0c1022",
    "planet": "#d0b7ff",
    "boss": "THE STORM REGENT",
    "hp": 3100,
    "bossArmor": 1.18,
    "id": "tempest-citadel",
    "revision": 1,
    "theme": "storm",
    "scrollAxis": "up",
    "bossKind": "regent",
    "music": 4,
    "difficulty": 4,
    "duration": 64,
    "checkpoints": [
      0,
      16,
      32,
      48
    ],
    "bossRadius": 145,
    "roster": [
      0,
      2,
      0,
      0
    ],
    "models": [
      "stormRaptor",
      "coreMoth",
      "stormCarrier",
      "corePolyp"
    ],
    "broodWaves": [],
    "routes": [
      220,
      480,
      340,
      560,
      270,
      420,
      180,
      510
    ],
    "waves": [
      1.0,
      3.48,
      5.96,
      8.44,
      10.92,
      13.4,
      15.88,
      18.36,
      20.84,
      23.32,
      25.8,
      28.28,
      30.76,
      33.24,
      35.72,
      38.2,
      40.68,
      43.16,
      45.64,
      48.12,
      50.6,
      53.08,
      55.56,
      58.04,
      60.52
    ],
    "obstacles": [
      {
        "at": 6,
        "gap": 380,
        "open": 300,
        "width": 330,
        "parts": [
          {
            "x": 0,
            "y": 590,
            "w": 120,
            "h": 170,
            "ceiling": false
          },
          {
            "x": 105,
            "y": 500,
            "w": 120,
            "h": 260,
            "ceiling": false
          },
          {
            "x": 210,
            "y": 605,
            "w": 120,
            "h": 155,
            "ceiling": false
          }
        ]
      },
      {
        "at": 18,
        "gap": 380,
        "open": 300,
        "width": 330,
        "parts": [
          {
            "x": 0,
            "y": 0,
            "w": 120,
            "h": 190,
            "ceiling": true
          },
          {
            "x": 105,
            "y": 0,
            "w": 120,
            "h": 280,
            "ceiling": true
          },
          {
            "x": 210,
            "y": 0,
            "w": 120,
            "h": 175,
            "ceiling": true
          }
        ]
      },
      {
        "at": 38,
        "gap": 380,
        "open": 300,
        "width": 330,
        "parts": [
          {
            "x": 0,
            "y": 550,
            "w": 120,
            "h": 210,
            "ceiling": false
          },
          {
            "x": 105,
            "y": 460,
            "w": 120,
            "h": 300,
            "ceiling": false
          },
          {
            "x": 210,
            "y": 565,
            "w": 120,
            "h": 195,
            "ceiling": false
          }
        ]
      },
      {
        "at": 50,
        "gap": 380,
        "open": 300,
        "width": 330,
        "parts": [
          {
            "x": 0,
            "y": 0,
            "w": 120,
            "h": 170,
            "ceiling": true
          },
          {
            "x": 105,
            "y": 0,
            "w": 120,
            "h": 260,
            "ceiling": true
          },
          {
            "x": 210,
            "y": 0,
            "w": 120,
            "h": 155,
            "ceiling": true
          }
        ]
      }
    ],
    "supplies": [
      {
        "at": 3,
        "type": "orb",
        "y": 380
      },
      {
        "at": 7,
        "type": "speed",
        "y": 340
      },
      {
        "at": 12,
        "type": "beam",
        "y": 400
      },
      {
        "at": 20,
        "type": "shield",
        "y": 330
      },
      {
        "at": 26,
        "type": "power",
        "y": 370
      },
      {
        "at": 35,
        "type": "frontShield",
        "y": 380
      },
      {
        "at": 44,
        "type": "repair",
        "y": 360
      },
      {
        "at": 51,
        "type": "companion",
        "y": 380
      },
      {
        "at": 57,
        "type": "nova",
        "y": 400
      }
    ],
    "recovery": [
      {
        "type": "power",
        "x": 410,
        "y": 340
      },
      {
        "type": "shield",
        "x": 550,
        "y": 410
      }
    ],
    "challenge": {
      "title": "TURBINE CROSSCURRENT",
      "at": 27,
      "end": 40,
      "waves": [
        28,
        31,
        34,
        37
      ],
      "types": [
        0,
        2
      ],
      "count": 3,
      "speed": 1.12,
      "gate": true
    },
    "background": "storm",
    "entrySides": [
      "right",
      "right",
      "top",
      "right",
      "left",
      "right",
      "bottom",
      "right"
    ]
  },
  {
    "name": "THE CRIMSON HEART",
    "short": "CRIMSON HEART",
    "color": "#ffaaa9",
    "fog": "#4c1831",
    "sky": "#180812",
    "planet": "#ffaaa9",
    "boss": "VESPER · THE BROOD QUEEN",
    "hp": 3750,
    "bossArmor": 1.23,
    "id": "crimson-heart",
    "revision": 1,
    "theme": "core",
    "bossKind": "mother",
    "music": 5,
    "difficulty": 5,
    "duration": 64,
    "checkpoints": [
      0,
      16,
      32,
      48
    ],
    "bossRadius": 160,
    "roster": [
      1,
      3,
      1,
      3
    ],
    "models": [
      "stormRaptor",
      "coreMoth",
      "stormCarrier",
      "corePolyp"
    ],
    "broodWaves": [
      8,
      17
    ],
    "routes": [
      220,
      480,
      340,
      560,
      270,
      420,
      180,
      510
    ],
    "waves": [
      1.0,
      3.31,
      5.62,
      7.93,
      10.24,
      12.55,
      14.86,
      17.17,
      19.48,
      21.79,
      24.1,
      26.41,
      28.72,
      31.03,
      33.34,
      35.65,
      37.96,
      40.27,
      42.58,
      44.89,
      47.2,
      49.51,
      51.82,
      54.13,
      56.44,
      58.75
    ],
    "obstacles": [
      {
        "at": 6,
        "gap": 380,
        "open": 300,
        "width": 330,
        "parts": [
          {
            "x": 0,
            "y": 555,
            "w": 120,
            "h": 205,
            "ceiling": false
          },
          {
            "x": 105,
            "y": 615,
            "w": 120,
            "h": 145,
            "ceiling": false
          },
          {
            "x": 210,
            "y": 520,
            "w": 120,
            "h": 240,
            "ceiling": false
          }
        ]
      },
      {
        "at": 18,
        "gap": 380,
        "open": 300,
        "width": 330,
        "parts": [
          {
            "x": 0,
            "y": 0,
            "w": 120,
            "h": 225,
            "ceiling": true
          },
          {
            "x": 105,
            "y": 0,
            "w": 120,
            "h": 165,
            "ceiling": true
          },
          {
            "x": 210,
            "y": 0,
            "w": 120,
            "h": 260,
            "ceiling": true
          }
        ]
      },
      {
        "at": 38,
        "gap": 380,
        "open": 300,
        "width": 330,
        "parts": [
          {
            "x": 0,
            "y": 515,
            "w": 120,
            "h": 245,
            "ceiling": false
          },
          {
            "x": 105,
            "y": 575,
            "w": 120,
            "h": 185,
            "ceiling": false
          },
          {
            "x": 210,
            "y": 480,
            "w": 120,
            "h": 280,
            "ceiling": false
          }
        ]
      },
      {
        "at": 50,
        "gap": 380,
        "open": 300,
        "width": 330,
        "parts": [
          {
            "x": 0,
            "y": 0,
            "w": 120,
            "h": 205,
            "ceiling": true
          },
          {
            "x": 105,
            "y": 0,
            "w": 120,
            "h": 145,
            "ceiling": true
          },
          {
            "x": 210,
            "y": 0,
            "w": 120,
            "h": 240,
            "ceiling": true
          }
        ]
      }
    ],
    "supplies": [
      {
        "at": 3,
        "type": "orb",
        "y": 380
      },
      {
        "at": 7,
        "type": "speed",
        "y": 340
      },
      {
        "at": 12,
        "type": "helix",
        "y": 400
      },
      {
        "at": 20,
        "type": "shield",
        "y": 330
      },
      {
        "at": 26,
        "type": "power",
        "y": 370
      },
      {
        "at": 35,
        "type": "frontShield",
        "y": 380
      },
      {
        "at": 44,
        "type": "repair",
        "y": 360
      },
      {
        "at": 51,
        "type": "companion",
        "y": 380
      },
      {
        "at": 57,
        "type": "nova",
        "y": 400
      }
    ],
    "recovery": [
      {
        "type": "power",
        "x": 410,
        "y": 340
      },
      {
        "type": "shield",
        "x": 550,
        "y": 410
      }
    ],
    "challenge": {
      "title": "THE LIVING THROAT",
      "at": 27,
      "end": 40,
      "waves": [
        28,
        31,
        34,
        37
      ],
      "types": [
        1,
        3
      ],
      "count": 3,
      "speed": 1.12,
      "gate": false
    },
    "entrySides": [
      "right",
      "right",
      "top",
      "right",
      "left",
      "right",
      "bottom",
      "right"
    ],
    "background": "core"
  }
];
// The industrial sector ends in a fly-around, sectional dreadnought encounter.
levelDefinitions[1].siege=true;
levelDefinitions[1].boss='IRON CATHEDRAL · DREADNOUGHT';
for(const l of levelDefinitions)l.revision++;
const dreamBiomes=[['THE LUMINOUS REACH','LUMINOUS REACH'],['THE SLEEPING ENGINE','SLEEPING ENGINE'],['THE GLASS UNDERTOW','GLASS UNDERTOW'],['THE SINGING REEF','SINGING REEF'],['THE VIOLET TEMPEST','VIOLET TEMPEST'],['THE DREAMING HEART','DREAMING HEART']];
levelDefinitions.forEach((l,i)=>{if(dreamBiomes[i]){[l.name,l.short]=dreamBiomes[i];l.revision++;}});
// Only the open-sky first sector contains free-floating asteroid formations.
// The other biomes are passages through scenery: every root continues into
// the floor/ceiling (or the side walls after vertical-scroll transformation).
levelDefinitions.forEach((l,i)=>{
 l.revision++; // Authored boss flight routes changed for every encounter.
 l.obstacleAttachment=i===0?'free':'boundary';
 if(i===0&&l.obstacles[1]){const o=l.obstacles[1];o.parts=[{x:0,y:300,w:180,h:160,ceiling:false}];o.width=180;}
 if(i>0){for(const o of l.obstacles)for(const p of o.parts){if(p.ceiling){p.h+=p.y;p.y=0;}else p.h=760-p.y;}l.revision++;}
});
// Later biomes begin at their established cadence, then tighten gradually after
// the first checkpoint. These fixed schedules stay identical on every attempt.
for(const l of levelDefinitions.slice(3,6)){
 const interval=l.waves[1]-l.waves[0],waves=[];
 for(let at=l.waves[0];at<l.duration-3;){waves.push(Number(at.toFixed(3)));const progress=Math.max(0,(at-l.checkpoints[1])/(l.duration-l.checkpoints[1]));at+=interval*(1-.18*Math.min(1,progress));}
 l.waves=waves;l.revision++;
}
// The second sector expects carried upgrades, while remaining recoverable at MK I.
{const l=levelDefinitions[1];l.hp=2350;l.bossArmor=1.2;l.enemyHealthScale=1.22;l.revision++;
 const waves=[];for(let at=1;at<l.duration-3;at+=2.65*(1-.18*at/l.duration))waves.push(Number(at.toFixed(3)));l.waves=waves;}
// Chapter one is one continuous journey inward, not six unrelated worlds.
const descentLayers=[
 ['HIGH ATMOSPHERE','Cloud sea · first contact',80000],
 ['CRUSTAL GATE','Abandoned descent engine',0],
 ['SUBSURFACE OCEAN','Glass trenches · bioluminescent predators',-4000],
 ['LIVING MANTLE','Fungal reefs · symbiotic machines',-18000],
 ['ION CAVERNS','Buried electrical storms · sentinel foundries',-45000],
 ['INNER SANCTUM','The dreaming brood beneath the crust',-80000]
];
levelDefinitions.forEach((l,i)=>{l.stratum=descentLayers[i][0];l.expeditionNote=descentLayers[i][1];l.elevation=descentLayers[i][2];l.chapter=1;l.revision++;});
const escortEncounters=[null,
 {name:'FURNACE MANTIS',model:'furnaceMantis',escort:'emberMite',organic:true,rig:'appendages',count:4,orbit:2.8,formation:'screen',pace:1.12},
 {name:'ABYSS SHEPHERD',model:'abyssShepherd',escort:'lanternScarab',organic:true,count:4,orbit:2.3,formation:'figure8',pace:1.08},
 {name:'REEF HERALD',model:'reefHerald',escort:'reefGlider',organic:true,count:3,orbit:2.6,formation:'petals',pace:1.16},
 {name:'STORM CONDUCTOR',model:'stormConductor',escort:'stormRaptor',organic:false,count:4,orbit:3.1,formation:'screen',pace:1.20},
 {name:'CORE HARVESTER',model:'coreHarvester',escort:'coreMoth',organic:true,count:4,orbit:2.8,formation:'figure8',pace:1.24}
];
levelDefinitions.forEach((l,i)=>{if(i){l.escortEncounter=escortEncounters[i];l.broodWaves=[5,Math.min(l.waves.length-2,13)];l.revision++;}});
// Habitats constrain fauna as the campaign grows: swimming anatomy stays underwater.
levelDefinitions.forEach((l,i)=>{l.medium=[2,3].includes(i)?'water':'air';l.revision++;});
levelDefinitions.forEach((l,i)=>{
 l.environment=['high-atmosphere','underground','undersea','deep-undersea','underground','deep-underground'][i];
 const e=ENVIRONMENTS[l.environment];l.atmosphere={heat:i===4?0:e.heat,clouds:i===4?.35:e.clouds,water:e.water};
 l.encounter=l.bossKind;l.revision++;
});
levelDefinitions[3].stratum='SUBMERGED REEF';
levelDefinitions[3].expeditionNote='Flooded fungal reefs · symbiotic machines';
levelDefinitions[4].models[1]='stormMoth';levelDefinitions[4].models[3]='stormPolyp';
// Readability is authored alongside each biome. Future levels inherit these
// constraints: one meaningful pickup on screen, bounded active formations and
// a low-hull recovery beat before the boss rather than a surprise attrition wall.
const readabilityPacing=[
 {pickupGap:2.7,maxPickups:1,maxActiveEnemies:8,pickupX:610,preBossRelief:true},
 {pickupGap:2.5,maxPickups:1,maxActiveEnemies:10,pickupX:650,preBossRelief:true},
 {pickupGap:2.35,maxPickups:1,maxActiveEnemies:11,pickupX:670,preBossRelief:true},
 {pickupGap:2.25,maxPickups:1,maxActiveEnemies:12,pickupX:680,preBossRelief:true},
 {pickupGap:2.15,maxPickups:1,maxActiveEnemies:13,pickupX:690,preBossRelief:true},
 {pickupGap:2.05,maxPickups:1,maxActiveEnemies:14,pickupX:700,preBossRelief:true}
];
levelDefinitions.forEach((l,i)=>{l.pacing=readabilityPacing[i];l.revision++;});
// The opening teaches route choice first, then the ambush. It no longer stacks
// three dense bonus waves on top of the player's first weapon decisions.
levelDefinitions[0].challenge.waves=[25,29,33];
levelDefinitions[0].challenge.count=2;
levelDefinitions[0].revision++;
// Shorter endurance fights; attack identities and escalating phases stay authored.
levelDefinitions.forEach(l=>{
 l.hp=Math.round(l.hp*COMBAT_BALANCE.bossHealth);
 // A learnable survival reward early in section two, with one reserve at a time.
 let at=l.checkpoints[1]+.5;while(l.supplies.some(d=>Math.abs(d.at-at)<.01))at+=.25;
 l.supplies.push({at,type:'rescue',y:380});l.supplies.sort((a,b)=>a.at-b.at);l.revision++;
});
// A release adds a solar system. Each destination contributes an ordered
// descent (planet) or a flight through the corona (star). Only authored stages
// are published; a catalog entry never silently fabricates playable content.
const GALAXIES=freezeContent({
 'the-eventide-core':{id:'the-eventide-core',name:'THE EVENTIDE CORE',arms:3,twist:3.8,tint:[205,141,100],seed:617,centralBlackHole:true},
 'the-pale-spiral':{id:'the-pale-spiral',name:'THE PALE SPIRAL',arms:4,twist:2.8,tint:[129,193,226],seed:17},
 'the-ember-veil':{id:'the-ember-veil',name:'THE EMBER VEIL',arms:2,twist:4.2,tint:[230,155,177],seed:53},
 'the-azure-drift':{id:'the-azure-drift',name:'THE AZURE DRIFT',arms:3,twist:3.4,tint:[115,166,229],seed:79},
 'the-copper-sea':{id:'the-copper-sea',name:'THE COPPER SEA',arms:4,twist:2.5,tint:[220,159,114],seed:107},
 'the-silent-arc':{id:'the-silent-arc',name:'THE SILENT ARC',arms:2,twist:4.8,tint:[144,207,197],seed:139},
 'the-violet-wake':{id:'the-violet-wake',name:'THE VIOLET WAKE',arms:5,twist:2.3,tint:[191,145,223],seed:173},
 'the-golden-rift':{id:'the-golden-rift',name:'THE GOLDEN RIFT',arms:3,twist:3.8,tint:[240,197,118],seed:211},
 'the-glass-spiral':{id:'the-glass-spiral',name:'THE GLASS SPIRAL',arms:4,twist:3.1,tint:[165,215,233],seed:251},
 'the-scarlet-reach':{id:'the-scarlet-reach',name:'THE SCARLET REACH',arms:2,twist:4.1,tint:[224,131,142],seed:293},
 'the-last-lantern':{id:'the-last-lantern',name:'THE LAST LANTERN',arms:5,twist:2.9,tint:[193,191,225],seed:337},
 'the-indigo-tide':{id:'the-indigo-tide',name:'THE INDIGO TIDE',arms:3,twist:3.4,tint:[145,176,226],seed:181},
 'the-rose-expanse':{id:'the-rose-expanse',name:'THE ROSE EXPANSE',arms:2,twist:3.4,tint:[223,162,175],seed:223},
 'the-iron-nebula':{id:'the-iron-nebula',name:'THE IRON NEBULA',arms:4,twist:3.4,tint:[193,178,149],seed:269},
 'the-pearl-river':{id:'the-pearl-river',name:'THE PEARL RIVER',arms:3,twist:3.4,tint:[181,210,229],seed:307},
 'the-auburn-veil':{id:'the-auburn-veil',name:'THE AUBURN VEIL',arms:5,twist:3.4,tint:[217,156,119],seed:349},
 'the-silver-reach':{id:'the-silver-reach',name:'THE SILVER REACH',arms:2,twist:3.4,tint:[145,176,226],seed:389},
 'the-ochre-spiral':{id:'the-ochre-spiral',name:'THE OCHRE SPIRAL',arms:4,twist:3.4,tint:[223,162,175],seed:431},
 'the-celadon-drift':{id:'the-celadon-drift',name:'THE CELADON DRIFT',arms:3,twist:3.4,tint:[193,178,149],seed:479},
 'the-obsidian-crown':{id:'the-obsidian-crown',name:'THE OBSIDIAN CROWN',arms:2,twist:3.4,tint:[181,210,229],seed:523},
 'the-distant-bloom':{id:'the-distant-bloom',name:'THE DISTANT BLOOM',arms:5,twist:3.4,tint:[217,156,119],seed:569}
});
const GALAXY=GALAXIES['the-pale-spiral'];
const PLANET_SURFACE_DISKS=freezeContent({...Object.fromEntries(['caelus','ferrum','nacre','thalassa','veyra','cinder','nivara'].map(id=>[id,'planet-'+id+'-v2.webp'])),...Object.fromEntries(['basalt-rifts','magma-archipelago','sulfur-calderas','cobalt-storms'].map(id=>[id,'planet-'+id+'-v1.webp']))});
const PLANET_SURFACE_FAMILIES=freezeContent({
 hot:['basalt-rifts','magma-archipelago','sulfur-calderas','ferrum','cinder'],
 temperate:['caelus','thalassa'],ice:['nacre','nivara'],gas:['veyra','cobalt-storms']
});
const PLANET_SURFACE_LABELS=freezeContent({'basalt-rifts':'FRACTURED BASALT','magma-archipelago':'MAGMA ARCHIPELAGOS','sulfur-calderas':'SULFUR CALDERAS',ferrum:'IRON HIGHLANDS',cinder:'VOLCANIC BASINS',caelus:'CONTINENTAL SEAS',thalassa:'OCEAN GYRES',nacre:'FROZEN SHELVES',nivara:'GLACIAL FRACTURES',veyra:'AMBER CLOUD BELTS','cobalt-storms':'COBALT CYCLONES'});
function assignPlanetSurfaceFamilies(releases){
 // Surface families are content, not climate aliases. Allocate without replacement
 // inside a system; fail authoring when the library cannot support the roster.
 const originals=new Set(['caelus','ferrum','nacre','thalassa','veyra','cinder','nivara']);
 return releases.map(release=>({...release,systems:release.systems.map(system=>{
  const used=new Set(),assignments=new Map();
  const planets=system.destinations.filter(d=>d.kind==='planet').slice().sort((a,b)=>Number(originals.has(b.id))-Number(originals.has(a.id))||a.id.localeCompare(b.id));
  for(const d of planets){const pool=PLANET_SURFACE_FAMILIES[d.climate];if(!pool)throw Error('No surface library for '+d.climate);
   const pinned=d.surfaceFamily||(originals.has(d.id)?d.surfaceDisk:null),available=pool.filter(id=>!used.has(id)),seed=speciesHash('surface-family-v1/'+system.id+'/'+d.id);
   if(pinned&&(!pool.includes(pinned)||used.has(pinned)))throw Error('Invalid or repeated surface family: '+d.id);
   if(!pinned&&!available.length)throw Error('Expand '+d.climate+' texture library before adding '+d.id);
   const family=pinned||available[seed%available.length];used.add(family);
   assignments.set(d.id,{...d,surfaceDisk:family,surfaceFamily:family,surfaceRotation:originals.has(d.id)?0:(seed%6283)/1000,surfaceCoverage:['basalt-rifts','magma-archipelago','sulfur-calderas','cobalt-storms'].includes(family)?.48:.5});
  }
  return{...system,destinations:system.destinations.map(d=>assignments.get(d.id)||d)};
 })}));
}
const PLANET_SURFACE_ATLASES=freezeContent({original:'planet-surfaces-v1.webp',frontier:'planet-frontier-v1.webp',orison:'planet-orison-v1.webp'});
const ORBITAL_ZONES=freezeContent({inner:{label:'HOT INNER WORLDS',climates:['hot']},temperate:{label:'TEMPERATE WORLDS',climates:['temperate']},outer:{label:'ICE & GAS WORLDS',climates:['ice','gas']},stellar:{label:'STELLAR CORONA',climates:['plasma']}});
function buildExpedition(releases,definitions,galaxies=GALAXIES){
 const ids=new Set(),stages=new Map(definitions.map(l=>[l.id,l])),used=new Set(),route=[],locations={};
 function identity(id){if(typeof id!=='string'||!/^[a-z0-9-]+$/.test(id)||ids.has(id))throw Error('Duplicate or invalid expedition identity: '+id);ids.add(id);}
 for(const release of releases){identity(release.id);if(!Number.isInteger(release.version)||release.version<1||!/^\d{4}-\d{2}$/.test(release.month))throw Error('Invalid content release');
  for(const system of release.systems){const galaxy=galaxies[system.galaxyId||GALAXY.id];if(!galaxy||!galaxy.id||!galaxy.name)throw Error('Unknown expedition galaxy');identity(system.id);if(!system.name||!(system.centralBody||system.star)?.name||!system.destinations.length)throw Error('System needs a named star and destinations');
   if(system.galacticPosition&&(!Array.isArray(system.galacticPosition)||system.galacticPosition.length!==2||system.galacticPosition.some(n=>!Number.isFinite(n)||n<.15||n>.85)))throw Error('Invalid galactic system position');
   if(system.star?.color&&(!Array.isArray(system.star.color)||system.star.color.length!==3||system.star.color.some(c=>!Number.isFinite(c)||c<0||c>255)))throw Error('Invalid star color');
   if(system.star?.radius!==undefined&&(!Number.isFinite(system.star.radius)||system.star.radius<.5||system.star.radius>2))throw Error('Invalid star radius');
   const planets=system.destinations.filter(d=>d.kind==='planet').sort((a,b)=>a.orbit-b.orbit),thermalRank={inner:0,temperate:1,outer:2};
   if(planets.length>6||(!planets.length&&system.centralBody?.kind!=='black-hole'))throw Error('System requires one to six planets or a black-hole stellar cluster');
   if(system.centralBody?.kind==='black-hole'&&(system.star||!system.destinations.every(d=>d.kind==='star'&&d.stellarBody?.name)))throw Error('Black-hole clusters require named stellar destinations');
   for(let i=0;i<planets.length;i++){const d=planets[i],previous=planets[i-1];if(d.orbit<=0||!(d.orbitalZone in thermalRank)||previous&&(d.orbit===previous.orbit||thermalRank[d.orbitalZone]<thermalRank[previous.orbitalZone]))throw Error('Planet orbits must cool from inner to outer without duplicate distances');}

   for(const destination of system.destinations){identity(destination.id);if(!destination.name||!['planet','star'].includes(destination.kind)||!destination.stages.length)throw Error('Invalid destination');
    if(destination.anomaly&&destination.anomaly!=='black-hole')throw Error('Unknown destination anomaly');
    if(destination.stellarBody){const sun=destination.stellarBody;if(destination.kind!=='star'||!sun.name||!Array.isArray(sun.color)||sun.color.length!==3||sun.color.some(v=>!Number.isFinite(v)||v<0||v>255)||!Number.isFinite(sun.radius)||sun.radius<.5||sun.radius>2||destination.orbit<=0)throw Error('Invalid stellar destination');}
    if(destination.surfaceTint&&(!Array.isArray(destination.surfaceTint)||destination.surfaceTint.length!==3||destination.surfaceTint.some(n=>!Number.isFinite(n)||n<.5||n>1.5)))throw Error('Invalid surface tint');
    if(destination.surfaceDisk&&!PLANET_SURFACE_DISKS[destination.surfaceDisk])throw Error('Invalid planetary surface disk');
    if(destination.surfaceAtlas&&(!PLANET_SURFACE_ATLASES[destination.surfaceAtlas]||!Number.isInteger(destination.surfaceBand)||destination.surfaceBand<0||destination.surfaceBand>2))throw Error('Invalid planetary surface atlas');
    const zone=ORBITAL_ZONES[destination.orbitalZone];if(!zone||!zone.climates.includes(destination.climate)||typeof destination.rings!=='boolean'||!Number.isFinite(destination.orbit)||destination.orbit<0)throw Error('Invalid orbital climate or rings');
    for(const id of destination.stages){const stage=stages.get(id);if(!stage||used.has(id))throw Error('Missing or repeated expedition stage: '+id);if(destination.kind==='star'&&stage.environment!=='stellar-corona')throw Error('Star stages require a corona habitat');if(!!stage.gravityWell!==(destination.anomaly==='black-hole'))throw Error('Navigation and stage anomaly disagree: '+id);used.add(id);route.push(stage);locations[id]={releaseId:release.id,releaseVersion:release.version,systemId:system.id,systemName:system.name,destinationId:destination.id,destinationName:destination.name,destinationKind:destination.kind,stellarBody:destination.stellarBody||null,centralBlackHole:system.centralBody?.kind==='black-hole',starName:destination.stellarBody?.name||system.star?.name||system.name,orbit:destination.orbit,climate:destination.climate,rings:destination.rings,orbitalZone:destination.orbitalZone,galaxyId:galaxy.id,galaxyName:galaxy.name,anomaly:destination.anomaly||null,surfaceDisk:destination.surfaceDisk||null,surfaceFamily:destination.surfaceFamily||null,surfaceRotation:destination.surfaceRotation||0,surfaceCoverage:destination.surfaceCoverage??.5,surfaceTint:destination.surfaceTint||[1,1,1],ringTilt:destination.ringTilt??-.23,surfaceLongitude:destination.surfaceLongitude??0,orbitPhase:destination.orbitPhase??null,surfaceAtlas:destination.surfaceAtlas||'original',surfaceBand:destination.surfaceBand??null};}
   }
  }
 }
 if(!route.length)throw Error('Expedition needs playable stages');
 return {stages:route,locations};
}
// Orison retains the deeper encounters, reauthors their worlds, then adds a
// subglacial finale. The first system deliberately teaches only three planets.
Object.assign(levelDefinitions[3],{name:'THE CHOIR TRENCH',short:'CHOIR TRENCH',boss:'THE CHOIRKEEPER',background:'orisonOcean',chapter:2,expeditionNote:'Thalassa · a living ocean beneath Orison A'});
Object.assign(levelDefinitions[4],{name:'THE AMBER GYRE',short:'AMBER GYRE',boss:'THE TEMPEST ENGINE',background:'orisonGas',ringsInPainting:true,chapter:2,environment:'high-atmosphere',stratum:'GAS-GIANT CLOUD DECK',atmosphere:{clouds:.85,heat:0,water:0},expeditionNote:'Veyra · storm collectors above a ringed gas giant'});
Object.assign(levelDefinitions[5],{name:'THE ASHEN NEST',short:'ASHEN NEST',boss:'THE CINDER QUEEN',background:'orisonCinder',chapter:2,expeditionNote:'Cinder · ember hives below a scorched crust'});
const nivara=JSON.parse(JSON.stringify(levelDefinitions[2]));
Object.assign(nivara,{id:'nivara-glacial-heart',revision:1,name:'THE GLACIAL HEART',short:'GLACIAL HEART',boss:'THE RIME LEVIATHAN',background:'orisonIce',chapter:2,environment:'deep-undersea',stratum:'SUBGLACIAL OCEAN',medium:'water',atmosphere:{water:1,heat:0,clouds:0},expeditionNote:'Nivara · a pressure hunter beneath the frozen ocean',duration:64,checkpoints:[0,16,32,48],difficulty:4.5,hp:3600,bossArmor:1.16,color:'#abdff4',fog:'#18304a',sky:'#061524',planet:'#487e98',music:2,entrySides:['right','right','left','right'],routes:[380,170,560,300,460],roster:[1,3,0,1,2,3],broodWaves:[4,12],bossPalette:[.64,.94,1.23],flightRoute:{period:21,drive:3.4,speed:345,points:[[1120,230],[890,530],[700,420],[850,190],[1200,440],[1110,550]]},encounterProfile:{...BOSS_ENCOUNTERS.sovereign,signature:'GLACIAL PRESSURE',cooldown:6.5,warning:1.9}});
nivara.waves=Array.from({length:20},(_,i)=>Number((1.5+i*2.95).toFixed(2)));
nivara.obstacles.forEach(o=>{o.at=Number((o.at*64/56).toFixed(2));});
nivara.supplies.forEach(d=>{d.at=d.type==='rescue'?16.5:Number((d.at*64/56).toFixed(2));});nivara.supplies.sort((a,b)=>a.at-b.at);
nivara.challenge={title:'THE ICE NEEDLE PASS',at:27,end:39,waves:[28,32,36],types:[1,3],count:2,speed:1.05,gate:false};
nivara.pacing={pickupGap:2.4,maxPickups:1,maxActiveEnemies:12,pickupX:660,preBossRelief:true};
nivara.escortEncounter={...nivara.escortEncounter,name:'FROST SHEPHERD',pace:1.04,count:3};
levelDefinitions.push(nivara);
for(const l of levelDefinitions.slice(3,6))l.revision++;
// Expansion packs share art/rig libraries; routes, supplies, boss patrols and
// challenge schedules are materialized from stable authored seeds once at load.
// Adding a system is a catalog change, never a new gameplay index or switch.
const SYSTEM_PACKS=freezeContent([
 {id:'lyra',name:'LYRA',galaxy:'the-azure-drift',star:['LYRA A','WHITE DWARF',[211,225,255],.62],worlds:[['Aster',0,1.2,11],['Scoria',5,.34,17],['Pelagos',3,4.7,23]]},
 {id:'solenne',name:'SOLENNE',galaxy:'the-copper-sea',star:['SOLENNE A','GOLDEN GIANT',[255,206,107],1.65],worlds:[['Brass',1,.5,31],['Zephyr',0,1.5,37],['Oriel',4,4.1,41],['Isolde',2,7.2,43],['Rime',6,10.6,47]]},
 {id:'nereid',name:'NEREID',galaxy:'the-silent-arc',star:['NEREID A','PALE BLUE STAR',[171,215,255],1.16],worlds:[['Thren',5,.3,53],['Mistral',0,1.3,59],['Sere',3,2.2,61],['Brine',2,6.4,67]]},
 {id:'umbra',name:'UMBRA',galaxy:'the-violet-wake',star:['UMBRA A','RED DWARF',[255,139,101],.68],worlds:[['Cauter',1,.18,71],['Caldera',5,.46,73],['Viridia',0,1.0,79],['Morrow',3,1.9,83],['Boreas',4,5.8,89],['Hush',6,9.4,97]]},
 {id:'auric',name:'AURIC',galaxy:'the-golden-rift',star:['AURIC A','AMBER GIANT',[255,172,64],1.88],worlds:[['Gilt',1,.7,101],['Hesper',4,5.5,103],['Floe',6,11.2,107]]},
 {id:'halcyon',name:'HALCYON',galaxy:'the-glass-spiral',star:['HALCYON A','BLUE GIANT',[122,180,255],1.72],worlds:[['Kiln',5,.42,109],['Lacuna',3,1.8,113],['Cirrus',0,2.7,127],['Nimbus',4,6.6,131],['Silex',2,10.8,137]]},
 {id:'pyrrha',name:'PYRRHA',galaxy:'the-scarlet-reach',star:['PYRRHA A','ORANGE DWARF',[255,164,109],.94],worlds:[['Sinter',1,.31,139],['Aureole',0,1.1,149],['Nerine',3,2.3,151],['Obscura',6,7.7,157]]},
 {id:'elysian',name:'ELYSIAN',galaxy:'the-last-lantern',star:['ELYSIAN A','BLUE-WHITE SUPERGIANT',[197,215,255],1.98],worlds:[['Vulcanis',5,.5,163],['Crucible',1,.9,167],['Serein',0,1.9,173],['Opaline',3,2.8,179],['Vespera',4,7.4,181],['Terminus',6,12.8,191]]},
 {id:'selen',name:'SELEN',galaxy:'the-indigo-tide',star:['SELEN A','WHITE DWARF',[198,219,255],0.77],worlds:[['Eidolon',0,1.3,211],['Flint',1,0.45,218],['Saphir',3,2.4,225],['Hail',6,8.8,232]]},
 {id:'rubra',name:'RUBRA',galaxy:'the-rose-expanse',star:['RUBRA A','RED GIANT',[255,148,113],1.68],worlds:[['Furnace',5,0.32,248],['Sirocco',4,5.1,255],['Asterion',2,9.6,262]]},
 {id:'talos',name:'TALOS',galaxy:'the-iron-nebula',star:['TALOS A','YELLOW STAR',[255,205,137],1.13],worlds:[['Alloy',1,0.36,285],['Fervor',5,0.7,292],['Beryl',0,1.4,299],['Tethys',3,2.7,306],['Vortex',4,6.2,313],['Shard',6,12.1,320]]},
 {id:'aether',name:'AETHER',galaxy:'the-pearl-river',star:['AETHER A','BLUE GIANT',[158,194,255],1.49],worlds:[['Cresset',5,0.5,322],['Aerial',0,1.7,329],['Nympha',3,2.5,336],['Aurelia',4,7.2,343],['Hoarfrost',2,11.5,350]]},
 {id:'cervus',name:'CERVUS',galaxy:'the-auburn-veil',star:['CERVUS A','ORANGE DWARF',[255,182,130],0.81],worlds:[['Fallow',1,0.55,359],['Verdigris',0,1.6,366],['Marina',3,2.6,373],['Wintermere',6,8.9,380]]},
 {id:'argent',name:'ARGENT',galaxy:'the-silver-reach',star:['ARGENT A','WHITE STAR',[231,234,255],1.35],worlds:[['Smelt',5,0.28,396],['Tempera',1,0.65,403],['Peregrine',0,1.8,410],['Littoral',3,2.9,417],['Pallor',4,6.8,424],['Glacier',6,13.4,431]]},
 {id:'saffron',name:'SAFFRON',galaxy:'the-ochre-spiral',star:['SAFFRON A','GOLDEN GIANT',[255,198,82],1.85],worlds:[['Emberfall',1,0.4,433],['NimbusReach',4,4.6,440],['Stillwater',2,9.8,447]]},
 {id:'virent',name:'VIRENT',galaxy:'the-celadon-drift',star:['VIRENT A','BLUE-WHITE STAR',[199,217,255],1.09],worlds:[['Carmine',5,0.37,470],['Lichen',0,1.5,477],['Cerulean',3,2.3,484],['Halation',4,5.9,491],['Permafrost',6,10.7,498]]},
 {id:'noctis',name:'NOCTIS',galaxy:'the-obsidian-crown',star:['NOCTIS A','RED DWARF',[255,128,96],0.58],worlds:[['Fumarole',5,0.2,507],['Sable',1,0.48,514],['Fathom',3,1.9,521],['Rook',0,7.4,528,{anomaly:'black-hole'}]]},
 {id:'meridian',name:'MERIDIAN',galaxy:'the-distant-bloom',star:['MERIDIAN A','BLUE-WHITE SUPERGIANT',[213,227,255],1.94],worlds:[['Dawnfire',5,0.44,544],['Aegis',1,0.92,551],['Lucent',0,1.7,558],['Aquilon',3,2.8,565],['Ophir',4,7.9,572],['Evernight',6,14.2,579]]}
]);
const STAGE_ARCHETYPES=Object.fromEntries(levelDefinitions.map((l,i)=>[i,JSON.parse(JSON.stringify(l))]));
// A system is an authored ecology and a self-contained challenge arc. Planet
// names/orbits are persistent save identities; these templates own their content.
const WORLD_ENVIRONMENT_TEMPLATES=freezeContent({
 orbital:{environment:'high-atmosphere',base:0,climates:['temperate','ice'],landform:'fragmented orbital escarpments',adaptation:'sealed breathing sacs and radiation plates'},
 sky:{environment:'low-atmosphere',base:0,climates:['temperate'],landform:'weather-carved cloud mesas',adaptation:'light membranes and swept lift surfaces'},
 garden:{environment:'surface',base:0,climates:['temperate'],landform:'root buttresses and mineral canyons',adaptation:'grasping limbs and short powerful wings'},
 foundry:{environment:'underground',base:1,climates:['hot'],landform:'anchored refineries and heat-exchanger trenches',adaptation:'ceramic armour and recessed cooling vanes'},
 desert:{environment:'surface',base:5,climates:['hot'],landform:'glass dunes and fractured salt plateaux',adaptation:'reflective scutes and protected joints'},
 magma:{environment:'deep-underground',base:5,climates:['hot'],landform:'lava cataracts and basalt vaults',adaptation:'overlapping refractory shells and thermal vents'},
 caves:{environment:'underground',base:5,climates:['temperate'],landform:'hanging mineral fans and root caverns',adaptation:'sensory feelers and echo chambers'},
 ocean:{environment:'undersea',base:2,climates:['temperate'],landform:'reef shelves and eroded seafloor arches',adaptation:'streamlined fins and pressure-balanced organs'},
 trench:{environment:'deep-undersea',base:3,climates:['temperate'],landform:'hydrothermal chimneys and trench walls',adaptation:'pressure mantles and bioluminescent lures'},
 iceOcean:{environment:'deep-undersea',base:6,climates:['ice'],landform:'split ice ceilings above dark brine canyons',adaptation:'insulating blubber and articulated pressure fins'},
 glacier:{environment:'surface',base:0,climates:['ice'],landform:'blue crevasses and wind-cut ice shelves',adaptation:'insulated chitin and anti-icing membranes'},
 iceCaves:{environment:'underground',base:5,climates:['ice'],landform:'crystal vaults and frozen mineral curtains',adaptation:'layered insulation and heated breathing ports'},
 storm:{environment:'high-atmosphere',base:4,climates:['gas'],landform:'banded cloud canyons and suspended storm collectors',adaptation:'buoyant chambers and insulated ion vanes'},
 corona:{environment:'stellar-corona',base:5,climates:['plasma'],landform:'plasma cells and magnetic prominences',adaptation:'refractory carapaces and magnetic shielding'}
});
// Every existing galaxy is explicitly assigned a template. No modulo/cycling
// fallback is allowed when a monthly release adds an unknown system.
const SOLAR_SYSTEM_TEMPLATES=freezeContent(Object.fromEntries([
 ['vesper','the-pale-spiral','Broken jade frontier','jade seams / weathered titanium',['orbital','foundry','iceOcean'],['lancet','shield','mantle'],['delta','catamaran','arc']],
 ['orison','the-ember-veil','Resonant living reefs','porcelain ridges / amber lattice',['trench','storm','magma','iceOcean'],['chalice','crown','centipede','hammer'],['radial','arc','fork','casket']],
 ['lyra','the-azure-drift','Glass and folded stone','opal glass / folded limestone',['sky','magma','iceOcean'],['fork','vault','ribbon'],['blade','spindle','radial']],
 ['solenne','the-copper-sea','Copper terraces','oxidised copper / stepped sandstone',['foundry','garden','storm','glacier','iceCaves'],['shield','centipede','crown','lancet','vault'],['catamaran','fork','arc','blade','casket']],
 ['nereid','the-silent-arc','Tidal mineral forests','black coral / silver mineral fans',['desert','sky','ocean','iceOcean'],['hammer','fork','mantle','chalice'],['spindle','delta','radial','arc']],
 ['umbra','the-violet-wake','Eclipsed basalt gardens','violet basalt / pale fungal lace',['foundry','magma','caves','trench','storm','glacier'],['vault','centipede','shield','ribbon','crown','fork'],['casket','blade','fork','spindle','radial','delta']],
 ['auric','the-golden-rift','Amber faultlands','honey quartz / ribbed brass',['desert','storm','iceOcean'],['shield','chalice','hammer'],['blade','radial','catamaran']],
 ['halcyon','the-glass-spiral','Prismatic watersheds','prism shale / translucent mineral fins',['magma','ocean','garden','storm','glacier'],['centipede','ribbon','fork','vault','lancet'],['fork','arc','delta','spindle','casket']],
 ['pyrrha','the-scarlet-reach','Ironwood impact basins','red ironwood / fractured obsidian',['foundry','sky','trench','iceCaves'],['hammer','crown','chalice','shield'],['catamaran','blade','radial','fork']],
 ['elysian','the-last-lantern','Ivory wind labyrinths','ivory limestone / gold-thread ceramic',['magma','desert','sky','ocean','storm','iceOcean'],['centipede','vault','lancet','mantle','fork','hammer'],['casket','catamaran','delta','arc','spindle','radial']],
 ['selen','the-indigo-tide','Lunar lace continent','silver chalk / translucent slate',['garden','foundry','trench','glacier'],['fork','shield','ribbon','vault'],['arc','blade','radial','casket']],
 ['rubra','the-rose-expanse','Crimson pressure worlds','garnet cliffs / porous black pumice',['magma','storm','iceOcean'],['centipede','chalice','mantle'],['fork','spindle','arc']],
 ['talos','the-iron-nebula','Ancient machine ecologies','riveted iron / faceted magnetite',['foundry','desert','garden','ocean','storm','iceCaves'],['shield','hammer','centipede','ribbon','vault','fork'],['catamaran','casket','blade','arc','radial','spindle']],
 ['aether','the-pearl-river','Pearlescent shelves','pearl nacre / feathered mineral shelves',['magma','sky','trench','storm','glacier'],['crown','lancet','chalice','vault','hammer'],['blade','delta','arc','radial','fork']],
 ['cervus','the-auburn-veil','Branching copper wilds','copperwood roots / serrated ochre rock',['desert','garden','ocean','iceOcean'],['centipede','fork','mantle','ribbon'],['casket','delta','catamaran','arc']],
 ['argent','the-silver-reach','Silver mirror rifts','mirror salt / blue-steel filigree',['magma','foundry','orbital','trench','storm','glacier'],['vault','shield','lancet','chalice','crown','hammer'],['fork','catamaran','blade','arc','radial','spindle']],
 ['saffron','the-ochre-spiral','Golden honeycomb worlds','ochre honeycomb / smoky crystal',['desert','storm','iceCaves'],['shield','crown','centipede'],['casket','radial','fork']],
 ['virent','the-celadon-drift','Verdigris tidal gardens','verdigris stone / braided living reefs',['magma','caves','ocean','storm','iceOcean'],['hammer','centipede','mantle','chalice','ribbon'],['blade','fork','arc','spindle','radial']],
 ['noctis','the-obsidian-crown','Black glass tidal frontier','black glass / pale bismuth seams',['magma','foundry','trench','orbital'],['vault','shield','chalice','lancet'],['casket','catamaran','arc','delta']],
 ['meridian','the-distant-bloom','Radiant mineral blooms','sunstone petals / sapphire terraces',['desert','foundry','sky','ocean','storm','iceOcean'],['hammer','shield','fork','mantle','crown','ribbon'],['blade','casket','delta','arc','radial','spindle']],
 ['eventide','the-eventide-core','Magnetic stellar archipelago','refractory carbon / plasma filaments',['corona','corona','corona'],['centipede','crown','lancet'],['casket','radial','blade']]
].map(([id,galaxyId,title,materials,route,organics,machines],expeditionIndex)=>[id,{id,version:2,galaxyId,title,materials,route,organics,machines,expeditionIndex,difficultyCurve:'system-arc-v3'}])));
function systemTemplate(system){
 const id=system.id.replace(/-system$/,''),template=SOLAR_SYSTEM_TEMPLATES[id];
 if(!template||template.galaxyId!==(system.galaxyId||system.galaxy))throw Error('Supply a matching solar-system template for '+system.id);
 return template;
}
function worldTemplate(system,index){
 const systemDesign=systemTemplate(system),environmentId=systemDesign.route[index],environment=WORLD_ENVIRONMENT_TEMPLATES[environmentId];
 if(!environment)throw Error('Missing world template at '+system.id+'/'+index);
 return {systemDesign,environmentId,environment};
}
function systemChallengeBudget(index,count,expeditionIndex=0){
 if(!Number.isInteger(index)||!Number.isInteger(count)||count<1||index<0||index>=count)throw Error('Invalid system challenge position');
 if(!Number.isInteger(expeditionIndex)||expeditionIndex<0)throw Error('Invalid expedition position');
 const progress=count===1?0:index/(count-1),journey=1-Math.exp(-expeditionIndex/5);
 return {version:3,expeditionIndex,journey,enemyFireScale:1-journey*.18,index,count,progress,difficulty:Number((.75+progress*2.75).toFixed(3)),hp:Math.round(1000+300*progress),enemyHealthScale:(1.04+progress*.38)*(1+journey*.3),bossArmor:1+progress*.12,maxActiveEnemies:9+Math.round(progress*5),waves:18+Math.round(progress*8),eliteWaveInterval:11-Math.round(progress*4+journey*2),salvoRestScale:(1-progress*.34)*(1-journey*.18),specialCooldown:(6.1-progress*2)*(1-journey*.14),warning:1.85-progress*.25};
}
function applySystemChallenge(stage,index,count,expeditionIndex){
 const b=systemChallengeBudget(index,count,expeditionIndex);stage.systemChallenge=b;
 Object.assign(stage,{difficulty:b.difficulty,hp:b.hp,enemyHealthScale:b.enemyHealthScale,bossArmor:b.bossArmor,salvoRestScale:b.salvoRestScale});
 stage.pacing={...stage.pacing,maxActiveEnemies:b.maxActiveEnemies,pickupGap:2.7-b.progress*.4,maxPickups:2,preBossRelief:true};
 // A little room to read the opening; the same authored wave count builds later.
 stage.waves=Array.from({length:b.waves},(_,i)=>Number((3+Math.pow(i/(b.waves-1),.76)*(stage.duration-8.5)).toFixed(3)));
 // Defense is the first learnable pickup, before the opening obstacle reaches the pilot.
 const guard=stage.supplies.find(d=>d.type==='frontShield'),speed=stage.supplies.find(d=>d.type==='speed');
 if(guard){guard.at=1;guard.y=380;guard.drift=260;}if(speed)speed.at=3.5;
 const earlyPower=stage.supplies.find(d=>d.type==='power');if(earlyPower){earlyPower.at=6.2;earlyPower.y=380;earlyPower.drift=230;}
 stage.supplies.sort((a,b)=>a.at-b.at);
 stage.broodWaves=b.progress>=.6?[5,13,Math.min(b.waves-2,21)]:[5,13];
 // Fixed counter-waves ask the pilot to flip; never depend on current power.
 const flankInterval=b.progress>=.7?5:b.progress>=.35||b.journey>=.3?7:0;
 stage.flankWaves=flankInterval?stage.waves.map((_,i)=>i).filter(i=>i>=4&&(i-4)%flankInterval===0&&!stage.broodWaves.includes(i)):[];
 stage.encounterProfile={...bossEncounterProfile(stage),cooldown:b.specialCooldown,warning:b.warning};
 if(stage.challenge){stage.challenge.count=b.progress<.65?2:3;stage.challenge.speed=1+b.progress*.1;}
 if(stage.escortEncounter)stage.escortEncounter={...stage.escortEncounter,count:3+Math.round(b.progress),pace:1+b.progress*.1};
 stage.revision++;
}
function materializeSystemPack(pack,packIndex){
 const slug=n=>n.toLowerCase().replace(/[^a-z0-9]+/g,'-'),worlds=[];
 for(const [worldIndex,[name,legacyArchetype,orbit,seed,features={}]] of pack.worlds.entries()){
  const {environment:worldEnvironment,environmentId}=worldTemplate({...pack,galaxyId:pack.galaxy},worldIndex),archetype=worldEnvironment.base;
  const base=STAGE_ARCHETYPES[archetype];if(!base)throw Error('Unknown encounter archetype '+archetype);
  const l=JSON.parse(JSON.stringify(base)),id=pack.id+'-'+slug(name),duration=60+(seed%3)*4,ratio=duration/base.duration;
  const water=base.medium==='water',climate=orbit<1?'hot':orbit<3?'temperate':environmentId==='storm'?'gas':'ice',tint=[[1.07,.94,.86],[.86,1.04,1.09],[1.03,.88,1.07],[.91,1.07,.91]][seed%4];
  Object.assign(l,{id:id+'-descent',revision:1,name:name.toUpperCase()+' / '+base.short,short:base.short,boss:pack.name+' '+({warden:'SKY REAVER',cathedral:'SIEGE ENGINE',sovereign:'PRESSURE HUNTER',monarch:'MAW KEEPER',regent:'STORM SENTINEL',mother:'BROOD QUEEN'}[base.bossKind]),chapter:packIndex+3,duration,checkpoints:[0,duration/4,duration/2,duration*3/4],difficulty:0,hp:1500,enemyHealthScale:1,bossArmor:Math.min(1.2,base.bossArmor||1),bossPalette:tint,sceneTint:tint,contentSeed:seed,expeditionNote:pack.name+' · '+name+' · '+base.stratum});
  const physical=ENVIRONMENTS[worldEnvironment.environment];
  if(!worldEnvironment.climates.includes(climate))throw Error('Template climate mismatch: '+id);
  Object.assign(l,{environment:worldEnvironment.environment,medium:physical.medium,atmosphere:{heat:climate==='ice'?0:physical.heat,clouds:physical.clouds,water:physical.water},stratum:physical.label});
  l.routes=base.routes.map((y,i)=>Math.max(130,Math.min(630,y+Math.sin(seed+i*2.1)*75)));
  l.roster=base.roster.slice(seed%base.roster.length).concat(base.roster.slice(0,seed%base.roster.length));
  const waveCount=19+seed%5;l.waves=Array.from({length:waveCount},(_,i)=>Number((1.5+i*(duration-6)/waveCount+.14*Math.sin(seed+i)).toFixed(3)));
  l.broodWaves=[4+seed%2,12+seed%3];
  l.entrySides=water?['right','right','left','right']:seed%2?['right','top','right','left']:['right','right','bottom','left'];
  l.supplies.forEach(d=>{d.at=Number((d.at*ratio).toFixed(3));if(d.type==='rescue')d.at=duration/4+.5;});l.supplies.sort((a,b)=>a.at-b.at);
  l.obstacles.forEach(o=>{o.at=Number((o.at*ratio).toFixed(3));});
  l.challenge={...base.challenge,title:name.toUpperCase()+' '+(water?'PRESSURE PASSAGE':archetype===1?'REACTOR LOCK':'CROSSING'),at:duration*.43,end:duration*.63,waves:[.45,.50,.55,.60].map(t=>Number((duration*t).toFixed(3))),count:2+seed%2,speed:1.08+(seed%3)*.04};
  l.pacing={...base.pacing,maxActiveEnemies:10,pickupGap:2.4,maxPickups:1,preBossRelief:true};
  l.encounterProfile={...bossEncounterProfile(base),cooldown:bossEncounterProfile(base).cooldown,warning:Math.max(1.45,bossEncounterProfile(base).warning)};
  l.flightRoute={period:20+seed%6,drive:3.2,speed:310+seed%5*12,points:[[1140,200+seed%3*70],[900,530],[540+seed%4*60,420],[800,170],[1190,470],[1040,320]]};
  if(l.escortEncounter)l.escortEncounter={...l.escortEncounter,name:name.toUpperCase()+' '+(l.escortEncounter.organic?'SHEPHERD':'ESCORT'),pace:1+(seed%3)*.06};
  if(features.anomaly==='black-hole'){
   Object.assign(l,{revision:2,name:name.toUpperCase()+' / TIDAL FRONTIER',short:'TIDAL FRONTIER',boss:'THE LENSKEEPER',background:'blackHole',stratum:'OUTER EXOSPHERE',atmosphere:{water:0,heat:0,clouds:0},sky:'#02050e',fog:'#261c38',color:'#e9bc82',bossPalette:[.76,.84,1.15],gravityWell:{center:[.712,.33],radius:.082,lensing:.65,tidalPeriod:18},expeditionNote:'Rook · a black hole bends starlight above the frozen outer world'});
   l.challenge={...l.challenge,title:'THE TIDAL DEBRIS PASS',count:2,speed:1.06};
  }
  levelDefinitions.push(l);
  worlds.push({id,anomaly:features.anomaly||null,biosphere:features.biosphere,name:name.toUpperCase(),kind:'planet',orbit,orbitalZone:orbit<1?'inner':orbit<3?'temperate':'outer',climate,rings:archetype===4||archetype===0&&seed%2===1,ringTilt:(seed%2?1:-1)*(.15+seed%4*.07),orbitPhase:seed*2.399963,surfaceDisk:climate==='hot'?(archetype===1?'ferrum':'cinder'):climate==='gas'?'veyra':climate==='ice'?(seed%2?'nivara':'nacre'):water?'thalassa':'caelus',surfaceTint:tint,stages:[l.id]});
 }
 return {id:pack.id+'-expedition',version:1,month:'2026-09',systems:[{id:pack.id+'-system',galaxyId:pack.galaxy,name:pack.name,galacticPosition:[[.70,.39],[.32,.59],[.68,.65],[.27,.38],[.74,.55],[.39,.28]][packIndex%6],star:{name:pack.star[0],type:pack.star[1],color:pack.star[2],radius:pack.star[3]},destinations:worlds}]};
}
const expansionReleases=SYSTEM_PACKS.map(materializeSystemPack);
// A stellar cluster is a different topology, not a planetary system with renamed worlds.
const eventideRelease=(()=>{
 const stars=[
  {id:'eventide-carmine',name:'CARMINE',type:'RED GIANT',color:[255,103,47],radius:1.45,orbit:1.1,seed:617,weather:'prominences',archetype:5,boss:'THE CORONAL HYDRA'},
  {id:'eventide-fulgur',name:'FULGUR',type:'BLUE-WHITE STAR',color:[140,193,255],radius:.95,orbit:2.1,seed:631,weather:'magnetic',archetype:4,boss:'THE FLUX ENGINE'},
  {id:'eventide-aureus',name:'AUREUS',type:'AMBER STAR',color:[255,185,58],radius:1.12,orbit:3.4,seed:643,weather:'wind',archetype:0,boss:'THE SOLAR REAVER'}
 ];
 const destinations=stars.map((star,i)=>{
  const base=STAGE_ARCHETYPES[star.archetype],l=JSON.parse(JSON.stringify(base)),duration=64,ratio=duration/base.duration;
  Object.assign(l,{id:star.id+'-corona',revision:1,name:star.name+' / '+({prominences:'PROMINENCE SEA',magnetic:'MAGNETIC FRONT',wind:'SOLAR WIND'}[star.weather]),short:'STELLAR CORONA',boss:star.boss,environment:'stellar-corona',stratum:'OUTER CORONA',medium:'air',atmosphere:{heat:1,clouds:0,water:0},stellar:star,chapter:21,duration,checkpoints:[0,16,32,48],difficulty:4.5,hp:3000+i*180,bossArmor:1.12,color:['#ffac6c','#a0ceff','#ffdb86'][i],sky:'#0b0812',fog:'#69280b',planet:'#a65824',expeditionNote:star.name+' · outer stellar corona · Eventide galactic core',obstacles:[],scrollAxis:null,contentSeed:star.seed});
  l.waves=Array.from({length:21},(_,n)=>1.5+n*2.8);l.supplies.forEach(d=>{d.at=Number((d.at*ratio).toFixed(3))});l.supplies.sort((a,b)=>a.at-b.at);l.broodWaves=[5,13];l.challenge={...base.challenge,title:star.name+' SURGE',at:27,end:40,waves:[28,32,36],gate:false,count:2,speed:1.06};l.pacing={...base.pacing,maxActiveEnemies:12};
  levelDefinitions.push(l);return{id:star.id,name:star.name,kind:'star',stellarBody:star,orbit:star.orbit,orbitalZone:'stellar',climate:'plasma',rings:false,orbitPhase:.8+i*2.15,stages:[l.id]};
 });
 return{id:'eventide-stellar-frontier',version:1,month:'2026-11',systems:[{id:'eventide-system',name:'EVENTIDE',galaxyId:'the-eventide-core',galacticPosition:[.5,.5],centralBody:{kind:'black-hole',name:'UMBILICUS',type:'SUPERMASSIVE BLACK HOLE'},destinations}]};
})();
const contentReleases=freezeContent(assignPlanetSurfaceFamilies([
 {id:'first-contact',version:5,month:'2026-09',systems:[{id:'vesper-system',galaxyId:'the-pale-spiral',name:'VESPER',galacticPosition:[.72,.42],star:{name:'VESPER A',type:'AMBER DWARF',color:[255,179,79],radius:.88},destinations:[
  {id:'caelus',surfaceDisk:'caelus',name:'CAELUS',kind:'planet',orbitalZone:'temperate',orbit:1.4,climate:'temperate',rings:true,orbitPhase:-.55,stages:[levelDefinitions[0].id]},
  {id:'ferrum',surfaceDisk:'ferrum',name:'FERRUM',kind:'planet',orbitalZone:'inner',orbit:.85,climate:'hot',rings:false,orbitPhase:2.3,surfaceAtlas:'frontier',surfaceBand:0,stages:[levelDefinitions[1].id]},
  {id:'nacre',surfaceDisk:'nacre',name:'NACRE',kind:'planet',orbitalZone:'outer',orbit:4.8,climate:'ice',rings:false,orbitPhase:3.9,stages:[levelDefinitions[2].id]}
 ]}]},
 {id:'orison-frontier',version:2,month:'2026-10',systems:[{id:'orison-system',galaxyId:'the-ember-veil',name:'ORISON',galacticPosition:[.30,.60],star:{name:'ORISON A',type:'BLUE-WHITE GIANT',color:[142,193,255],radius:1.42},destinations:[
  {id:'thalassa',surfaceDisk:'thalassa',name:'THALASSA',kind:'planet',orbitalZone:'temperate',orbit:1.6,climate:'temperate',rings:false,orbitPhase:2.1,surfaceAtlas:'orison',surfaceBand:0,stages:[levelDefinitions[3].id]},
  {id:'veyra',surfaceDisk:'veyra',name:'VEYRA',kind:'planet',orbitalZone:'outer',orbit:4.5,climate:'gas',rings:true,ringTilt:.28,orbitPhase:-.55,surfaceAtlas:'orison',surfaceBand:1,stages:[levelDefinitions[4].id]},
  {id:'cinder',surfaceDisk:'cinder',name:'CINDER',kind:'planet',orbitalZone:'inner',orbit:.25,climate:'hot',rings:false,orbitPhase:3.65,surfaceAtlas:'orison',surfaceBand:2,stages:[levelDefinitions[5].id]},
  {id:'nivara',surfaceDisk:'nivara',name:'NIVARA',kind:'planet',orbitalZone:'outer',orbit:8.2,climate:'ice',rings:false,orbitPhase:1.0,surfaceLongitude:.34,stages:[nivara.id]}
 ]}]},
 ...expansionReleases,eventideRelease
]));
levelDefinitions[1].expeditionNote='Ferrum · abandoned planetary foundry';
function expeditionGalaxy(location){return GALAXIES[location.galaxyId||GALAXY.id];}
// The current schema describes one central star. A corona destination is an
// encounter at that same star, never another sun or an extra planet.
function systemFocus(system){return system.centralBody||system.star;}
function systemCensus(system){return {suns:(system.star?1:0)+system.destinations.filter(d=>d.kind==='star'&&d.stellarBody).length,planets:system.destinations.filter(d=>d.kind==='planet').length,encounters:system.destinations.reduce((n,d)=>n+d.stages.length,0)};}
function systemCensusLabel(system){const c=systemCensus(system);return `${system.centralBody?.kind==='black-hole'?'1 BLACK HOLE · ':''}${c.suns} SUN${c.suns===1?'':'S'} · ${c.planets} PLANET${c.planets===1?'':'S'}`;}
function systemStageProgress(location){const stages=expeditionSystem(location).destinations.flatMap(d=>d.stages);return {number:stages.findIndex(id=>expedition.locations[id]===location)+1,total:stages.length};}
const expeditionSystems=new Map(contentReleases.flatMap(r=>r.systems).map(s=>[s.id,s]));
function expeditionSystem(location){return expeditionSystems.get(location.systemId);}
// Each world owns a stable biosphere recipe, independent of its scenery archetype.
// New releases can override families, palettes and traits without engine branches.
const BIOSPHERE_FAMILIES=freezeContent({
 'ribbon-hunters':{habitat:'air',forms:['tendril','moth'],names:['Ribbon hunter','Glasswing'],span:1.08,chord:.55,arms:4,finPairs:2,eyePairs:2,gait:'pulse'},
 'sail-mantids':{habitat:'air',forms:['moth','scarab'],names:['Sail mantid','Shield cicada'],span:.76,chord:1.3,arms:4,finPairs:1,eyePairs:1,graspers:true,crest:3,gait:'dart'},
 'kestrel-fans':{habitat:'air',forms:['ray','herald'],names:['Fan kestrel','Forktail'],span:1.12,chord:.7,finPairs:1,eyePairs:1,forked:true,gait:'glide'},
 'cinder-petals':{habitat:'air',forms:['scarab','moth'],names:['Petal reaver','Ash lacewing'],span:.8,chord:.8,finPairs:3,eyePairs:2,crest:4,gait:'weave'},
 'lantern-feeders':{habitat:'water',forms:['tendril','scarab'],names:['Lantern feeder','Pressure beetle'],arms:8,finPairs:1,eyePairs:2,sails:true,gait:'pulse'},
 'glass-skates':{habitat:'water',forms:['ray','herald'],names:['Glass skate','Veil hunter'],span:1.1,chord:1.15,arms:4,finPairs:1,eyePairs:1,forked:true,gait:'glide'},
 'reef-smiths':{habitat:'water',forms:['crab','scarab'],names:['Reef smith','Serrated crawler'],finPairs:1,eyePairs:2,crest:4,sails:true,gait:'dart'},
 'abyss-combs':{habitat:'water',forms:['herald','tendril'],names:['Comb predator','Thread maw'],arms:4,span:.8,chord:.6,finPairs:2,eyePairs:3,forked:true,gait:'weave'}
});
// Authored evolution pools. Each system has a recognizable anatomy vocabulary;
// a stable world seed selects castes within it, independent of release order.
const EVOLUTION_POOLS=freezeContent({
 eventide:{air:['skyworm','urchin','wasp','trilobite','jelly'],water:['eel','urchin','crab','squid','jelly'],machines:['gyroscope','prism','trident'],armor:'fins'},
 vesper:{air:['wyvern','moth','wasp','skyworm','trilobite'],water:['manta','nautilus','crab','eel','squid'],machines:['dart','outrigger','citadel'],armor:'ribs'},
 orison:{air:['jelly','urchin','squid','crab','skyworm'],water:['jelly','squid','eel','nautilus','urchin'],machines:['halo','gyroscope','prism'],armor:'cage'},
 lyra:{air:['wasp','trilobite','moth','wyvern','skyworm'],water:['trilobite','crab','nautilus','manta','eel'],machines:['trident','prism','dart'],armor:'fins'},
 solenne:{air:['moth','skyworm','jelly','wasp','urchin'],water:['nautilus','jelly','manta','squid','eel'],machines:['crescent','halo','citadel'],armor:'cage'},
 nereid:{air:['skyworm','squid','urchin','jelly','wyvern'],water:['eel','squid','urchin','manta','jelly'],machines:['outrigger','prism','trident'],armor:'fins'},
 umbra:{air:['urchin','crab','trilobite','wasp','jelly'],water:['urchin','nautilus','crab','jelly','trilobite'],machines:['citadel','gyroscope','halo'],armor:'ribs'},
 auric:{air:['trilobite','wasp','crab','moth','skyworm'],water:['crab','trilobite','nautilus','eel','manta'],machines:['prism','citadel','trident'],armor:'fins'},
 halcyon:{air:['jelly','moth','skyworm','wyvern','squid'],water:['manta','jelly','squid','eel','nautilus'],machines:['crescent','gyroscope','outrigger'],armor:'cage'},
 pyrrha:{air:['crab','urchin','wasp','trilobite','skyworm'],water:['crab','urchin','trilobite','eel','squid'],machines:['trident','citadel','prism'],armor:'ribs'},
 elysian:{air:['wyvern','skyworm','moth','wasp','jelly'],water:['eel','manta','squid','nautilus','jelly'],machines:['dart','crescent','halo'],armor:'fins'},
 selen:{air:['moth','jelly','trilobite','skyworm','wasp'],water:['jelly','nautilus','manta','trilobite','eel'],machines:['halo','prism','outrigger'],armor:'cage'},
 rubra:{air:['skyworm','urchin','crab','squid','wasp'],water:['squid','eel','urchin','nautilus','crab'],machines:['gyroscope','citadel','trident'],armor:'ribs'},
 talos:{air:['trilobite','crab','wasp','wyvern','moth'],water:['trilobite','crab','eel','urchin','manta'],machines:['citadel','outrigger','prism'],armor:'ribs'},
 aether:{air:['jelly','moth','wyvern','skyworm','urchin'],water:['jelly','manta','nautilus','eel','squid'],machines:['halo','crescent','dart'],armor:'cage'},
 cervus:{air:['wasp','wyvern','trilobite','crab','moth'],water:['crab','eel','manta','trilobite','squid'],machines:['outrigger','dart','gyroscope'],armor:'fins'},
 argent:{air:['moth','trilobite','skyworm','wasp','wyvern'],water:['nautilus','manta','eel','crab','jelly'],machines:['prism','trident','crescent'],armor:'fins'},
 saffron:{air:['urchin','jelly','wasp','crab','skyworm'],water:['urchin','crab','nautilus','squid','eel'],machines:['gyroscope','halo','citadel'],armor:'cage'},
 virent:{air:['squid','skyworm','moth','jelly','wyvern'],water:['squid','eel','jelly','manta','nautilus'],machines:['crescent','outrigger','halo'],armor:'cage'},
 noctis:{air:['urchin','skyworm','squid','crab','jelly'],water:['urchin','eel','nautilus','squid','jelly'],machines:['gyroscope','prism','citadel'],armor:'ribs'},
 meridian:{air:['wyvern','wasp','moth','skyworm','trilobite'],water:['manta','trilobite','crab','eel','nautilus'],machines:['trident','crescent','dart'],armor:'fins'}
});
function planetEvolution(world,system,medium){
 const key=system.id.replace(/-system$/,''),pool=world.biosphere?.evolution||system.evolution||EVOLUTION_POOLS[key];
 if(!pool)throw Error('Supply an evolution pool for '+system.id);
 const seed=speciesHash(system.id+'/'+world.id),list=pool[medium];
 if(!list||list.length<5||new Set(list).size!==list.length)throw Error('Evolution needs five distinct castes: '+world.id);
 const offset=seed%list.length,anatomy=Array.from({length:5},(_,i)=>list[(offset+i)%list.length]);
 for(const id of anatomy)if(!SPECIES_BLUEPRINTS[id]?.habitats.includes(medium))throw Error('Invalid habitat for '+id);
 return{pool,anatomy,seed};
}
// Every destination owns a geography/ecology brief. Legacy paintings remain
// explicit placeholders until that brief has reviewed, planet-owned artwork.
const WORLD_BIOMES={
 hot:['basalt-needles','caldera-fields','molten-cataracts','obsidian-arches','furnace-vaults','sulfur-mesas'],
 ice:['glacial-rifts','frozen-canopies','ice-cathedral','snow-dunes','crystal-trenches','broken-shelves'],
 water:['chimney-forest','coral-labyrinth','abyssal-spires','kelp-vaults','reef-terraces','vent-canyons'],
 temperate:['floating-mesas','needle-canopy','eroded-arches','terraced-cliffs','fungal-basin','ancient-machinery'],
 gas:['storm-towers','cloud-ribbons','crystal-fronts','floating-vaults','vapor-columns','ion-reefs']
};
function developWorldIdentity(world,system,stage){
 const seed=speciesHash('geography-v1/'+system.id+'/'+world.id),unit=n=>((seed>>>n)&255)/255;
 const habitat=stage.medium==='water'?'water':world.climate==='hot'?'hot':world.climate==='ice'?'ice':world.climate==='gas'?'gas':'temperate',choices=WORLD_BIOMES[habitat];
 const biome=world.kind==='star'?'stellar-corona':choices[seed%choices.length],accent=habitat==='hot'?[224,123+Math.round(unit(5)*58),65]:habitat==='ice'?[112+Math.round(unit(7)*50),179,211]:habitat==='water'?[79,142+Math.round(unit(8)*70),147+Math.round(unit(2)*60)]:habitat==='gas'?[139+Math.round(unit(2)*65),126,182]:[92+Math.round(unit(2)*80),146+Math.round(unit(9)*45),120];
 return{version:1,id:world.id,seed,habitat,biome,accent,profile:seed%5,relief:.55+unit(12)*.6,density:8+seed%9,ceiling:stage.environment.includes('under')||biome.includes('vault')||biome.includes('cathedral'),lightSide:seed%2?1:-1,landmark:seed%7,landmarkX:.27+unit(3)*.46,tectonics:3+seed%8,featureScale:.72+unit(15)*.65};
}

function installPlanetBiosphere(stage,world,system){
 const worldIndex=system.destinations.indexOf(world),{systemDesign,environmentId,environment}=worldTemplate(system,worldIndex);
 if(systemDesign.route.length!==system.destinations.length)throw Error('World count disagrees with system template: '+system.id);
 if(!environment.climates.includes(world.climate))throw Error('World climate disagrees with system template: '+world.id);
 const physical=ENVIRONMENTS[environment.environment];
 Object.assign(stage,{environment:environment.environment,medium:physical.medium,atmosphere:{heat:world.climate==='ice'?0:physical.heat,clouds:stage.gravityWell?0:physical.clouds,water:physical.water},stratum:physical.label});
 stage.worldIdentity=developWorldIdentity(world,system,stage);
 stage.worldIdentity.surfaceFamily=world.surfaceFamily;
 stage.worldIdentity.environmentId=environmentId;
 stage.worldIdentity.biome=environmentId;
 stage.worldIdentity.templateVersion=systemDesign.version;
 stage.worldIdentity.design={id:world.id+'-design-v1',systemTemplate:systemDesign.id,geology:systemDesign.materials,landform:environment.landform,adaptation:environment.adaptation,organicArchitecture:systemDesign.organics[worldIndex],machineArchitecture:systemDesign.machines[worldIndex],landscapeAsset:'worlds/'+world.id+'/landscape.webp',orbitalAsset:PLANET_SURFACE_DISKS[world.surfaceDisk]||null,surfaceFamily:world.surfaceFamily||null,artStatus:(!stage.contentSeed||stage.gravityWell)?'existing-authored':'needs-unique-art',encounterStatus:'shared-controller'};
 applySystemChallenge(stage,worldIndex,system.destinations.length,systemDesign.expeditionIndex);
 const {pool,anatomy,seed}=planetEvolution(world,system,stage.medium),water=stage.medium==='water';
 const palettes=water?[[[38,125,151],[211,155,83]],[[153,64,96],[106,185,170]],[[75,111,178],[219,167,111]],[[51,141,110],[186,150,203]]]:[[[62,149,102],[221,172,76]],[[159,66,75],[114,178,180]],[[98,92,169],[217,159,87]],[[171,113,51],[99,184,147]]];
 const climatePalettes={hot:[[[136,74,44],[226,159,92]],[[116,58,49],[207,155,105]],[[114,108,76],[232,171,93]]],plasma:[[[126,64,42],[248,188,104]],[[126,98,71],[157,211,226]]],ice:[[[108,155,172],[205,191,156]],[[123,136,174],[168,215,200]],[[148,170,159],[210,153,131]]]};
 const adaptedPalettes=climatePalettes[world.climate]||palettes;
 const palette=world.biosphere?.palette||adaptedPalettes[(seed>>>5)%adaptedPalettes.length],ids=[],mechanicalSwarm=(seed>>>8)%3===0,machines=pool.machines,mi=(seed>>>12)%machines.length;
 for(let role=0;role<6;role++){
  const organic=role===1||role===3||role>=4&&!mechanicalSwarm,cast=role===1?0:role===3?1:role===4?2:3,body=anatomy[cast],blueprint=SPECIES_BLUEPRINTS[body],hash=speciesHash(world.id+':'+role),unit=n=>((hash>>>n)&255)/255,id=world.id+'-species-'+role,machinePlan=machines[(mi+(role===2?1:role>=4?2:0))%machines.length];
  const spec={...blueprint,id,name:world.name+' '+(organic?(role===4?'Crown ':'')+blueprint.name:machinePlan+' '+(role===4?'overseer':role===5?'satellite':role===2?'gunship':'interceptor')),planet:world.id,system:system.id,lineage:system.id,organic,anatomy:organic?body:null,bodyPlan:body,machinePlan,armor:pool.armor,sensory:['antlers','barbels','compound'][(seed>>>9)%3],integument:['quills','pores','ridges'][(seed>>>13)%3],variant:hash%4,form:body,habitat:stage.medium,color:palette[0].map((v,i)=>Math.min(235,Math.round(v*(.9+unit(i*4)*.2)))),accent:palette[1],length:.88+unit(3)*.18,girth:.87+unit(9)*.23,span:1,small:role===5?.85:1,heavy:role===2,frequency:3.3+unit(6)*2.2,amplitude:blueprint.gait==='glide'?24:36,cadence:.93+unit(13)*.18,shot:water?'water':stage.atmosphere?.heat>.4?'fire':'wind'};
  spec.genome=developSpeciesGenome(world.id,system.id,stage.medium,role,false,world.climate,stage.worldIdentity.design);
  spec.gait=spec.genome.locomotion==='fins'?'glide':spec.genome.locomotion==='siphon'?'jet':spec.genome.locomotion==='jets'?'hover':spec.genome.finPairs>1?'flutter':'swoop';
  spec.name=world.name+' '+(organic?({sailwing:'sailscourge',razorcrab:'razorclaw',hammerfin:'broadmaw',sailback:'ridgestalker',beetle:'scuteling',skimmer:'dartsail',drake:'thornmaw',mantis:'sicklewing',moth:'veilwing',manta:'driftveil',leviathan:'riftjaw',bell:'bellmantle',squid:'siphon',nautilus:'vaultshell',crab:'clawguard',trilobite:'ridgeback'}[organicAnatomyProgram(spec.genome)])+' '+(role===4?'carrier':role===5?'juvenile':role===3?'hunter':'forager'):spec.genome.machineFrame+' '+(role===4?'overseer':role===5?'satellite':role===2?'gunship':'interceptor'));
  // Explicit pilot assignments: approved models are never scattered across every world.
  if(world.id==='caelus'){spec.authoredAsset=['vector-bastion','shellmaw','vector-bastion','thorn-skate','vesper-brood','needleling'][role];spec.name='CAELUS '+['Vector scout','Shellmaw','Vector guard','Thorn skate','Brood carrier','Needleling'][role];}
  registerPlanetSpecies(freezeContent(spec));ids.push(id);
 }
 const bossSeed=speciesHash(world.id+':boss'),bossAnatomy=anatomy[4];
 stage.models=ids.slice(0,4);stage.biosphere={id:world.id+'-biosphere',family:system.id,bodyPlan:anatomy[0],machinePlan:machines[mi],names:ids.filter((_,i)=>i===1||i===3).map(id=>planetSpecies.get(id).name),species:ids,boss:{id:world.id+'-sovereign',anatomy:bossAnatomy,caste:'boss',sensory:['antlers','barbels','compound'][(bossSeed>>>9)%3],integument:['quills','pores','ridges'][(bossSeed>>>13)%3],organic:![1,4].includes(BOSS_KINDS[stage.bossKind]),habitat:stage.medium,color:palette[0],accent:palette[1],variant:bossSeed%4,length:1.05,girth:1.1,small:1,span:1,machinePlan:machines[(mi+2)%machines.length],armor:pool.armor,heavy:true}};
 stage.biosphere.boss.genome=developSpeciesGenome(world.id,system.id,stage.medium,6,true,world.climate,stage.worldIdentity.design);
 if(world.id==='caelus'){stage.biosphere.boss.authoredAsset='vesper-reaver';stage.boss='THE VESPER REAVER';}
 if(world.id==='nacre'){stage.biosphere.boss.authoredAsset='rift-lantern';stage.encounterDirector='tide-knots';stage.boss='THE RIFT LANTERN';}
 const prior=stage.escortEncounter||{};stage.escortEncounter={...prior,name:planetSpecies.get(ids[4]).name.toUpperCase(),model:ids[4],escort:ids[5],organic:!mechanicalSwarm,rig:'appendages',count:prior.count||4,orbit:prior.orbit||2.6,formation:['screen','figure8','petals'][seed%3],pace:prior.pace||1};stage.revision+=3;
}
for(const release of contentReleases)for(const system of release.systems)for(const world of system.destinations)for(const stageId of world.stages){const stage=levelDefinitions.find(l=>l.id===stageId);installPlanetBiosphere(stage,world,system);}
const expedition=buildExpedition(contentReleases,levelDefinitions);
freezeContent(expedition.locations);
const campaign=freezeContent(validateLevels(expedition.stages));
const CAMPAIGN_VERSION=contentReleases.map(r=>r.id+'@'+r.version).join('|')+'|'+campaign.map(l=>l.id+'@'+l.revision).join('|');

const encounterRules=Object.freeze({
 warden:{hint:'Dodge its crossing charge · attack the exposed flank'},
 cathedral:{hint:'Break both shield generators · strike during the reboot'},
 sovereign:{hint:'Ride the current · dodge the rush, then counterattack'},
 monarch:{hint:'Keep clear of acid · the feeding mouth is vulnerable'},
 regent:{hint:'Leave lightning lanes · attack after the cannon overheats'},
 mother:{hint:'Destroy the brood guards to expose the queen'}
});
