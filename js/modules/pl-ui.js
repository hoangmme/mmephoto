import { UICoreMixin } from './pl-ui-core.js?v=277';
import { UIStepsMixin } from './pl-ui-steps.js?v=277';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=277';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=277';
import { UIMediaMixin } from './pl-ui-media.js?v=277';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
