import { UICoreMixin } from './pl-ui-core.js?v=286';
import { UIStepsMixin } from './pl-ui-steps.js?v=286';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=286';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=286';
import { UIMediaMixin } from './pl-ui-media.js?v=286';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
