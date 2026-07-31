import { UICoreMixin } from './pl-ui-core.js?v=246';
import { UIStepsMixin } from './pl-ui-steps.js?v=246';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=246';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=246';
import { UIMediaMixin } from './pl-ui-media.js?v=246';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
