import classic38 from './classic38.js';
import flash800 from './flash800.js';
import lomo32 from './lomo32.js';
import dream120 from './dream120.js';
import instant160 from './instant160.js';

// Parameter records, not LUTs. All operations live in filmEngine/.
function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
export const CAMERA_PROFILES = freeze([classic38, flash800, lomo32, dream120, instant160]);
export const CAMERA_BY_ID = new Map(CAMERA_PROFILES.map(profile => [profile.id, profile]));
export const getCameraProfile = id => CAMERA_BY_ID.get(id) || classic38;
