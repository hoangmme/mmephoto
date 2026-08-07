import { UICoreMixin } from './pl-ui-core.js?v=274';
import { UIStepsMixin } from './pl-ui-steps.js?v=274';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=274';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=274';
import { UIMediaMixin } from './pl-ui-media.js?v=274';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
