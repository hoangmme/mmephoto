import { UICoreMixin } from './pl-ui-core.js?v=271';
import { UIStepsMixin } from './pl-ui-steps.js?v=271';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=271';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=271';
import { UIMediaMixin } from './pl-ui-media.js?v=271';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
