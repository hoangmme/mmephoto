import { UICoreMixin } from './pl-ui-core.js?v=218';
import { UIStepsMixin } from './pl-ui-steps.js?v=218';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=218';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=218';
import { UIMediaMixin } from './pl-ui-media.js?v=218';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
