import { UICoreMixin } from './pl-ui-core.js?v=236';
import { UIStepsMixin } from './pl-ui-steps.js?v=236';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=236';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=236';
import { UIMediaMixin } from './pl-ui-media.js?v=236';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
