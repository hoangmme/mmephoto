import { UICoreMixin } from './pl-ui-core.js?v=283';
import { UIStepsMixin } from './pl-ui-steps.js?v=283';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=283';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=283';
import { UIMediaMixin } from './pl-ui-media.js?v=283';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
