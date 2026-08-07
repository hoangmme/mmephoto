import { UICoreMixin } from './pl-ui-core.js?v=297';
import { UIStepsMixin } from './pl-ui-steps.js?v=297';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=297';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=297';
import { UIMediaMixin } from './pl-ui-media.js?v=297';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
