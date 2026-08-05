import { UICoreMixin } from './pl-ui-core.js?v=270';
import { UIStepsMixin } from './pl-ui-steps.js?v=270';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=270';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=270';
import { UIMediaMixin } from './pl-ui-media.js?v=270';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
