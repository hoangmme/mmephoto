import { UICoreMixin } from './pl-ui-core.js?v=244';
import { UIStepsMixin } from './pl-ui-steps.js?v=244';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=244';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=244';
import { UIMediaMixin } from './pl-ui-media.js?v=244';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
