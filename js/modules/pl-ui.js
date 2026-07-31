import { UICoreMixin } from './pl-ui-core.js?v=222';
import { UIStepsMixin } from './pl-ui-steps.js?v=222';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=222';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=222';
import { UIMediaMixin } from './pl-ui-media.js?v=222';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
