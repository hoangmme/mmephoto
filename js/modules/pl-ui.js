import { UICoreMixin } from './pl-ui-core.js?v=250';
import { UIStepsMixin } from './pl-ui-steps.js?v=250';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=250';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=250';
import { UIMediaMixin } from './pl-ui-media.js?v=250';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
