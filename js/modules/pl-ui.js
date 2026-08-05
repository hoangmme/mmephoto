import { UICoreMixin } from './pl-ui-core.js?v=262';
import { UIStepsMixin } from './pl-ui-steps.js?v=262';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=262';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=262';
import { UIMediaMixin } from './pl-ui-media.js?v=262';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
