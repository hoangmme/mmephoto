import { UICoreMixin } from './pl-ui-core.js?v=230';
import { UIStepsMixin } from './pl-ui-steps.js?v=230';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=230';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=230';
import { UIMediaMixin } from './pl-ui-media.js?v=230';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
