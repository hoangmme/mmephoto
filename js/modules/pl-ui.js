import { UICoreMixin } from './pl-ui-core.js?v=257';
import { UIStepsMixin } from './pl-ui-steps.js?v=257';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=257';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=257';
import { UIMediaMixin } from './pl-ui-media.js?v=257';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
