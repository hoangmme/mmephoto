import { UICoreMixin } from './pl-ui-core.js?v=252';
import { UIStepsMixin } from './pl-ui-steps.js?v=252';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=252';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=252';
import { UIMediaMixin } from './pl-ui-media.js?v=252';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
