import { UICoreMixin } from './pl-ui-core.js?v=285';
import { UIStepsMixin } from './pl-ui-steps.js?v=285';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=285';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=285';
import { UIMediaMixin } from './pl-ui-media.js?v=285';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
