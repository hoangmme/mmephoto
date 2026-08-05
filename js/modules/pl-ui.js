import { UICoreMixin } from './pl-ui-core.js?v=269';
import { UIStepsMixin } from './pl-ui-steps.js?v=269';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=269';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=269';
import { UIMediaMixin } from './pl-ui-media.js?v=269';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
