import { ContentRegistry } from '../engine/types';
import { MARKET_GOODS, REALMS, RELICS, TAGS, TRUTH_CLUES } from './world';
import { DAO_HEARTS, OPENING_EVENTS, ORIGINS } from './opening';
import { COMPANIONS } from './companions';
import { ACT1_SCENES } from './act1';
import { ACT2_SCENES } from './act2';
import { ACT3_RANDOM_EVENTS, ACT3_SCENES } from './act3';
import { ACT4_RANDOM_EVENTS, ACT4_SCENES } from './act4';
import { ACT5_RANDOM_EVENTS, ACT56_SCENES } from './act5_6';
import { AGENCY_SCENES } from './agency';
import { RANDOM_EVENT_SCENES, RANDOM_EVENTS } from './randomEvents';
import { ENDING_SCENES, ENDINGS } from './endings';

export const CONTENT_REGISTRY: ContentRegistry = {
  realms: REALMS,
  tags: TAGS,
  relics: RELICS,
  marketGoods: MARKET_GOODS,
  truthClues: TRUTH_CLUES,
  companions: COMPANIONS,
  origins: ORIGINS,
  openingEvents: OPENING_EVENTS,
  daoHearts: DAO_HEARTS,
  scenes: {
    ...ACT1_SCENES,
    ...ACT2_SCENES,
    ...ACT3_SCENES,
    ...ACT4_SCENES,
    ...ACT56_SCENES,
    ...AGENCY_SCENES,
    ...RANDOM_EVENT_SCENES,
    ...ENDING_SCENES,
  },
  randomEvents: [
    ...RANDOM_EVENTS,
    ...ACT3_RANDOM_EVENTS,
    ...ACT4_RANDOM_EVENTS,
    ...ACT5_RANDOM_EVENTS,
  ],
  endings: ENDINGS,
};
