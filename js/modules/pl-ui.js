import { UICoreMixin } from './pl-ui-core.js?v=260';
import { UIStepsMixin } from './pl-ui-steps.js?v=260';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=260';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=260';
import { UIMediaMixin } from './pl-ui-media.js?v=260';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
