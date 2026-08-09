import { UICoreMixin } from './pl-ui-core.js?v=299';
import { UIStepsMixin } from './pl-ui-steps.js?v=299';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=299';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=299';
import { UIMediaMixin } from './pl-ui-media.js?v=299';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
