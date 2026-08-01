import { UICoreMixin } from './pl-ui-core.js?v=255';
import { UIStepsMixin } from './pl-ui-steps.js?v=255';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=255';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=255';
import { UIMediaMixin } from './pl-ui-media.js?v=255';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
