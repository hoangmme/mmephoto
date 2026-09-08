import { UICoreMixin } from './pl-ui-core.js?v=306';
import { UIStepsMixin } from './pl-ui-steps.js?v=306';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=306';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=306';
import { UIMediaMixin } from './pl-ui-media.js?v=306';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
