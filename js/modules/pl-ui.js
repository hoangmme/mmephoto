import { UICoreMixin } from './pl-ui-core.js?v=256';
import { UIStepsMixin } from './pl-ui-steps.js?v=256';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=256';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=256';
import { UIMediaMixin } from './pl-ui-media.js?v=256';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
