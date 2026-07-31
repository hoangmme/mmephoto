import { UICoreMixin } from './pl-ui-core.js?v=221';
import { UIStepsMixin } from './pl-ui-steps.js?v=221';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=221';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=221';
import { UIMediaMixin } from './pl-ui-media.js?v=221';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
