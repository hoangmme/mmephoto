import { UICoreMixin } from './pl-ui-core.js?v=289';
import { UIStepsMixin } from './pl-ui-steps.js?v=289';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=289';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=289';
import { UIMediaMixin } from './pl-ui-media.js?v=289';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
