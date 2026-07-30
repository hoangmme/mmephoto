import { UICoreMixin } from './pl-ui-core.js?v=215';
import { UIStepsMixin } from './pl-ui-steps.js?v=215';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=215';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=215';
import { UIMediaMixin } from './pl-ui-media.js?v=215';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
