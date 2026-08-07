import { UICoreMixin } from './pl-ui-core.js?v=290';
import { UIStepsMixin } from './pl-ui-steps.js?v=290';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=290';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=290';
import { UIMediaMixin } from './pl-ui-media.js?v=290';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
