import { UICoreMixin } from './pl-ui-core.js?v=242';
import { UIStepsMixin } from './pl-ui-steps.js?v=242';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=242';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=242';
import { UIMediaMixin } from './pl-ui-media.js?v=242';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
