import { UICoreMixin } from './pl-ui-core.js?v=308';
import { UIStepsMixin } from './pl-ui-steps.js?v=308';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=308';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=308';
import { UIMediaMixin } from './pl-ui-media.js?v=308';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
