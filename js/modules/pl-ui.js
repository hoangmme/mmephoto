import { UICoreMixin } from './pl-ui-core.js?v=291';
import { UIStepsMixin } from './pl-ui-steps.js?v=291';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=291';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=291';
import { UIMediaMixin } from './pl-ui-media.js?v=291';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
