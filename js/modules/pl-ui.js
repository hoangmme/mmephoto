import { UICoreMixin } from './pl-ui-core.js?v=264';
import { UIStepsMixin } from './pl-ui-steps.js?v=264';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=264';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=264';
import { UIMediaMixin } from './pl-ui-media.js?v=264';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
