'use strict';
// Content only: append a definition to extend the campaign; identifiers stay stable.
const LEVEL_THEMES={verdant:0,forge:1,abyss:2,reef:3,storm:4,core:5};
const BOSS_KINDS={warden:0,cathedral:1,sovereign:2,monarch:3,regent:4,mother:5};
const GAME_RULESET='2026-09-alien-flight-v16';
const CAMPAIGN_ID='vanguard-main';
function validateLevels(definitions){
 const ids=new Set(),loot=new Set(['orb','speed','power','helix','wave','beam','missile','spread','companion','shield','frontShield','repair','nova']);
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
  if(!Array.isArray(l.models)||l.models.length!==4||l.models.some(name=>!meshes[name]))fail(l,'unknown enemy model');
  if(!Array.isArray(l.broodWaves)||l.broodWaves.some(i=>!Number.isInteger(i)||i<0||i>=l.waves.length))fail(l,'invalid brood wave index');
  if(!Array.isArray(l.supplies)||!Array.isArray(l.recovery)||l.recovery.length!==2)fail(l,'supply and recovery definitions required');
  for(const d of [...l.supplies,...l.recovery])if(!loot.has(d.type)||!finite(d.y)||d.y<42||d.y>718)fail(l,'invalid pickup');
  if(!ordered(l.supplies.map(d=>d.at))||l.supplies.some(d=>d.at>=l.duration))fail(l,'invalid supply times');
  if(l.recovery.some(d=>!finite(d.x)||d.x<270||d.x>900))fail(l,'recovery pickup out of reach');
  if(l.scrollAxis&&!['up','down'].includes(l.scrollAxis))fail(l,'invalid scroll axis');
  if(l.entrySides&&(!Array.isArray(l.entrySides)||!l.entrySides.length||l.entrySides.some(side=>!['right','left','top','bottom'].includes(side))))fail(l,'invalid entry side');
  if(l.challenge){const c=l.challenge;if(typeof c.title!=='string'||!finite(c.at)||!finite(c.end)||c.at<0||c.end<=c.at||c.end>=l.duration||!Array.isArray(c.waves)||!ordered(c.waves)||c.waves.some(t=>t<c.at||t>c.end)||!Array.isArray(c.types)||!c.types.length||c.types.some(t=>!Number.isInteger(t)||t<0||t>3)||!Number.isInteger(c.count)||c.count<1||c.count>6||!finite(c.speed)||c.speed<.5||c.speed>2)fail(l,'invalid mid-sector challenge');}
  if(!Array.isArray(l.obstacles)||!ordered(l.obstacles.map(o=>o.at)))fail(l,'invalid obstacle timing');
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
    "boss": "THE FIRST MOTHER",
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
const campaign=freezeContent(validateLevels(levelDefinitions));
const CAMPAIGN_VERSION=campaign.map(l=>l.id+'@'+l.revision).join('|');

const encounterRules=Object.freeze({
 warden:{hint:'Dodge its crossing charge · attack the exposed flank'},
 cathedral:{hint:'Break both shield generators · strike during the reboot'},
 sovereign:{hint:'Ride the current · dodge the rush, then counterattack'},
 monarch:{hint:'Keep clear of acid · the feeding mouth is vulnerable'},
 regent:{hint:'Leave lightning lanes · attack after the cannon overheats'},
 mother:{hint:'Destroy the brood guards to expose the queen'}
});
