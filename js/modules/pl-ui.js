import { UICoreMixin } from './pl-ui-core.js?v=261';
import { UIStepsMixin } from './pl-ui-steps.js?v=261';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=261';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=261';
import { UIMediaMixin } from './pl-ui-media.js?v=261';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
