import { UICoreMixin } from './pl-ui-core.js?v=267';
import { UIStepsMixin } from './pl-ui-steps.js?v=267';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=267';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=267';
import { UIMediaMixin } from './pl-ui-media.js?v=267';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
