import { UICoreMixin } from './pl-ui-core.js?v=278';
import { UIStepsMixin } from './pl-ui-steps.js?v=278';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=278';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=278';
import { UIMediaMixin } from './pl-ui-media.js?v=278';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
