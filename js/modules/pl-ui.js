import { UICoreMixin } from './pl-ui-core.js?v=302';
import { UIStepsMixin } from './pl-ui-steps.js?v=302';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=302';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=302';
import { UIMediaMixin } from './pl-ui-media.js?v=302';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
