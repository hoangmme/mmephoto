import { UICoreMixin } from './pl-ui-core.js?v=228';
import { UIStepsMixin } from './pl-ui-steps.js?v=228';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=228';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=228';
import { UIMediaMixin } from './pl-ui-media.js?v=228';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
