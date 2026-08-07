import { UICoreMixin } from './pl-ui-core.js?v=279';
import { UIStepsMixin } from './pl-ui-steps.js?v=279';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=279';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=279';
import { UIMediaMixin } from './pl-ui-media.js?v=279';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
