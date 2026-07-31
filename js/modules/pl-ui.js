import { UICoreMixin } from './pl-ui-core.js?v=240';
import { UIStepsMixin } from './pl-ui-steps.js?v=240';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=240';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=240';
import { UIMediaMixin } from './pl-ui-media.js?v=240';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
