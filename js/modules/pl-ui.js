import { UICoreMixin } from './pl-ui-core.js?v=284';
import { UIStepsMixin } from './pl-ui-steps.js?v=284';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=284';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=284';
import { UIMediaMixin } from './pl-ui-media.js?v=284';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
